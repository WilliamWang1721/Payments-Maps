import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Heart, MapPin, Settings, LogOut, Edit, Star, Shield, Crown, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import AnimatedModal from '@/components/ui/AnimatedModal'
import Input from '@/components/ui/Input'
import { BetaActivationModal } from '@/components/BetaActivationModal'
import { usePermissions, type UserRole } from '@/hooks/usePermissions'

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

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const permissions = usePermissions()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({ posCount: 0, reviewCount: 0, favoriteCount: 0 })
  const [favorites, setFavorites] = useState<FavoritePOS[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' })
  const [updating, setUpdating] = useState(false)
  const [showActivationModal, setShowActivationModal] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    loadUserData()
  }, [user, navigate])

  const loadUserData = async () => {
    if (!user) return
    
    try {
      // 并行查询用户统计数据
      const [posCountResult, reviewCountResult, favoritesResult] = await Promise.all([
        // 查询用户添加的POS机数量
        supabase
          .from('pos_machines')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id),
        
        // 查询用户发表的评价数量
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        
        // 查询用户收藏的POS机（包含POS机详情和评分）
        supabase
          .from('favorites')
          .select(`
            id,
            pos_machines (
              id,
              merchant_name,
              address,
              basic_info,
              reviews (
                rating
              )
            )
          `)
          .eq('user_id', user.id)
          .limit(5)
      ])
      
      // 设置统计数据
      setStats({
        posCount: posCountResult.count || 0,
        reviewCount: reviewCountResult.count || 0,
        favoriteCount: favoritesResult.data?.length || 0
      })
      
      // 设置收藏数据
      const formattedFavorites: FavoritePOS[] = (favoritesResult.data || []).map(fav => {
        const posMachine = fav.pos_machines as any
        
        return {
          id: fav.id,
          pos_machines: {
            id: posMachine?.id,
            merchant_name: posMachine?.merchant_name,
            address: posMachine?.address,
            basic_info: posMachine?.basic_info
          }
        }
      })
      
      setFavorites(formattedFavorites)
      
      // 初始化编辑表单
      setEditForm({
        display_name: user.user_metadata?.display_name || user.email || '用户',
        bio: user.user_metadata?.bio || '这个人很懒，什么都没有留下...'
      })
      
    } catch (error) {
      console.error('加载用户数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    
    setUpdating(true)
    try {
      // 使用Supabase Auth更新用户元数据
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: editForm.display_name,
          bio: editForm.bio
        }
      })
      
      if (error) {
        console.error('更新用户信息失败:', error)
        toast.error('更新失败，请重试')
        return
      }
      
      toast.success('个人信息更新成功')
      setShowEditModal(false)
      
      // 重新加载用户数据以反映更新
      loadUserData()
      
    } catch (error) {
      console.error('更新个人信息失败:', error)
      toast.error('更新失败，请重试')
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
      toast.error('退出失败，请重试')
    }
  }

  const handleActivationSuccess = async () => {
    // 重新加载用户数据和权限
    await loadUserData()
    // 刷新页面以更新权限状态
    window.location.reload()
  }

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return
    
    try {
      // 从数据库删除收藏记录
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('取消收藏失败:', error)
        toast.error('取消收藏失败，请重试')
        return
      }
      
      // 更新本地状态
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId))
      setStats(prev => ({ ...prev, favoriteCount: prev.favoriteCount - 1 }))
      toast.success('已取消收藏')
    } catch (error) {
      console.error('取消收藏失败:', error)
      toast.error('操作失败，请重试')
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      )
    }
    return stars
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-4">
        {/* 用户信息卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="头像"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <CardTitle className="text-xl">
                      {user.user_metadata?.display_name || user.email?.split('@')[0] || '用户'}
                    </CardTitle>
                    {!permissions.isLoading && (() => {
                      const roleInfo = getRoleInfo(permissions.role)
                      const RoleIcon = roleInfo.icon
                      return (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleInfo.label}
                        </span>
                      )
                    })()}
                  </div>
                  <CardDescription>{user.email}</CardDescription>
                  {user.user_metadata?.bio && (
                    <p className="text-sm text-gray-600 mt-1">{user.user_metadata.bio}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setShowEditModal(true)}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* 统计数据 */}
        <Card>
          <CardHeader>
            <CardTitle>我的数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.posCount}</div>
                <div className="text-sm text-gray-600">添加的POS机</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.reviewCount}</div>
                <div className="text-sm text-gray-600">发表的评价</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.favoriteCount}</div>
                <div className="text-sm text-gray-600">收藏的POS机</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 我的收藏 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>我的收藏</CardTitle>
              {favorites.length > 0 && (
                <Button
                  onClick={() => navigate('/app/favorites')}
                  variant="outline"
                  size="sm"
                >
                  查看全部
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">还没有收藏任何POS机</p>
                <Button
                  onClick={() => navigate('/app/map')}
                  className="mt-4"
                  size="sm"
                >
                  去发现
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((favorite) => {
                  if (!favorite.pos_machines) return null
                  
                  return (
                    <div
                      key={favorite.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/app/pos/${favorite.pos_machines!.id}`)}
                      >
                        <h4 className="font-medium text-gray-900">{favorite.pos_machines.merchant_name}</h4>
                        <p className="text-sm text-gray-600">{favorite.pos_machines.merchant_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{favorite.pos_machines.address}</p>
                        {favorite.pos_machines.basic_info?.acquiring_institution && (
                          <div className="text-xs text-gray-600 mt-1">
                            收单机构：{favorite.pos_machines.basic_info.acquiring_institution}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => removeFavorite(favorite.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {permissions.canAdd && (
              <Button
                onClick={() => navigate('/app/add-pos')}
                variant="outline"
                className="w-full justify-start"
              >
                <MapPin className="w-4 h-4 mr-3" />
                添加POS机
              </Button>
            )}
            
            {permissions.canManageRoles && (
              <Button
                onClick={() => navigate('/role-management')}
                variant="outline"
                className="w-full justify-start text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Crown className="w-4 h-4 mr-3" />
                角色管理
              </Button>
            )}
            
            {/* Beta权益激活按钮 - 仅对普通用户显示 */}
            {!permissions.isLoading && permissions.role === 'regular' && (
              <Button
                onClick={() => setShowActivationModal(true)}
                variant="outline"
                className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Zap className="w-4 h-4 mr-3" />
                激活Beta权益
              </Button>
            )}
            
            <Button
              onClick={() => navigate('/app/my-pos')}
              variant="outline"
              className="w-full justify-start"
            >
              <Edit className="w-4 h-4 mr-3" />
              我的POS机
            </Button>
            
            <Button
              onClick={() => navigate('/app/favorites')}
              variant="outline"
              className="w-full justify-start"
            >
              <Heart className="w-4 h-4 mr-3" />
              我的收藏
            </Button>
            
            <Button
              onClick={() => navigate('/app/history')}
              variant="outline"
              className="w-full justify-start"
            >
              <MapPin className="w-4 h-4 mr-3" />
              浏览历史
            </Button>
            
            <Button
              onClick={() => navigate('/app/settings')}
              variant="outline"
              className="w-full justify-start"
            >
              <Settings className="w-4 h-4 mr-3" />
              设置
            </Button>
          </CardContent>
        </Card>

        {/* 致谢板块 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              致谢
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 space-y-3">
              <div>
                <p className="font-medium text-gray-800 mb-1">🙏 感谢开源社区</p>
                <p>感谢所有开源项目的贡献者，让我们能够站在巨人的肩膀上构建这个应用。特别感谢 React、Vite、Tailwind CSS、Supabase 等优秀的开源项目。</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-800 mb-1">❤️ 感谢用户支持</p>
                <p>感谢每一位用户的使用、反馈和建议，你们的支持是我们不断改进的动力。每一条评价、每一个收藏都让这个平台变得更好。</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-800 mb-1">🚀 项目愿景</p>
                <p>我们致力于为大家提供最准确、最实用的支付终端信息，让每一次支付都更加便捷。感谢所有为此目标贡献力量的朋友们！</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 退出登录 */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 编辑个人信息弹窗 */}
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
            onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
            placeholder="请输入显示名称"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              个人简介
            </label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
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

      {/* Beta权益激活弹窗 */}
      <BetaActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        onSuccess={handleActivationSuccess}
      />
    </div>
  )
}

export default Profile