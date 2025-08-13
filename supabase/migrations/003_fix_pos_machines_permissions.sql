-- 修复POS机表权限，允许匿名用户插入数据

-- 删除现有的POS机插入策略
DROP POLICY IF EXISTS "Authenticated users can insert POS machines" ON pos_machines;

-- 创建新的插入策略，允许匿名用户插入数据
-- 当用户已登录时，created_by必须等于用户ID
-- 当用户未登录时，created_by可以为null
CREATE POLICY "Allow users to insert POS machines" ON pos_machines 
  FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = created_by) OR 
    (auth.uid() IS NULL AND created_by IS NULL)
  );

-- 确保anon角色有插入POS机的权限
GRANT INSERT ON pos_machines TO anon;
GRANT SELECT ON pos_machines TO anon;

-- 确保authenticated角色有完整权限
GRANT ALL PRIVILEGES ON pos_machines TO authenticated;

-- 同时确保anon角色可以读取字段配置
GRANT SELECT ON field_configs TO anon;