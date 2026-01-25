-- 创建卡册卡片表
CREATE TABLE IF NOT EXISTS card_album_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL,
  title TEXT NOT NULL,
  bin TEXT NOT NULL,
  organization TEXT NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('public', 'personal')),
  updated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_card_album_cards_scope ON card_album_cards(scope);
CREATE INDEX IF NOT EXISTS idx_card_album_cards_user_id ON card_album_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_card_album_cards_bin ON card_album_cards(bin);

-- 启用行级安全策略
ALTER TABLE card_album_cards ENABLE ROW LEVEL SECURITY;

-- 卡册表策略
CREATE POLICY "Anyone can view public album cards" ON card_album_cards
  FOR SELECT
  USING (scope = 'public');

CREATE POLICY "Users can view own personal album cards" ON card_album_cards
  FOR SELECT
  USING (scope = 'personal' AND auth.uid() = user_id);

CREATE POLICY "Users can insert own personal album cards" ON card_album_cards
  FOR INSERT
  WITH CHECK (scope = 'personal' AND auth.uid() = user_id);

CREATE POLICY "Users can update own personal album cards" ON card_album_cards
  FOR UPDATE
  USING (scope = 'personal' AND auth.uid() = user_id);

CREATE POLICY "Users can delete own personal album cards" ON card_album_cards
  FOR DELETE
  USING (scope = 'personal' AND auth.uid() = user_id);
