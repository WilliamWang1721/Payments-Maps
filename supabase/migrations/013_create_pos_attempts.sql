-- 创建POS机尝试记录表
CREATE TABLE IF NOT EXISTS pos_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID REFERENCES pos_machines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  attempt_number INTEGER,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'unknown')),
  card_network TEXT,
  payment_method TEXT CHECK (payment_method IN ('tap', 'insert', 'swipe', 'apple_pay', 'google_pay', 'hce')),
  cvm TEXT CHECK (cvm IN ('no_pin', 'pin', 'signature', 'unknown')),
  acquiring_mode TEXT CHECK (acquiring_mode IN ('DCC', 'EDC', 'unknown')),
  device_status TEXT CHECK (device_status IN ('active', 'inactive', 'maintenance', 'disabled')),
  acquiring_institution TEXT,
  checkout_location TEXT CHECK (checkout_location IN ('自助收银', '人工收银')),
  card_name TEXT,
  notes TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE,
  is_conclusive_failure BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pos_attempts_pos_id ON pos_attempts(pos_id);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_pos_id_created_at ON pos_attempts(pos_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_user_id ON pos_attempts(user_id);

-- 启用行级安全策略
ALTER TABLE pos_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pos_attempts' AND policyname = 'Anyone can view pos attempts') THEN
    CREATE POLICY "Anyone can view pos attempts" ON pos_attempts FOR SELECT USING (true);
  END IF;
END $$;

CREATE POLICY "Authenticated users can insert pos attempts" ON pos_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pos attempts" ON pos_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pos attempts" ON pos_attempts FOR DELETE USING (auth.uid() = user_id);
