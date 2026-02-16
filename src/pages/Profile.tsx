import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Crown,
  Edit3,
  Heart,
  Loader,
  LogOut,
  MapPin,
  Shield,
  Archive,
  Users,
  User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import AnimatedModal from '@/components/ui/AnimatedModal'
import Input from '@/components/ui/Input'
import { usePermissions, type UserRole } from '@/hooks/usePermissions'
import { listDrafts } from '@/lib/drafts'
import { getErrorDetails, notify } from '@/lib/notify'

interface UserStats {
  posCount: number
  reviewCount: number
  favoriteCount: number
}

interface FavoritePOS {
  id: string
  pos_machines: {
    id: string
    merchant_name: string
    address: string
    basic_info?: {
      acquiring_institution?: string
    }
  } | null
}

interface HistoryPreview {
  id: string
  visited_at: string
  pos_machines: {
    id: string
    merchant_name: string
    address: string
  } | null
}

interface ContributionItem {
  id: string
  merchant_name: string
  address?: string | null
  status: string
  created_at: string
}

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const permissions = usePermissions()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({ posCount: 0, reviewCount: 0, favoriteCount: 0 })
  const [favorites, setFavorites] = useState<FavoritePOS[]>([])
  const [historyPreview, setHistoryPreview] = useState<HistoryPreview[]>([])
  const [historyCount, setHistoryCount] = useState(0)
  const [contributions, setContributions] = useState<ContributionItem[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' })
  const [updating, setUpdating] = useState(false)
  const [draftCount, setDraftCount] = useState(0)

  const loadUserData = useCallback(async () => {
    if (!user) return

    try {
      const [
        posCountResult,
        reviewCountResult,
        favoritesResult,
        historyCountResult,
        historyPreviewResult,
        contributionsResult
      ] = await Promise.all([
        supabase
          .from('pos_machines')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('favorites')
          .select(`
            id,
            pos_machines (
              id,
              merchant_name,
              address,
              basic_info
            )
          `)
          .eq('user_id', user.id)
          .limit(5),
        supabase
          .from('user_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('user_history')
          .select(`
            id,
            visited_at,
            pos_machines (
              id,
              merchant_name,
              address
            )
          `)
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false })
          .limit(3),
        supabase
          .from('pos_machines')
          .select('id, merchant_name, address, status, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
      ])

      setStats({
        posCount: posCountResult.count || 0,
        reviewCount: reviewCountResult.count || 0,
        favoriteCount: favoritesResult.data?.length || 0
      })

      const formattedFavorites: FavoritePOS[] = (favoritesResult.data || []).map((fav) => {
        const posMachine = Array.isArray(fav.pos_machines) ? fav.pos_machines[0] : fav.pos_machines
        return {
          id: fav.id,
          pos_machines: posMachine
        }
      })

      setFavorites(formattedFavorites)
      setHistoryCount(historyCountResult.count || 0)

      const formattedHistory: HistoryPreview[] = (historyPreviewResult.data || []).map((item) => ({
        id: item.id,
        visited_at: item.visited_at,
        pos_machines: Array.isArray(item.pos_machines) ? item.pos_machines[0] : item.pos_machines
      }))

      setHistoryPreview(formattedHistory)

      const formattedContributions: ContributionItem[] = (contributionsResult.data || []).map((item) => ({
        id: item.id,
        merchant_name: item.merchant_name,
        address: item.address,
        status: item.status,
        created_at: item.created_at
      }))

      setContributions(formattedContributions)

      setEditForm({
        display_name: user.user_metadata?.display_name || user.email || '用户',
        bio: user.user_metadata?.bio || '这个人很低调，还没有填写个人简介。'
      })
    } catch (error) {
      console.error('加载用户数据失败:', error)
      notify.critical('加载数据失败', {
        title: '加载用户数据失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    loadUserData()
    setDraftCount(listDrafts().length)
  }, [user, navigate, loadUserData])

  const handleUpdateProfile = async () => {
    if (!user) return

    setUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: editForm.display_name,
          bio: editForm.bio
        }
      })

      if (error) {
        console.error('更新用户信息失败:', error)
        notify.error('更新失败，请重试')
        return
      }

      notify.success('个人信息更新成功')
      setShowEditModal(false)
      loadUserData()
    } catch (error) {
      console.error('更新个人信息失败:', error)
      notify.error('更新失败，请重试')
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('退出登录失败:', error)
      notify.error('退出失败，请重试')
    }
  }

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id)

      if (error) {
        console.error('取消收藏失败:', error)
        notify.error('取消收藏失败，请重试')
        return
      }

      setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId))
      setStats((prev) => ({ ...prev, favoriteCount: Math.max(0, prev.favoriteCount - 1) }))
      notify.success('已取消收藏')
    } catch (error) {
      console.error('取消收藏失败:', error)
      notify.error('操作失败，请重试')
    }
  }

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return {
          label: '超级管理员',
          icon: Crown,
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        }
      case 'admin':
        return {
          label: '管理员',
          icon: Shield,
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
        }
      case 'beta':
        return {
          label: 'Beta用户',
          icon: Users,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        }
      case 'regular':
      default:
        return {
          label: '普通用户',
          icon: User,
          color: 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) return `${diffDays}天前`
    if (diffHours > 0) return `${diffHours}小时前`
    if (diffMinutes > 0) return `${diffMinutes}分钟前`
    return '刚刚'
  }

  const getContributionStatusMeta = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: '已发布',
          color: 'text-green-600 bg-green-50',
          Icon: CheckCircle
        }
      case 'maintenance':
        return {
          label: '维护中',
          color: 'text-orange-600 bg-orange-50',
          Icon: Loader
        }
      case 'disabled':
        return {
          label: '已停用',
          color: 'text-red-600 bg-red-50',
          Icon: Shield
        }
      case 'inactive':
        return {
          label: '待启用',
          color: 'text-gray-600 bg-gray-100',
          Icon: Loader
        }
      default:
        return {
          label: '审核中',
          color: 'text-blue-600 bg-blue-50',
          Icon: Loader
        }
    }
  }

  const displayName = useMemo(() => {
    if (!user) return '用户'
    return user.user_metadata?.display_name || user.email?.split('@')[0] || '用户'
  }, [user])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading size="lg" text="正在加载..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const roleInfo = getRoleInfo(permissions.role)
  const RoleIcon = roleInfo.icon
  const isAdminUser = !permissions.isLoading && (permissions.role === 'admin' || permissions.role === 'super_admin')

  const collectionCards = [
    {
      title: '我的收藏',
      description: `${stats.favoriteCount} 个地点`,
      icon: Heart,
      accent: 'bg-red-50 text-red-500',
      action: () => navigate('/app/favorites')
    },
    {
      title: '浏览历史',
      description: `${historyCount} 条足迹`,
      icon: Clock,
      accent: 'bg-blue-50 text-blue-500',
      action: () => navigate('/app/history')
    },
    {
      title: '我的POS',
      description: `${stats.posCount} 次贡献`,
      icon: MapPin,
      accent: 'bg-green-50 text-green-500',
      action: () => navigate('/app/my-pos')
    },
    {
      title: '草稿箱',
      description: `${draftCount} 个草稿`,
      icon: Archive,
      accent: 'bg-purple-50 text-purple-500',
      action: () => navigate('/app/drafts')
    }
  ]

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-24">
      <div className="space-y-8">
        <section className="bg-white rounded-[32px] shadow-soft border border-white/60 overflow-hidden animate-fade-in-up">
          <div className="relative h-48 w-full bg-gradient-to-r from-accent-yellow via-accent-purple to-indigo-500">
            <div className="absolute inset-0 bg-pattern opacity-10" aria-hidden="true" />
            <div className="absolute -bottom-16 left-6 sm:left-12 flex items-end gap-4 sm:gap-6">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="头像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-soft-black">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute bottom-2 right-2 bg-cream p-2 rounded-full shadow-md hover:bg-white transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-soft-black" />
                </button>
              </div>
              <div className="mb-4 hidden sm:block text-white">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold px-4 py-1 rounded-full bg-white/80 text-soft-black shadow-sm backdrop-blur-sm">
                    {displayName}
                  </h1>
                  {!permissions.isLoading && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {roleInfo.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/80">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="mt-20 px-6 sm:px-12 pb-12 space-y-8">
            <div className="sm:hidden text-soft-black">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {!permissions.isLoading && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {roleInfo.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-cream rounded-3xl p-6 shadow-sm border border-white">
              <div className="text-center">
                <div className="text-2xl font-bold text-soft-black">{stats.posCount}</div>
                <div className="text-xs text-gray-500 tracking-wide">添加的 POS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-soft-black">{stats.reviewCount}</div>
                <div className="text-xs text-gray-500 tracking-wide">评价</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-soft-black">{stats.favoriteCount}</div>
                <div className="text-xs text-gray-500 tracking-wide">收藏</div>
              </div>
            </div>

          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-stretch">
          <div className="space-y-8 xl:col-span-3 flex flex-col">
            <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-soft-black">我的空间</h3>
                  <p className="text-sm text-gray-500">把常用的入口收纳到收藏夹</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => navigate('/app/favorites')}
                >
                  {isAdminUser ? '查看收藏' : '管理收藏'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {collectionCards.map(({ title, description, icon: Icon, accent, action }) => (
                  <button
                    key={title}
                    onClick={action}
                    className="bg-cream rounded-3xl p-5 text-left border border-transparent hover:border-accent-yellow transition-all group shadow-sm"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${accent} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{title}</p>
                    <p className="text-lg font-semibold text-soft-black">{description}</p>
                    <div className="flex items-center text-xs text-accent-yellow font-semibold mt-4">
                      查看详情
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-soft-black">最近收藏</h3>
                  <p className="text-sm text-gray-500">最常用的 POS 机随时出发</p>
                </div>
                {favorites.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/favorites')}>
                    查看全部
                  </Button>
                )}
              </div>

              {favorites.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">还没有收藏任何 POS 机</p>
                  <Button onClick={() => navigate('/app/map')} className="mt-4">
                    去发现
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  {favorites.map((favorite) => {
                    if (!favorite.pos_machines) return null
                    return (
                      <div
                        key={favorite.id}
                        className="flex items-start justify-between p-4 rounded-3xl border border-gray-100 hover:border-accent-yellow hover:bg-cream transition-colors"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/app/pos/${favorite.pos_machines!.id}`)}
                        >
                          <h4 className="text-base font-semibold text-soft-black">{favorite.pos_machines.merchant_name}</h4>
                          <p className="text-sm text-gray-600 line-clamp-1">{favorite.pos_machines.address}</p>
                          {favorite.pos_machines.basic_info?.acquiring_institution && (
                            <p className="text-xs text-gray-500 mt-1">
                              收单机构：{favorite.pos_machines.basic_info.acquiring_institution}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removeFavorite(favorite.id)}
                        >
                          取消
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8 xl:col-span-2 flex flex-col">
            <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-soft-black">浏览历史</h3>
                  <p className="text-sm text-gray-500">最近查看的 POS 机</p>
                </div>
                {historyCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/history')}>
                    查看全部
                  </Button>
                )}
              </div>

              {historyPreview.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">暂无浏览记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyPreview.map((item) => (
                    <button
                      key={item.id}
                      className="w-full flex items-center justify-between p-4 rounded-3xl border border-gray-100 hover:bg-cream transition-colors text-left"
                      onClick={() => item.pos_machines && navigate(`/app/pos/${item.pos_machines.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-soft-black">{item.pos_machines?.merchant_name || '未知商户'}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1">{item.pos_machines?.address || '暂无地址信息'}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{formatRelativeTime(item.visited_at)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-soft-black">我的贡献</h3>
                  <p className="text-sm text-gray-500">最近提交的 POS 机审核进度</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/app/my-pos')}>
                  {isAdminUser ? '查看全部' : '管理 POS 机'}
                </Button>
              </div>

              {contributions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">还没有贡献记录，去添加一台 POS 机吧！</p>
                  {permissions.canAdd && (
                    <Button className="mt-4" onClick={() => navigate('/app/add-pos')}>
                      立即添加
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  {contributions.map((item) => {
                    const meta = getContributionStatusMeta(item.status)
                    const StatusIcon = meta.Icon
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-4 rounded-3xl border border-gray-100 hover:border-accent-yellow hover:bg-cream transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-soft-black">{item.merchant_name || '未命名商户'}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{item.address || '暂无地址信息'}</p>
                            <span className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {meta.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8">
          <Button
            variant="outline"
            className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </section>
      </div>

      <AnimatedModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑个人信息"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="显示名称"
            value={editForm.display_name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
            placeholder="请输入显示名称"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="介绍一下自己..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowEditModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateProfile}
              loading={updating}
              className="flex-1"
            >
              保存
            </Button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  )
}

export default Profile
