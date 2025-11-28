import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Bell, CheckCircle, Clock, MessageSquare, Tag } from 'lucide-react'

interface NotificationItem {
  id: number
  type: 'message' | 'alert' | 'promo' | 'success'
  title: string
  description: string
  time: string
  isUnread: boolean
}

const notificationsData: NotificationItem[] = [
  {
    id: 1,
    type: 'message',
    title: 'Payments Maps 团队',
    description: '欢迎加入 Beta 计划！现在可以添加和编辑 POS 机。',
    time: '2 分钟前',
    isUnread: true
  },
  {
    id: 2,
    type: 'promo',
    title: '新增品牌: 星巴克支付专区',
    description: '北京、上海地区新增 32 家门店，支持 Apple Pay 与银联闪付。',
    time: '1 小时前',
    isUnread: true
  },
  {
    id: 3,
    type: 'alert',
    title: '系统更新通知',
    description: '今晚 02:00-02:30 期间将进行数据库维护，短暂影响检索功能。',
    time: '5 小时前',
    isUnread: false
  },
  {
    id: 4,
    type: 'success',
    title: '审核通过',
    description: '您提交的 POS 机 “三里屯太古里 - 711” 已通过人工审核。',
    time: '昨天',
    isUnread: false
  },
  {
    id: 5,
    type: 'message',
    title: '社区贡献者 Lily',
    description: '感谢补充杭州西湖银泰门店的支付信息，更多门店等你探索！',
    time: '2 天前',
    isUnread: false
  }
]

const getIconByType = (type: NotificationItem['type']) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="w-5 h-5 text-white" />
    case 'promo':
      return <Tag className="w-5 h-5 text-white" />
    case 'alert':
      return <AlertCircle className="w-5 h-5 text-white" />
    case 'success':
      return <CheckCircle className="w-5 h-5 text-white" />
    default:
      return <Bell className="w-5 h-5 text-white" />
  }
}

const getColorByType = (type: NotificationItem['type']) => {
  switch (type) {
    case 'message':
      return 'bg-accent-yellow shadow-blue-500/30'
    case 'promo':
      return 'bg-accent-purple shadow-purple-500/30'
    case 'alert':
      return 'bg-orange-400 shadow-orange-500/30'
    case 'success':
      return 'bg-accent-salmon shadow-teal-500/30'
    default:
      return 'bg-gray-400'
  }
}

const Notifications = () => {
  const { t } = useTranslation()

  const unreadNotifications = useMemo(
    () => notificationsData.filter((item) => item.isUnread),
    []
  )
  const earlierNotifications = useMemo(
    () => notificationsData.filter((item) => !item.isUnread),
    []
  )
  const unreadCount = unreadNotifications.length

  return (
    <div className="flex-1 flex flex-col bg-white rounded-[32px] shadow-soft border border-white/60 overflow-hidden animate-fade-in-up min-h-[520px]">
      <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-soft-black tracking-tight">
            {t('notificationsPage.title', 'Notifications')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? t('notificationsPage.unread', { count: unreadCount, defaultValue: 'You have {{count}} unread messages' })
              : t('notificationsPage.caughtUp', 'You are all caught up')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="text-xs font-semibold text-accent-yellow hover:text-accent-purple transition-colors bg-blue-50 px-4 py-2 rounded-xl"
          >
            {t('notificationsPage.markAll', 'Mark all as read')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar space-y-10">
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t('notificationsPage.newSection', 'New')}
          </h2>
          {unreadNotifications.length === 0 ? (
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
                >
                  <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${getColorByType(item.type)} group-hover:scale-105 transition-transform duration-300`}>
                    {getIconByType(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="text-sm font-bold text-soft-black group-hover:text-accent-yellow transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
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
          {earlierNotifications.length === 0 ? (
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
                >
                  <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow ${getColorByType(item.type)} opacity-80 group-hover:opacity-100 transition-opacity`}>
                    {getIconByType(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-gray-700">{item.title}</h3>
                      <span className="text-[10px] text-gray-400 font-medium">{item.time}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Notifications
