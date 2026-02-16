import { ArrowUpRight, Bell, BookOpen, Cpu, Heart, List, MapPin, Shield, Tag, Users, type LucideIcon } from 'lucide-react'
import type { UserRole } from '@/hooks/usePermissions'

interface AdminMenuItem {
  id: string
  title: string
  description: string
  to: string
  icon: LucideIcon
  roles?: UserRole[]
}

interface AdminMainMenuProps {
  role: UserRole
  onNavigate: (path: string) => void
}

const menuItems: AdminMenuItem[] = [
  {
    id: 'role-management',
    title: '用户与角色管理',
    description: '管理用户角色、默认地点与 Beta 激活码',
    to: '/app/role-management',
    icon: Users,
    roles: ['super_admin', 'admin']
  },
  {
    id: 'notifications',
    title: '通知管理',
    description: '发布系统广播与运营通知',
    to: '/app/notifications',
    icon: Bell
  },
  {
    id: 'mcp',
    title: 'MCP 连接管理',
    description: '管理 Claude Desktop 连接和权限',
    to: '/app/mcp-settings',
    icon: Cpu
  },
  {
    id: 'brands',
    title: '品牌库管理',
    description: '维护卡组织与发卡品牌信息',
    to: '/app/brands',
    icon: Tag
  },
  {
    id: 'card-album',
    title: '卡册管理',
    description: '处理卡片内容编辑与反馈',
    to: '/app/card-album',
    icon: BookOpen
  },
  {
    id: 'favorites',
    title: '收藏管理',
    description: '统一管理收藏入口',
    to: '/app/favorites',
    icon: Heart
  },
  {
    id: 'my-pos',
    title: 'POS 管理',
    description: '查看和管理贡献记录',
    to: '/app/my-pos',
    icon: MapPin
  },
  {
    id: 'list',
    title: '列表巡检',
    description: '在列表视图执行批量处理',
    to: '/app/list',
    icon: List
  }
]

const AdminMainMenu = ({ role, onNavigate }: AdminMainMenuProps) => {
  return (
    <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-soft-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-yellow" />
            管理主菜单
          </h3>
          <p className="text-sm text-gray-500 mt-1">管理员入口已统一收纳到管理中心页面</p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-accent-yellow/10 text-accent-yellow">
          {role === 'super_admin' ? '超级管理员' : '管理员'}
        </span>
      </div>

      <div className="space-y-3">
        {menuItems.map((item) => {
          const isDisabled = Boolean(item.roles && !item.roles.includes(role))
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onNavigate(item.to)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
                  : 'border-gray-100 hover:border-accent-yellow hover:bg-cream cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDisabled ? 'bg-gray-100 text-gray-400' : 'bg-cream text-accent-yellow'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isDisabled ? 'text-gray-500' : 'text-soft-black'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    {isDisabled && (
                      <p className="text-[11px] text-gray-400 mt-1">仅超级管理员可访问</p>
                    )}
                  </div>
                </div>
                {!isDisabled && (
                  <ArrowUpRight className="w-4 h-4 text-gray-400 mt-1" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default AdminMainMenu
