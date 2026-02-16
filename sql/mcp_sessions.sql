-- MCP session schema for Payments Maps.
-- Apply this in Supabase SQL Editor when MCP sessions are not yet configured.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.mcp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL DEFAULT 'Claude Desktop',
  client_type TEXT NOT NULL DEFAULT 'claude-desktop',
  session_token TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT jsonb_build_object(
    'search', true,
    'add_pos', false,
    'update_pos', false,
    'delete_pos', false,
    'view_details', true
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_sessions_user_id ON public.mcp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_last_active ON public.mcp_sessions(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_is_active ON public.mcp_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_token ON public.mcp_sessions(session_token);

CREATE OR REPLACE FUNCTION public.update_mcp_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_mcp_sessions_updated_at ON public.mcp_sessions;
CREATE TRIGGER trigger_update_mcp_sessions_updated_at
BEFORE UPDATE ON public.mcp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_mcp_sessions_updated_at();

CREATE OR REPLACE FUNCTION public.generate_mcp_session(
  p_user_id UUID,
  p_session_name TEXT DEFAULT 'Claude Desktop'
)
RETURNS TABLE(session_token TEXT, session_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_session_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- When called by authenticated clients, only allow creating sessions for self.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  v_token := replace(gen_random_uuid()::TEXT, '-', '') || replace(gen_random_uuid()::TEXT, '-', '');

  INSERT INTO public.mcp_sessions (
    user_id,
    session_name,
    client_type,
    session_token
  ) VALUES (
    p_user_id,
    COALESCE(NULLIF(trim(p_session_name), ''), 'Claude Desktop'),
    'claude-desktop',
    v_token
  )
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_token, v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_mcp_session(p_token TEXT)
RETURNS TABLE(is_valid BOOLEAN, user_id UUID, session_id UUID, permissions JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mcp_sessions%ROWTYPE;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  SELECT *
  INTO v_row
  FROM public.mcp_sessions
  WHERE session_token = p_token
  LIMIT 1;

  IF NOT FOUND OR NOT v_row.is_active THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  UPDATE public.mcp_sessions
  SET last_active = NOW()
  WHERE id = v_row.id;

  RETURN QUERY SELECT true, v_row.user_id, v_row.id, v_row.permissions;
END;
$$;

ALTER TABLE public.mcp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own MCP sessions" ON public.mcp_sessions;
CREATE POLICY "Users can view own MCP sessions"
ON public.mcp_sessions
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own MCP sessions" ON public.mcp_sessions;
CREATE POLICY "Users can insert own MCP sessions"
ON public.mcp_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own MCP sessions" ON public.mcp_sessions;
CREATE POLICY "Users can update own MCP sessions"
ON public.mcp_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own MCP sessions" ON public.mcp_sessions;
CREATE POLICY "Users can delete own MCP sessions"
ON public.mcp_sessions
FOR DELETE
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_mcp_session(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_mcp_session(TEXT) TO authenticated, service_role;
