ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS founded INTEGER,
  ADD COLUMN IF NOT EXISTS headquarters TEXT;

UPDATE public.brands
SET business_type = CASE
  WHEN category IN ('online', 'offline') THEN category
  WHEN category IN ('ecommerce', 'food_delivery') THEN 'online'
  ELSE 'offline'
END
WHERE business_type IS NULL;

UPDATE public.brands
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.brands
  ALTER COLUMN business_type SET DEFAULT 'offline',
  ALTER COLUMN business_type SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL;
