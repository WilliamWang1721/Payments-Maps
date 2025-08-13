-- 直接添加 remarks 字段到 pos_machines 表
-- 这是一个简化的迁移脚本，避免复杂的条件检查

ALTER TABLE pos_machines 
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 添加注释
COMMENT ON COLUMN pos_machines.remarks IS 'POS机备注信息';

-- 确保权限正确设置
GRANT SELECT ON pos_machines TO anon;
GRANT ALL PRIVILEGES ON pos_machines TO authenticated;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_pos_machines_remarks ON pos_machines (remarks) WHERE remarks IS NOT NULL;