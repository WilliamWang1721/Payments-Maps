-- 添加结账地点字段到POS机表
-- 由于checkout_location是basic_info JSON字段的一部分，不需要修改表结构
-- 这个迁移文件主要用于文档记录和未来的数据验证

-- 为了确保数据一致性，我们可以添加一个检查约束来验证checkout_location的值
-- 但由于这是JSON字段内的属性，PostgreSQL的JSON约束比较复杂
-- 因此我们在应用层面进行验证

-- 如果需要为现有数据设置默认的checkout_location值，可以运行以下更新语句：
-- UPDATE pos_machines 
-- SET basic_info = jsonb_set(
--   COALESCE(basic_info, '{}'),
--   '{checkout_location}',
--   '"人工收银"'
-- )
-- WHERE basic_info IS NULL OR NOT (basic_info ? 'checkout_location');

-- 添加注释说明新字段
COMMENT ON COLUMN pos_machines.basic_info IS 'POS机基本信息，包含型号、收单机构、支付支持等信息。checkout_location字段表示结账地点（自助收银/人工收银）';