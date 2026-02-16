-- Ensure passkey-related tables exist and are protected by strict RLS.

CREATE TABLE IF NOT EXISTS public.passkey_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_type TEXT,
  backed_up BOOLEAN,
  friendly_name TEXT NOT NULL DEFAULT 'Passkey',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.passkey_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id
  ON public.passkey_credentials (user_id);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id
  ON public.passkey_credentials (credential_id);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user_type_created_at
  ON public.passkey_challenges (user_id, type, created_at DESC);

ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS passkey_credentials_service_role_full_access ON public.passkey_credentials;
DROP POLICY IF EXISTS passkey_credentials_no_client_access ON public.passkey_credentials;
DROP POLICY IF EXISTS passkey_challenges_service_role_full_access ON public.passkey_challenges;
DROP POLICY IF EXISTS passkey_challenges_no_client_access ON public.passkey_challenges;

CREATE POLICY passkey_credentials_service_role_full_access
  ON public.passkey_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY passkey_credentials_no_client_access
  ON public.passkey_credentials
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY passkey_challenges_service_role_full_access
  ON public.passkey_challenges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY passkey_challenges_no_client_access
  ON public.passkey_challenges
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
