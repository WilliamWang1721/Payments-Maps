import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Bell, Check, CheckCircle, Clock, ExternalLink, Loader2, MessageSquare, Tag, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import usePermissions from '@/hooks/usePermissions'
import { getErrorDetails, notify } from '@/lib/notify'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

type NotificationType = 'message' | 'alert' | 'promo' | 'success' | 'system'
type NotificationAudience = 'all' | 'role' | 'user'

interface NotificationRead {
  user_id: string
  read_at: string
}

interface NotificationRecord {
  id: string
  title: string
  content: string
  type: NotificationType
  link_url?: string | null
  audience: NotificationAudience
  target_role?: string | null
  target_user_id?: string | null
  created_by?: string | null
  created_at: string
  notification_reads?: NotificationRead[] | null
  sender?: {
    id: string
    email: string
    username?: string | null
  } | null
}

type NotificationItem = NotificationRecord & { isRead: boolean }

type ComposeFormState = {
  title: string
  content: string
  type: NotificationType
  audience: NotificationAudience
  targetRole: 'super_admin' | 'admin' | 'beta' | 'regular'
  targetUserEmail: string
  linkUrl: string
}

const getIconByType = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="w-5 h-5 text-white" />
    case 'promo':
      return <Tag className="w-5 h-5 text-white" />
    case 'alert':
      return <AlertCircle className="w-5 h-5 text-white" />
    case 'success':
      return <CheckCircle className="w-5 h-5 text-white" />
    case 'system':
    default:
      return <Bell className="w-5 h-5 text-white" />
  }
}

const getColorByType = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return 'bg-accent-yellow shadow-blue-500/30'
    case 'promo':
      return 'bg-accent-purple shadow-purple-500/30'
    case 'alert':
      return 'bg-orange-400 shadow-orange-500/30'
    case 'success':
      return 'bg-accent-salmon shadow-teal-500/30'
    case 'system':
    default:
      return 'bg-soft-black shadow-blue-500/30'
  }
}

const Notifications = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { role, isAdmin, isSuperAdmin, isLoading: permissionsLoading } = usePermissions()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsUnavailable, setNotificationsUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState<ComposeFormState>({
    title: '',
    content: '',
    type: 'message',
    audience: 'all',
    targetRole: 'regular',
    targetUserEmail: '',
    linkUrl: ''
  })

  useBodyScrollLock(Boolean(selectedNotification), { includeHtml: true })

  const formatTimeAgo = (value: string) => {
    const date = new Date(value)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) {
      return t('notificationsPage.time.justNow', 'Just now')
    }
    if (minutes < 60) {
      return t('notificationsPage.time.minutesAgo', { count: minutes, defaultValue: '{{count}} minutes ago' })
    }
    if (hours < 24) {
      return t('notificationsPage.time.hoursAgo', { count: hours, defaultValue: '{{count}} hours ago' })
    }
    return t('notificationsPage.time.daysAgo', { count: days, defaultValue: '{{count}} days ago' })
  }

  const getAudienceLabel = (item: NotificationRecord) => {
    switch (item.audience) {
      case 'all':
        return t('notificationsPage.audience.all', 'All users')
      case 'role':
        return t('notificationsPage.audience.role', {
          role: item.target_role || '—',
          defaultValue: 'Role: {{role}}'
        })
      case 'user':
        return t('notificationsPage.audience.user', 'Specific user')
      default:
        return ''
    }
  }

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return t('notificationsPage.types.message', 'Message')
      case 'promo':
        return t('notificationsPage.types.promo', 'Announcement')
      case 'alert':
        return t('notificationsPage.types.alert', 'Alert')
      case 'success':
        return t('notificationsPage.types.success', 'Success')
      case 'system':
      default:
        return t('notificationsPage.types.system', 'System')
    }
  }

  const loadNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const orFilters = [
        'audience.eq.all',
        `target_user_id.eq.${user.id}`,
        `and(audience.eq.role,target_role.eq.${role})`,
        `created_by.eq.${user.id}`
      ]

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          title,
          content,
          type,
          link_url,
          audience,
          target_role,
          target_user_id,
          created_by,
          created_at,
          notification_reads ( user_id, read_at ),
          sender:users!notifications_created_by_fkey ( id, email, username )
        `)
        .or(orFilters.join(','))
        .order('created_at', { ascending: false })

      if (error) {
        console.error('加载通知失败:', error)
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          // 目标环境缺少 notifications 表时，直接标记不可用，避免阻断
          setNotificationsUnavailable(true)
          setNotifications([])
          setSelectedNotification(null)
          notify.warning(t('notificationsPage.tableMissing', '通知功能未在当前环境启用'))
          return
        }
        notify.critical(t('notificationsPage.loadError', 'Failed to load notifications'), {
          title: '加载通知失败',
          details: getErrorDetails(error),
        })
        return
      }

      const mapped: NotificationItem[] = (data || []).map((item) => {
        const reads = item.notification_reads || []
        const isRead = reads.some((read) => read.user_id === user.id)
        const sender = Array.isArray(item.sender) ? item.sender[0] : item.sender
        return { ...item, sender, notification_reads: reads, isRead }
      })

      setNotifications(mapped)
      setSelectedNotification((current) => {
        if (!current) return null
        const updated = mapped.find((item) => item.id === current.id)
        return updated || null
      })
    } catch (error) {
      console.error('加载通知失败:', error)
      notify.critical(t('notificationsPage.loadError', 'Failed to load notifications'), {
        title: '加载通知失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
    }
  }, [role, t, user])

  useEffect(() => {
    if (!user || permissionsLoading) return
    if (notificationsUnavailable) return
    loadNotifications().catch((error) => console.error('加载通知出错:', error))
  }, [loadNotifications, permissionsLoading, user, notificationsUnavailable])

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.isRead),
    [notifications]
  )
  const earlierNotifications = useMemo(
    () => notifications.filter((item) => item.isRead),
    [notifications]
  )
  const unreadCount = unreadNotifications.length

  const markAsRead = async (notificationId: string) => {
    if (!user) return
    const target = notifications.find((item) => item.id === notificationId)
    if (!target || target.isRead) return

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('notification_reads')
      .upsert({ notification_id: notificationId, user_id: user.id, read_at: now })

    if (error) {
      console.error('标记已读失败:', error)
      notify.error(t('notificationsPage.markReadError', 'Failed to mark as read'))
      return
    }

    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id !== notificationId) return item
        const reads = item.notification_reads || []
        const alreadyExists = reads.some((read) => read.user_id === user.id)
        return {
          ...item,
          isRead: true,
          notification_reads: alreadyExists ? reads : [...reads, { user_id: user.id, read_at: now }]
        }
      })
    )
    setSelectedNotification((current) => {
      if (!current || current.id !== notificationId) return current
      const reads = current.notification_reads || []
      const alreadyExists = reads.some((read) => read.user_id === user.id)
      return {
        ...current,
        isRead: true,
        notification_reads: alreadyExists ? reads : [...reads, { user_id: user.id, read_at: now }]
      }
    })
  }

  const markAllAsRead = async () => {
    if (!user) return
    const unread = notifications.filter((item) => !item.isRead)
    if (unread.length === 0) return

    setMarkingAll(true)
    const now = new Date().toISOString()
    const payload = unread.map((item) => ({
      notification_id: item.id,
      user_id: user.id,
      read_at: now
    }))

    const { error } = await supabase.from('notification_reads').upsert(payload)
    if (error) {
      console.error('全部标记已读失败:', error)
      notify.error(t('notificationsPage.markAllError', 'Failed to mark all as read'))
      setMarkingAll(false)
      return
    }

    setNotifications((prev) =>
      prev.map((item) => {
        if (item.isRead) return item
        const reads = item.notification_reads || []
        const alreadyExists = reads.some((read) => read.user_id === user.id)
        return {
          ...item,
          isRead: true,
          notification_reads: alreadyExists ? reads : [...reads, { user_id: user.id, read_at: now }]
        }
      })
    )
    setSelectedNotification((current) => {
      if (!current) return current
      if (current.isRead) return current
      const reads = current.notification_reads || []
      const alreadyExists = reads.some((read) => read.user_id === user.id)
      return {
        ...current,
        isRead: true,
        notification_reads: alreadyExists ? reads : [...reads, { user_id: user.id, read_at: now }]
      }
    })
    notify.success(t('notificationsPage.markAllSuccess', 'All notifications marked as read'))
    setMarkingAll(false)
  }

  const handleOpenNotification = (item: NotificationItem) => {
    setSelectedNotification(item)
    if (!item.isRead) {
      markAsRead(item.id).catch((error) => console.error('标记通知已读失败:', error))
    }
  }

  const handleSendNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !isAdmin) return

    if (!formData.title.trim() || !formData.content.trim()) {
      notify.error(t('notificationsPage.form.required', 'Title and content are required'))
      return
    }

    if (formData.audience === 'user' && !formData.targetUserEmail.trim()) {
      notify.error(t('notificationsPage.form.userRequired', 'Target user email is required'))
      return
    }

    setSending(true)

    try {
      let targetUserId: string | null = null

      if (formData.audience === 'user') {
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.targetUserEmail.trim())
          .maybeSingle()

        if (userError || !userRow) {
          throw new Error(userError?.message || 'Target user not found')
        }

        targetUserId = userRow.id
      }

      const { error } = await supabase.from('notifications').insert({
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        link_url: formData.linkUrl.trim() || null,
        audience: formData.audience,
        target_role: formData.audience === 'role' ? formData.targetRole : null,
        target_user_id: formData.audience === 'user' ? targetUserId : null,
        created_by: user.id
      })

      if (error) {
        throw error
      }

      notify.success(t('notificationsPage.form.sent', 'Notification sent'))
      setFormData({
        title: '',
        content: '',
        type: 'message',
        audience: 'all',
        targetRole: 'regular',
        targetUserEmail: '',
        linkUrl: ''
      })
      await loadNotifications()
    } catch (error) {
      console.error('发送通知失败:', error)
      notify.error(t('notificationsPage.form.failed', 'Failed to send notification'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent rounded-[32px] overflow-hidden animate-fade-in-up min-h-[520px]">
      <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-100 bg-cream sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-soft-black tracking-tight">
            {t('notificationsPage.title', 'Notifications')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {notificationsUnavailable
              ? t('notificationsPage.tableMissing', '通知功能未在当前环境启用')
              : unreadCount > 0
                ? t('notificationsPage.unread', { count: unreadCount, defaultValue: 'You have {{count}} unread messages' })
                : t('notificationsPage.caughtUp', 'You are all caught up')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs font-semibold text-accent-yellow hover:text-accent-purple transition-colors bg-blue-50 px-4 py-2 rounded-xl disabled:opacity-70"
          >
            {markingAll ? t('notificationsPage.markingAll', 'Marking...') : t('notificationsPage.markAll', 'Mark all as read')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar space-y-8">
        {notificationsUnavailable && (
          <div className="p-6 bg-cream border border-yellow-100 rounded-3xl text-sm text-gray-700">
            {t('notificationsPage.tableMissing', '通知功能未在当前环境启用')}
          </div>
        )}

        {(isAdmin || isSuperAdmin) && !permissionsLoading && !notificationsUnavailable && (
          <section className="p-6 bg-cream border border-blue-100 rounded-3xl shadow-sm">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-accent-purple uppercase tracking-wide">
                  {t('notificationsPage.form.admin', 'Admin broadcast')}
                </p>
                <h2 className="text-lg font-bold text-soft-black">
                  {t('notificationsPage.form.title', 'Send a notification')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('notificationsPage.form.subtitle', 'Push updates to all users, a role, or a specific account.')}
                </p>
              </div>
              <span className="px-3 py-1 text-xs rounded-full bg-white text-accent-yellow font-semibold border border-yellow-200">
                {t('notificationsPage.form.role', { role, defaultValue: 'Role: {{role}}' })}
              </span>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSendNotification}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  {t('notificationsPage.form.fields.title', 'Title')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent"
                  placeholder={t('notificationsPage.form.placeholders.title', 'Maintenance window tonight')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  {t('notificationsPage.form.fields.type', 'Type')}
                </label>
                <select
                  value={formData.type}
                  onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value as NotificationType }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent"
                >
                  <option value="message">{t('notificationsPage.types.message', 'Message')}</option>
                  <option value="alert">{t('notificationsPage.types.alert', 'Alert')}</option>
                  <option value="promo">{t('notificationsPage.types.promo', 'Announcement')}</option>
                  <option value="success">{t('notificationsPage.types.success', 'Success')}</option>
                  <option value="system">{t('notificationsPage.types.system', 'System')}</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-gray-500">
                  {t('notificationsPage.form.fields.content', 'Content')}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent min-h-[100px]"
                  placeholder={t('notificationsPage.form.placeholders.content', 'Describe what users need to know...')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  {t('notificationsPage.form.fields.audience', 'Audience')}
                </label>
                <select
                  value={formData.audience}
                  onChange={(event) => setFormData((prev) => ({ ...prev, audience: event.target.value as NotificationAudience }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent"
                >
                  <option value="all">{t('notificationsPage.audience.all', 'All users')}</option>
                  <option value="role">{t('notificationsPage.audience.roleShort', 'Specific role')}</option>
                  <option value="user">{t('notificationsPage.audience.user', 'Specific user')}</option>
                </select>
              </div>

              {formData.audience === 'role' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">
                    {t('notificationsPage.form.fields.role', 'Target role')}
                  </label>
                  <select
                    value={formData.targetRole}
                    onChange={(event) => setFormData((prev) => ({ ...prev, targetRole: event.target.value as ComposeFormState['targetRole'] }))}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="beta">Beta</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>
              )}

              {formData.audience === 'user' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">
                    {t('notificationsPage.form.fields.email', 'Target user email')}
                  </label>
                  <input
                    type="email"
                    value={formData.targetUserEmail}
                    onChange={(event) => setFormData((prev) => ({ ...prev, targetUserEmail: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  {t('notificationsPage.form.fields.link', 'Related link (optional)')}
                </label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, linkUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-yellow focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      title: '',
                      content: '',
                      type: 'message',
                      audience: 'all',
                      targetRole: 'regular',
                      targetUserEmail: '',
                      linkUrl: ''
                    })
                  }
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-soft-black rounded-xl"
                >
                  {t('notificationsPage.form.reset', 'Reset')}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 rounded-xl bg-soft-black text-white text-sm font-semibold hover:bg-accent-yellow transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {sending ? t('notificationsPage.form.sending', 'Sending...') : t('notificationsPage.form.send', 'Send')}
                </button>
              </div>
            </form>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t('notificationsPage.newSection', 'New')}
          </h2>
          {loading ? (
            <div className="p-6 rounded-2xl bg-cream border border-dashed border-blue-200 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />
              {t('notificationsPage.loading', 'Loading notifications...')}
            </div>
          ) : unreadNotifications.length === 0 ? (
            <div className="p-6 rounded-2xl bg-cream border border-dashed border-blue-200 text-sm text-gray-500">
              {t('notificationsPage.empty', 'No notifications at the moment')}
            </div>
          ) : (
            <div className="space-y-3">
              {unreadNotifications.map((item, index) => (
                <article
                  key={item.id}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-cream border border-transparent hover:border-blue-100 transition-all cursor-pointer relative animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.08}s` }}
                  onClick={() => handleOpenNotification(item)}
                >
                  <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${getColorByType(item.type)} group-hover:scale-105 transition-transform duration-300`}>
                    {getIconByType(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-soft-black group-hover:text-accent-yellow transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-1">{getAudienceLabel(item)}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">{item.content}</p>
                  </div>
                  <span className="absolute top-4 right-4 w-2 h-2 bg-accent-salmon rounded-full shadow-sm" />
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t('notificationsPage.earlierSection', 'Earlier')}
          </h2>
          {loading ? (
            <div className="p-6 rounded-2xl bg-white border border-dashed border-gray-200 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />
              {t('notificationsPage.loading', 'Loading notifications...')}
            </div>
          ) : earlierNotifications.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-dashed border-gray-200 text-sm text-gray-500">
              {t('notificationsPage.empty', 'No notifications at the moment')}
            </div>
          ) : (
            <div className="space-y-3">
              {earlierNotifications.map((item, index) => (
                <article
                  key={item.id}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-soft transition-all cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.08}s` }}
                  onClick={() => handleOpenNotification(item)}
                >
                  <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow ${getColorByType(item.type)} opacity-80 group-hover:opacity-100 transition-opacity`}>
                    {getIconByType(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-bold text-gray-700">{item.title}</h3>
                        <p className="text-[11px] text-gray-500 mt-1">{getAudienceLabel(item)}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                  </div>
                  <Check className="w-4 h-4 text-green-500 opacity-70" />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedNotification &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 relative">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-soft-black"
                aria-label={t('notificationsPage.close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getColorByType(selectedNotification.type)} shadow-lg`}>
                  {getIconByType(selectedNotification.type)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {getTypeLabel(selectedNotification.type)}
                  </p>
                  <h3 className="text-xl font-bold text-soft-black">{selectedNotification.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(selectedNotification.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                      {getAudienceLabel(selectedNotification)}
                    </span>
                    {selectedNotification.sender && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                        {t('notificationsPage.sentBy', 'Sent by')} {selectedNotification.sender.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-4 whitespace-pre-line leading-relaxed">
                {selectedNotification.content}
              </p>

              {selectedNotification.link_url && (
                <a
                  href={selectedNotification.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-yellow hover:text-accent-purple"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('notificationsPage.openLink', 'Open related link')}
                </a>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                {!selectedNotification.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsRead(selectedNotification.id)}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-accent-yellow hover:text-accent-purple text-sm font-semibold"
                  >
                    {t('notificationsPage.markAsRead', 'Mark as read')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 rounded-xl bg-soft-black text-white text-sm font-semibold hover:bg-accent-yellow"
                >
                  {t('notificationsPage.close', 'Close')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default Notifications
