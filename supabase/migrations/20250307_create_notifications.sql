-- 创建通知与已读状态表，支持管理员发布消息、用户查看和标记已读
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'alert', 'promo', 'success', 'system')),
  link_url TEXT,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'role', 'user')),
  target_role TEXT CHECK (target_role IN ('super_admin', 'admin', 'beta', 'regular')),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT notifications_user_audience CHECK (
    audience <> 'user' OR target_user_id IS NOT NULL
  ),
  CONSTRAINT notifications_role_audience CHECK (
    audience <> 'role' OR target_role IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON notifications(audience, target_role, target_user_id);

-- 记录用户已读状态
CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification ON notification_reads(notification_id);

-- 维护 updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE PROCEDURE update_notifications_updated_at();

-- RLS 策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- 通知可见范围：所有人可见、匹配用户、匹配角色、创建者或管理员
CREATE POLICY "Notifications visible to audience or admins" ON notifications
  FOR SELECT USING (
    audience = 'all'
    OR target_user_id = auth.uid()
    OR (audience = 'role' AND target_role = get_user_role(auth.uid()))
    OR created_by = auth.uid()
    OR is_admin(auth.uid())
  );

-- 仅管理员/超管可发送，记录创建者
CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) AND created_by = auth.uid()
  );

-- 允许管理员更新自己发布的通知
CREATE POLICY "Admins can update their notifications" ON notifications
  FOR UPDATE USING (is_admin(auth.uid()) AND created_by = auth.uid());

-- 用户可查看自己的已读记录，管理员可查看全部
CREATE POLICY "View notification read receipts" ON notification_reads
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 用户标记为已读
CREATE POLICY "Insert notification read receipts" ON notification_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 用户更新自己的已读记录
CREATE POLICY "Update own notification read receipts" ON notification_reads
  FOR UPDATE USING (user_id = auth.uid());

-- 授权
GRANT ALL PRIVILEGES ON notifications TO authenticated;
GRANT ALL PRIVILEGES ON notification_reads TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
