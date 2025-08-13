-- 011_sync_auth_users.sql
-- 同步Supabase Auth用户到自定义Users表

-- 1. 创建函数来处理新用户注册
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 在users表中插入新用户记录
  INSERT INTO public.users (id, email, username, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), -- 从metadata获取username或使用email前缀
    'regular', -- 默认角色为regular
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING; -- 如果用户已存在则忽略
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建触发器，当auth.users表有新用户时自动调用
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. 同步现有的auth用户到users表（如果还没有的话）
INSERT INTO public.users (id, email, username, role, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  'regular' as role,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.email IS NOT NULL;

-- 4. 确保mrwilliam1721@gmail.com用户存在并设置为超级管理员
INSERT INTO public.users (id, email, username, role, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  'super_admin' as role,
  au.created_at
FROM auth.users au
WHERE au.email = 'mrwilliam1721@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  email = EXCLUDED.email,
  username = EXCLUDED.username;

-- 5. 为触发器函数设置权限
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

COMMIT;