-- 009_add_role_based_permissions.sql
-- 添加基于角色的权限系统

-- 1. 为users表添加role字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'regular' CHECK (role IN ('admin', 'beta', 'regular'));

-- 2. 为现有用户设置默认角色
UPDATE users SET role = 'regular' WHERE role IS NULL;

-- 3. 创建获取用户角色的函数
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM users 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建检查用户是否为管理员的函数
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建检查用户是否为Beta用户或管理员的函数
CREATE OR REPLACE FUNCTION can_modify(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) IN ('admin', 'beta');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 更新pos_machines表的RLS策略
DROP POLICY IF EXISTS "pos_machines_select_policy" ON pos_machines;
DROP POLICY IF EXISTS "pos_machines_insert_policy" ON pos_machines;
DROP POLICY IF EXISTS "pos_machines_update_policy" ON pos_machines;
DROP POLICY IF EXISTS "pos_machines_delete_policy" ON pos_machines;

-- SELECT: 所有人可以查看active状态的POS机或自己创建的POS机
CREATE POLICY "pos_machines_select_policy" ON pos_machines
  FOR SELECT USING (
    status = 'active' OR 
    created_by = auth.uid() OR 
    is_admin(auth.uid())
  );

-- INSERT: Beta用户和管理员可以添加
CREATE POLICY "pos_machines_insert_policy" ON pos_machines
  FOR INSERT WITH CHECK (
    can_modify(auth.uid()) AND 
    created_by = auth.uid()
  );

-- UPDATE: 管理员可以更新所有，Beta用户只能更新自己的
CREATE POLICY "pos_machines_update_policy" ON pos_machines
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND created_by = auth.uid())
  );

-- DELETE: 管理员可以删除所有，Beta用户只能删除自己的
CREATE POLICY "pos_machines_delete_policy" ON pos_machines
  FOR DELETE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND created_by = auth.uid())
  );

-- 7. 更新reviews表的RLS策略
DROP POLICY IF EXISTS "reviews_select_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_policy" ON reviews;

-- SELECT: 所有人可以查看评价
CREATE POLICY "reviews_select_policy" ON reviews
  FOR SELECT USING (true);

-- INSERT: Beta用户和管理员可以添加评价
CREATE POLICY "reviews_insert_policy" ON reviews
  FOR INSERT WITH CHECK (
    can_modify(auth.uid()) AND 
    user_id = auth.uid()
  );

-- UPDATE: 管理员可以更新所有，Beta用户只能更新自己的
CREATE POLICY "reviews_update_policy" ON reviews
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND user_id = auth.uid())
  );

-- DELETE: 管理员可以删除所有，Beta用户只能删除自己的
CREATE POLICY "reviews_delete_policy" ON reviews
  FOR DELETE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND user_id = auth.uid())
  );

-- 8. 更新external_links表的RLS策略
DROP POLICY IF EXISTS "external_links_select_policy" ON external_links;
DROP POLICY IF EXISTS "external_links_insert_policy" ON external_links;
DROP POLICY IF EXISTS "external_links_update_policy" ON external_links;
DROP POLICY IF EXISTS "external_links_delete_policy" ON external_links;

-- SELECT: 所有人可以查看外部链接
CREATE POLICY "external_links_select_policy" ON external_links
  FOR SELECT USING (true);

-- INSERT: Beta用户和管理员可以添加链接
CREATE POLICY "external_links_insert_policy" ON external_links
  FOR INSERT WITH CHECK (
    can_modify(auth.uid()) AND 
    created_by = auth.uid()
  );

-- UPDATE: 管理员可以更新所有，Beta用户只能更新自己的
CREATE POLICY "external_links_update_policy" ON external_links
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND created_by = auth.uid())
  );

-- DELETE: 管理员可以删除所有，Beta用户只能删除自己的
CREATE POLICY "external_links_delete_policy" ON external_links
  FOR DELETE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND created_by = auth.uid())
  );

-- 9. 更新favorites表的RLS策略
DROP POLICY IF EXISTS "favorites_select_policy" ON favorites;
DROP POLICY IF EXISTS "favorites_insert_policy" ON favorites;
DROP POLICY IF EXISTS "favorites_update_policy" ON favorites;
DROP POLICY IF EXISTS "favorites_delete_policy" ON favorites;

-- SELECT: 管理员可以查看所有，其他用户只能查看自己的
CREATE POLICY "favorites_select_policy" ON favorites
  FOR SELECT USING (
    is_admin(auth.uid()) OR 
    user_id = auth.uid()
  );

-- INSERT: Beta用户和管理员可以添加收藏
CREATE POLICY "favorites_insert_policy" ON favorites
  FOR INSERT WITH CHECK (
    can_modify(auth.uid()) AND 
    user_id = auth.uid()
  );

-- UPDATE: 管理员可以更新所有，Beta用户只能更新自己的
CREATE POLICY "favorites_update_policy" ON favorites
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND user_id = auth.uid())
  );

-- DELETE: 管理员可以删除所有，Beta用户只能删除自己的
CREATE POLICY "favorites_delete_policy" ON favorites
  FOR DELETE USING (
    is_admin(auth.uid()) OR 
    (can_modify(auth.uid()) AND user_id = auth.uid())
  );

-- 10. 更新users表的RLS策略以支持角色查看
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- SELECT: 所有人可以查看用户基本信息
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);

-- INSERT: 任何认证用户可以插入自己的记录
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- UPDATE: 管理员可以更新所有用户，其他用户只能更新自己的信息
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    id = auth.uid()
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()))
  );

-- 11. 创建管理员角色管理函数（仅管理员可调用）
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查调用者是否为管理员
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;
  
  -- 检查新角色是否有效
  IF new_role NOT IN ('admin', 'beta', 'regular') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- 更新用户角色
  UPDATE users SET role = new_role WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 为函数设置权限
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_modify(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;

-- 13. 创建索引以提高角色查询性能
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMIT;