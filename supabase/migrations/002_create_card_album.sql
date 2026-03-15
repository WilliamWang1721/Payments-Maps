-- Ported from Payments-Maps: card album backend for public and personal cards.
CREATE TABLE IF NOT EXISTS public.card_album_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL,
  title TEXT NOT NULL,
  bin TEXT NOT NULL,
  organization TEXT NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('public', 'personal')),
  updated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_album_cards_scope ON public.card_album_cards(scope);
CREATE INDEX IF NOT EXISTS idx_card_album_cards_user_id ON public.card_album_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_card_album_cards_bin ON public.card_album_cards(bin);

ALTER TABLE public.card_album_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public album cards" ON public.card_album_cards;
CREATE POLICY "Anyone can view public album cards"
ON public.card_album_cards
FOR SELECT
USING (scope = 'public');

DROP POLICY IF EXISTS "Users can view own personal album cards" ON public.card_album_cards;
CREATE POLICY "Users can view own personal album cards"
ON public.card_album_cards
FOR SELECT
USING (scope = 'personal' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own personal album cards" ON public.card_album_cards;
CREATE POLICY "Users can insert own personal album cards"
ON public.card_album_cards
FOR INSERT
WITH CHECK (scope = 'personal' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own personal album cards" ON public.card_album_cards;
CREATE POLICY "Users can update own personal album cards"
ON public.card_album_cards
FOR UPDATE
USING (scope = 'personal' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own personal album cards" ON public.card_album_cards;
CREATE POLICY "Users can delete own personal album cards"
ON public.card_album_cards
FOR DELETE
USING (scope = 'personal' AND auth.uid() = user_id);
