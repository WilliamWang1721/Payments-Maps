-- 016_add_user_default_location_settings.sql
-- 为用户设置补齐默认地点字段，并支持管理员为指定用户配置默认地点

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  default_search_radius INTEGER DEFAULT 2000,
  enable_notifications BOOLEAN DEFAULT TRUE,
  enable_location_tracking BOOLEAN DEFAULT TRUE,
  preferred_language TEXT DEFAULT 'zh-CN',
  theme TEXT DEFAULT 'light',
  auto_refresh_interval INTEGER DEFAULT 30,
  show_pos_status BOOLEAN DEFAULT TRUE,
  default_location_key TEXT,
  default_location_address TEXT,
  default_location_longitude NUMERIC(11, 8),
  default_location_latitude NUMERIC(10, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_search_radius INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_location_tracking BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'zh-CN',
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS auto_refresh_interval INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS show_pos_status BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS default_location_key TEXT,
  ADD COLUMN IF NOT EXISTS default_location_address TEXT,
  ADD COLUMN IF NOT EXISTS default_location_longitude NUMERIC(11, 8),
  ADD COLUMN IF NOT EXISTS default_location_latitude NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete_policy" ON public.user_settings;

CREATE POLICY "user_settings_select_policy" ON public.user_settings
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

CREATE POLICY "user_settings_insert_policy" ON public.user_settings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

CREATE POLICY "user_settings_update_policy" ON public.user_settings
  FOR UPDATE USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

CREATE POLICY "user_settings_delete_policy" ON public.user_settings
  FOR DELETE USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.admin_set_user_default_location(
  target_user_id UUID,
  p_address TEXT,
  p_longitude NUMERIC,
  p_latitude NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin can update user default location';
  END IF;

  IF p_address IS NULL OR p_longitude IS NULL OR p_latitude IS NULL THEN
    INSERT INTO public.user_settings (
      user_id,
      default_location_key,
      default_location_address,
      default_location_longitude,
      default_location_latitude,
      updated_at
    )
    VALUES (
      target_user_id,
      NULL,
      NULL,
      NULL,
      NULL,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      default_location_key = NULL,
      default_location_address = NULL,
      default_location_longitude = NULL,
      default_location_latitude = NULL,
      updated_at = NOW();

    RETURN TRUE;
  END IF;

  INSERT INTO public.user_settings (
    user_id,
    default_location_key,
    default_location_address,
    default_location_longitude,
    default_location_latitude,
    updated_at
  )
  VALUES (
    target_user_id,
    'custom',
    p_address,
    p_longitude,
    p_latitude,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    default_location_key = 'custom',
    default_location_address = EXCLUDED.default_location_address,
    default_location_longitude = EXCLUDED.default_location_longitude,
    default_location_latitude = EXCLUDED.default_location_latitude,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_default_location(UUID, TEXT, NUMERIC, NUMERIC) TO authenticated;
