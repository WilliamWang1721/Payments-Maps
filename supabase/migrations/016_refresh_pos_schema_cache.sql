-- 016_refresh_pos_schema_cache.sql
-- Compatibility migration: ensure the card_album_card_id column exists and refresh PostgREST schema cache.

ALTER TABLE public.pos_attempts
  ADD COLUMN IF NOT EXISTS card_album_card_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_attempts_card_album_card_id
  ON public.pos_attempts(card_album_card_id);

NOTIFY pgrst, 'reload schema';
