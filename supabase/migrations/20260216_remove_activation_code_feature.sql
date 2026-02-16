-- 20260216_remove_activation_code_feature.sql
-- 移除激活码体系，并将历史 beta 角色统一迁移为 regular

BEGIN;

-- 1) 迁移历史 beta 角色，避免后续约束收紧时失败
UPDATE users
SET role = 'regular'
WHERE role = 'beta';

-- 2) 收敛 users 角色约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'regular'));

-- 3) 调整权限函数：regular 保持可编辑自身数据
CREATE OR REPLACE FUNCTION can_modify(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_id) IN ('super_admin', 'admin', 'regular');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) 调整角色管理函数，移除 beta 选项
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT can_manage_roles(auth.uid()) THEN
    RAISE EXCEPTION 'Only super administrators can update user roles';
  END IF;

  IF new_role NOT IN ('super_admin', 'admin', 'regular') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  UPDATE users SET role = new_role WHERE id = target_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION batch_update_user_roles(user_roles JSONB)
RETURNS INTEGER AS $$
DECLARE
  user_role RECORD;
  updated_count INTEGER := 0;
BEGIN
  IF NOT can_manage_roles(auth.uid()) THEN
    RAISE EXCEPTION 'Only super administrators can batch update user roles';
  END IF;

  FOR user_role IN SELECT * FROM jsonb_to_recordset(user_roles) AS x(user_id UUID, role TEXT)
  LOOP
    IF user_role.role NOT IN ('super_admin', 'admin', 'regular') THEN
      RAISE EXCEPTION 'Invalid role: %', user_role.role;
    END IF;

    UPDATE users SET role = user_role.role WHERE id = user_role.user_id;
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) 清理可能残留的激活码函数（兼容不同参数签名）
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      oidvectortypes(p.proargtypes) AS arg_types
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('generate_activation_code', 'activate_beta_permission', 'deactivate_activation_code')
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s)',
      fn.schema_name,
      fn.function_name,
      fn.arg_types
    );
  END LOOP;
END;
$$;

-- 6) 清理激活码相关数据表
DROP TABLE IF EXISTS activation_logs;
DROP TABLE IF EXISTS activation_codes;

-- 7) 若通知系统仍存在 beta 目标角色，则统一迁移并收紧约束
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    UPDATE notifications
    SET target_role = 'regular'
    WHERE target_role = 'beta';

    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_target_role_check;
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_target_role_check
      CHECK (target_role IN ('super_admin', 'admin', 'regular'));
  END IF;
END;
$$;

COMMIT;
