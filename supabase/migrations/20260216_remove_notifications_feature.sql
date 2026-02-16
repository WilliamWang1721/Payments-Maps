-- Remove in-app notifications feature and related schema objects.

DO $$
BEGIN
  IF to_regclass('public.notification_reads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "View notification read receipts" ON public.notification_reads;
    DROP POLICY IF EXISTS "Insert notification read receipts" ON public.notification_reads;
    DROP POLICY IF EXISTS "Update own notification read receipts" ON public.notification_reads;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Notifications visible to audience or admins" ON public.notifications;
    DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Admins can update their notifications" ON public.notifications;
    DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON public.notifications;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.update_notifications_updated_at();

DROP TABLE IF EXISTS public.notification_reads;
DROP TABLE IF EXISTS public.notifications;

ALTER TABLE IF EXISTS public.user_settings
  DROP COLUMN IF EXISTS enable_notifications;
