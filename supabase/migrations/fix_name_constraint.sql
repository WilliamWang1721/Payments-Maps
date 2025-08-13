-- 修复 pos_machines 表的 name 字段约束问题
-- 这个迁移将移除 name 字段的非空约束，或者完全删除 name 字段

-- 方案1：移除 name 字段的非空约束
ALTER TABLE pos_machines ALTER COLUMN name DROP NOT NULL;

-- 方案2：如果不需要 name 字段，可以直接删除它
-- DROP COLUMN IF EXISTS name;

-- 确保其他必要字段存在
DO $$
BEGIN
    -- 检查并添加 notes 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_machines' AND column_name = 'notes') THEN
        ALTER TABLE pos_machines ADD COLUMN notes TEXT;
    END IF;
    
    -- 检查并添加 custom_links 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_machines' AND column_name = 'custom_links') THEN
        ALTER TABLE pos_machines ADD COLUMN custom_links JSONB;
    END IF;
END $$;

-- 更新现有记录，为空的 name 字段设置默认值
UPDATE pos_machines 
SET name = COALESCE(merchant_name, '未命名POS机') 
WHERE name IS NULL OR name = '';

-- 添加注释
COMMENT ON COLUMN pos_machines.name IS 'POS机名称，可为空';
COMMENT ON COLUMN pos_machines.notes IS 'POS机备注信息';
COMMENT ON COLUMN pos_machines.custom_links IS 'POS机自定义链接，JSON格式';