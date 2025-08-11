-- 修复用户表权限，允许anon角色插入用户数据

-- 删除现有的插入策略
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- 创建新的插入策略，允许anon角色插入用户数据
CREATE POLICY "Allow anon to insert users" ON users 
  FOR INSERT 
  WITH CHECK (true);

-- 确保anon角色有基本权限
GRANT INSERT ON users TO anon;
GRANT SELECT ON users TO anon;
GRANT UPDATE ON users TO anon;

-- 确保authenticated角色有完整权限
GRANT ALL PRIVILEGES ON users TO authenticated;