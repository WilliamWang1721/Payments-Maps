-- 移除POS机表中的name字段
ALTER TABLE pos_machines DROP COLUMN IF EXISTS name;