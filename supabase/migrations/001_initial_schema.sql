-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建字段配置表（用于动态字段管理）
CREATE TABLE IF NOT EXISTS field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT UNIQUE NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'select', 'multiselect')),
  category TEXT NOT NULL CHECK (category IN ('basic', 'payment', 'features', 'technical')),
  options JSONB,
  required BOOLEAN DEFAULT FALSE,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建POS机表
CREATE TABLE IF NOT EXISTS pos_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  merchant_name TEXT NOT NULL,
  basic_info JSONB DEFAULT '{}',
  extended_fields JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending_verification' CHECK (status IN ('active', 'inactive', 'pending_verification')),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建评价表
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_machine_id UUID REFERENCES pos_machines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pos_machine_id, user_id)
);

-- 创建外部链接表
CREATE TABLE IF NOT EXISTS external_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_machine_id UUID REFERENCES pos_machines(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linuxdo', 'xiaohongshu', 'other')),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pos_machine_id UUID REFERENCES pos_machines(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pos_machine_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pos_machines_location ON pos_machines(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pos_machines_status ON pos_machines(status);
CREATE INDEX IF NOT EXISTS idx_pos_machines_created_by ON pos_machines(created_by);
CREATE INDEX IF NOT EXISTS idx_reviews_pos_machine_id ON reviews(pos_machine_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_external_links_pos_machine_id ON external_links(pos_machine_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_pos_machine_id ON favorites(pos_machine_id);

-- 启用行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 用户表策略
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view all profiles') THEN
    CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
  END IF;
END $$;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- 字段配置表策略（只读）
CREATE POLICY "Anyone can view field configs" ON field_configs FOR SELECT USING (true);

-- POS机表策略
CREATE POLICY "Anyone can view active POS machines" ON pos_machines FOR SELECT USING (status = 'active' OR auth.uid() = created_by);
CREATE POLICY "Authenticated users can insert POS machines" ON pos_machines FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own POS machines" ON pos_machines FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own POS machines" ON pos_machines FOR DELETE USING (auth.uid() = created_by);

-- 评价表策略
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- 外部链接表策略
CREATE POLICY "Anyone can view external links" ON external_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert external links" ON external_links FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own external links" ON external_links FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own external links" ON external_links FOR DELETE USING (auth.uid() = created_by);

-- 收藏表策略
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- 插入默认字段配置
INSERT INTO field_configs (field_key, field_name, field_type, category, required, display_order) VALUES
('model', 'POS机型号', 'text', 'basic', false, 1),
('acquiring_institution', '收单机构', 'text', 'basic', false, 2),
('supports_foreign_cards', '支持外卡', 'boolean', 'payment', false, 3),
('supports_apple_pay', '支持Apple Pay', 'boolean', 'payment', false, 4),
('supports_google_pay', '支持Google Pay', 'boolean', 'payment', false, 5),
('supports_contactless', '支持闪付', 'boolean', 'payment', false, 6),
('min_amount_no_pin', '免密金额', 'number', 'payment', false, 7),
('supports_unionpay', '支持银联', 'boolean', 'payment', false, 8),
('supports_visa', '支持Visa', 'boolean', 'payment', false, 9),
('supports_mastercard', '支持Mastercard', 'boolean', 'payment', false, 10),
('network_type', '网络类型', 'select', 'technical', false, 11),
('terminal_type', '终端类型', 'select', 'technical', false, 12)
ON CONFLICT (field_key) DO NOTHING;

-- 更新字段配置的选项
UPDATE field_configs SET options = '["4G", "WiFi", "以太网", "蓝牙"]' WHERE field_key = 'network_type';
UPDATE field_configs SET options = '["移动POS", "台式POS", "mPOS", "智能POS"]' WHERE field_key = 'terminal_type';