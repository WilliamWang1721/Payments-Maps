-- 确保pos_machines表包含所有必要字段并修复权限问题
-- 这个迁移解决了custom_links字段缺失的问题

DO $$
BEGIN
    -- 检查并添加 custom_links 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_machines' AND column_name = 'custom_links') THEN
        ALTER TABLE pos_machines ADD COLUMN custom_links JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added custom_links column to pos_machines table';
    END IF;
    
    -- 检查并添加 notes 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_machines' AND column_name = 'notes') THEN
        ALTER TABLE pos_machines ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to pos_machines table';
    END IF;
    
    -- 确保name字段允许为空
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'pos_machines' AND column_name = 'name' AND is_nullable = 'NO') THEN
        ALTER TABLE pos_machines ALTER COLUMN name DROP NOT NULL;
        RAISE NOTICE 'Removed NOT NULL constraint from name column';
    END IF;
END $$;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_pos_machines_custom_links ON pos_machines USING GIN (custom_links);

-- 确保anon和authenticated角色有正确的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_machines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_machines TO authenticated;

-- 添加注释
COMMENT ON COLUMN pos_machines.custom_links IS 'POS机自定义链接，JSON格式存储';
COMMENT ON COLUMN pos_machines.notes IS 'POS机备注信息';