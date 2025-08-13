-- 移除pos_machines表中name字段的非空约束
-- 这个迁移解决了添加POS机时name字段违反非空约束的问题

ALTER TABLE pos_machines 
ALTER COLUMN name DROP NOT NULL;

-- 可选：如果完全不需要name字段，可以删除整个字段
-- ALTER TABLE pos_machines DROP COLUMN IF EXISTS name;

-- 确保anon和authenticated角色有正确的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_machines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_machines TO authenticated;