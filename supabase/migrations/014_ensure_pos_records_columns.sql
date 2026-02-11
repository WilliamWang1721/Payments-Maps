-- 014_ensure_pos_records_columns.sql
-- Ensure pos_attempts in older environments has all fields required by the current client payload.

CREATE TABLE IF NOT EXISTS public.pos_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID REFERENCES public.pos_machines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attempt_number INTEGER,
  result TEXT NOT NULL DEFAULT 'unknown',
  card_network TEXT,
  payment_method TEXT,
  cvm TEXT,
  acquiring_mode TEXT,
  device_status TEXT,
  acquiring_institution TEXT,
  checkout_location TEXT,
  card_name TEXT,
  notes TEXT,
  attempted_at TIMESTAMPTZ,
  is_conclusive_failure BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS card_network TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS cvm TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS acquiring_mode TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS device_status TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS acquiring_institution TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS checkout_location TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS card_name TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMPTZ;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS is_conclusive_failure BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS attempt_number INTEGER;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS pos_id UUID;
ALTER TABLE public.pos_attempts ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.pos_attempts ALTER COLUMN result SET DEFAULT 'unknown';
ALTER TABLE public.pos_attempts ALTER COLUMN is_conclusive_failure SET DEFAULT FALSE;
ALTER TABLE public.pos_attempts ALTER COLUMN created_at SET DEFAULT NOW();

-- Keep compatibility with existing data; do not add strict CHECK constraints in this patch migration.
-- Backfill cleanup: old environments can contain dangling references that would block FK creation.

DO $$
DECLARE
  orphan_pos_count INTEGER := 0;
  orphan_user_count INTEGER := 0;
  pos_id_nullable BOOLEAN := TRUE;
  user_id_nullable BOOLEAN := TRUE;
BEGIN
  CREATE TABLE IF NOT EXISTS public.pos_attempts_orphan_audit (
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT NOT NULL,
    payload JSONB NOT NULL
  );

  SELECT (is_nullable = 'YES')
  INTO pos_id_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pos_attempts'
    AND column_name = 'pos_id';

  SELECT (is_nullable = 'YES')
  INTO user_id_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pos_attempts'
    AND column_name = 'user_id';

  IF COALESCE(pos_id_nullable, TRUE) THEN
    UPDATE public.pos_attempts pa
    SET pos_id = NULL
    WHERE pa.pos_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.pos_machines pm
        WHERE pm.id = pa.pos_id
      );
    GET DIAGNOSTICS orphan_pos_count = ROW_COUNT;
  ELSE
    INSERT INTO public.pos_attempts_orphan_audit (reason, payload)
    SELECT 'missing_pos_id', to_jsonb(pa)
    FROM public.pos_attempts pa
    WHERE pa.pos_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.pos_machines pm
        WHERE pm.id = pa.pos_id
      );

    DELETE FROM public.pos_attempts pa
    WHERE pa.pos_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.pos_machines pm
        WHERE pm.id = pa.pos_id
      );
    GET DIAGNOSTICS orphan_pos_count = ROW_COUNT;
  END IF;

  IF COALESCE(user_id_nullable, TRUE) THEN
    UPDATE public.pos_attempts pa
    SET user_id = NULL
    WHERE pa.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = pa.user_id
      );
    GET DIAGNOSTICS orphan_user_count = ROW_COUNT;
  ELSE
    INSERT INTO public.pos_attempts_orphan_audit (reason, payload)
    SELECT 'missing_user_id', to_jsonb(pa)
    FROM public.pos_attempts pa
    WHERE pa.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = pa.user_id
      );

    DELETE FROM public.pos_attempts pa
    WHERE pa.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = pa.user_id
      );
    GET DIAGNOSTICS orphan_user_count = ROW_COUNT;
  END IF;

  RAISE NOTICE '[014] Cleaned orphan references in pos_attempts: pos_id=% , user_id=%', orphan_pos_count, orphan_user_count;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pos_attempts_pos_id_fkey'
      AND conrelid = 'public.pos_attempts'::regclass
  ) THEN
    ALTER TABLE public.pos_attempts
      ADD CONSTRAINT pos_attempts_pos_id_fkey
      FOREIGN KEY (pos_id)
      REFERENCES public.pos_machines(id)
      ON DELETE CASCADE
      NOT VALID;

    ALTER TABLE public.pos_attempts VALIDATE CONSTRAINT pos_attempts_pos_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pos_attempts_user_id_fkey'
      AND conrelid = 'public.pos_attempts'::regclass
  ) THEN
    ALTER TABLE public.pos_attempts
      ADD CONSTRAINT pos_attempts_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL
      NOT VALID;

    ALTER TABLE public.pos_attempts VALIDATE CONSTRAINT pos_attempts_user_id_fkey;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_attempts_pos_id ON public.pos_attempts(pos_id);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_pos_id_created_at ON public.pos_attempts(pos_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_user_id ON public.pos_attempts(user_id);

ALTER TABLE public.pos_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pos_attempts'
      AND policyname = 'Anyone can view pos attempts'
  ) THEN
    CREATE POLICY "Anyone can view pos attempts"
      ON public.pos_attempts FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pos_attempts'
      AND policyname = 'Authenticated users can insert pos attempts'
  ) THEN
    CREATE POLICY "Authenticated users can insert pos attempts"
      ON public.pos_attempts FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pos_attempts'
      AND policyname = 'Users can update own pos attempts'
  ) THEN
    CREATE POLICY "Users can update own pos attempts"
      ON public.pos_attempts FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pos_attempts'
      AND policyname = 'Users can delete own pos attempts'
  ) THEN
    CREATE POLICY "Users can delete own pos attempts"
      ON public.pos_attempts FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Force PostgREST to refresh schema cache so new columns are available immediately.
NOTIFY pgrst, 'reload schema';
