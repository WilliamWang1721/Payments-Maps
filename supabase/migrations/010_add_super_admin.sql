-- 010_add_super_admin.sql
-- 添加超级管理员角色系统

-- 1. 扩展role字段支持super_admin角色
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'beta', 'regular'));

-- 2. 创建检查用户是否为超级管理员的函数
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建检查用户是否可以管理角色的函数
CREATE OR REPLACE FUNCTION can_manage_roles(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 更新is_admin函数，确保超级管理员也被视为管理员
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 更新can_modify函数，确保超级管理员也可以修改数据
CREATE OR REPLACE FUNCTION can_modify(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) IN ('super_admin', 'admin', 'beta');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 更新角色管理函数，只允许超级管理员修改用户角色
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT can_manage_roles(auth.uid()) THEN
    RAISE EXCEPTION 'Only super administrators can update user roles';
  END IF;
  
  -- 检查新角色是否有效
  IF new_role NOT IN ('super_admin', 'admin', 'beta', 'regular') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- 更新用户角色
  UPDATE users SET role = new_role WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 更新users表的RLS策略，允许超级管理员管理所有用户角色
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- UPDATE: 超级管理员可以更新所有用户（包括角色），管理员和其他用户只能更新自己的信息（不包括角色）
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    can_manage_roles(auth.uid()) OR 
    (is_admin(auth.uid()) AND id != auth.uid()) OR
    id = auth.uid()
  )
  WITH CHECK (
    can_manage_roles(auth.uid()) OR 
    (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()))
  );

-- 8. 创建批量角色管理函数（仅超级管理员可调用）
CREATE OR REPLACE FUNCTION batch_update_user_roles(user_roles JSONB)
RETURNS INTEGER AS $$
DECLARE
  user_role RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT can_manage_roles(auth.uid()) THEN
    RAISE EXCEPTION 'Only super administrators can batch update user roles';
  END IF;
  
  -- 遍历用户角色数据
  FOR user_role IN SELECT * FROM jsonb_to_recordset(user_roles) AS x(user_id UUID, role TEXT)
  LOOP
    -- 检查角色是否有效
    IF user_role.role NOT IN ('super_admin', 'admin', 'beta', 'regular') THEN
      RAISE EXCEPTION 'Invalid role: %', user_role.role;
    END IF;
    
    -- 更新用户角色
    UPDATE users SET role = user_role.role WHERE id = user_role.user_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 创建获取所有用户角色的函数（仅超级管理员可调用）
CREATE OR REPLACE FUNCTION get_all_user_roles()
RETURNS TABLE(user_id UUID, email TEXT, role TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT can_manage_roles(auth.uid()) THEN
    RAISE EXCEPTION 'Only super administrators can view all user roles';
  END IF;
  
  RETURN QUERY
  SELECT u.id, u.email, u.role, u.created_at
  FROM users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 为新函数设置权限
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_user_roles(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_roles() TO authenticated;

-- 11. 设置mrwilliam1721@gmail.com为超级管理员
-- 注意：这个操作需要用户已经存在于系统中
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'mrwilliam1721@gmail.com';

-- 12. 创建索引以提高超级管理员查询性能
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(role) WHERE role = 'super_admin';

COMMIT;