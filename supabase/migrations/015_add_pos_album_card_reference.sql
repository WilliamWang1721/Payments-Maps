-- 015_add_pos_album_card_reference.sql
-- Store card album linkage on attempt records so card details stay live-updated.

ALTER TABLE public.pos_attempts
  ADD COLUMN IF NOT EXISTS card_album_card_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_attempts_card_album_card_id
  ON public.pos_attempts(card_album_card_id);
