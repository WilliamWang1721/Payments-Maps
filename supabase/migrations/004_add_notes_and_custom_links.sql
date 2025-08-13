-- 添加备注字段和自定义链接字段到pos_machines表
ALTER TABLE pos_machines 
ADD COLUMN notes TEXT,
ADD COLUMN custom_links JSONB DEFAULT '[]'::jsonb;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_pos_machines_custom_links ON pos_machines USING GIN (custom_links);

-- 添加注释
COMMENT ON COLUMN pos_machines.notes IS 'POS机备注信息';
COMMENT ON COLUMN pos_machines.custom_links IS 'POS机自定义链接，JSON格式存储';