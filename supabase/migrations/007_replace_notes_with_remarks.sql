-- 重构备注功能：将 notes 字段替换为 remarks 字段
-- 这个迁移解决了备注信息丢失的问题，使用全新的字段名避免历史遗留问题

-- 1. 添加新的 remarks 字段
ALTER TABLE pos_machines 
ADD COLUMN remarks TEXT;

-- 2. 如果 notes 字段存在，将数据迁移到 remarks 字段
DO $$
BEGIN
    -- 检查 notes 字段是否存在
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pos_machines' 
        AND column_name = 'notes'
    ) THEN
        -- 迁移数据从 notes 到 remarks
        UPDATE pos_machines 
        SET remarks = notes 
        WHERE notes IS NOT NULL;
        
        -- 删除旧的 notes 字段
        ALTER TABLE pos_machines DROP COLUMN notes;
    END IF;
END $$;

-- 3. 添加注释
COMMENT ON COLUMN pos_machines.remarks IS 'POS机备注信息（重构后的字段）';

-- 4. 确保权限正确设置
-- 授予 anon 角色基本读取权限
GRANT SELECT ON pos_machines TO anon;

-- 授予 authenticated 角色完整权限
GRANT ALL PRIVILEGES ON pos_machines TO authenticated;

-- 5. 创建索引以提高查询性能（如果需要）
CREATE INDEX IF NOT EXISTS idx_pos_machines_remarks ON pos_machines (remarks) WHERE remarks IS NOT NULL;