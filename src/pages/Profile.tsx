import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Heart, MapPin, Settings, LogOut, Edit, Star } from 'lucide-react'
import { toast } from 'sonner'
// import { supabase } from '@/lib/supabase' // 移除数据库依赖
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface UserStats {
  posCount: number
  reviewCount: number
  favoriteCount: number
}

interface FavoritePOS {
  id: string
  pos_machines: {
    id: string
    name: string
    merchant_name: string
    address: string
    average_rating?: number
  } | null
}

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({ posCount: 0, reviewCount: 0, favoriteCount: 0 })
  const [favorites, setFavorites] = useState<FavoritePOS[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' })
  const [updating, setUpdating] = useState(false)

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
      // 使用模拟数据，移除数据库依赖
      setStats({
        posCount: Math.floor(Math.random() * 10) + 1, // 1-10个POS机
        reviewCount: Math.floor(Math.random() * 20) + 5, // 5-25个评论
        favoriteCount: Math.floor(Math.random() * 8) + 2 // 2-10个收藏
      })
      
      // 模拟收藏的POS机数据
      const mockFavorites: FavoritePOS[] = [
        {
          id: '1',
          pos_machines: {
            id: '1',
            name: '星巴克POS机',
            merchant_name: '星巴克咖啡',
            address: '北京市朝阳区建国门外大街1号',
            average_rating: 4.5
          }
        },
        {
          id: '2',
          pos_machines: {
            id: '2',
            name: '麦当劳POS机',
            merchant_name: '麦当劳',
            address: '北京市朝阳区三里屯路19号',
            average_rating: 4.2
          }
        }
      ]
      
      setFavorites(mockFavorites)
      
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
      // 模拟更新操作，移除数据库依赖
      // 在实际应用中，这里会更新本地用户状态
      
      toast.success('个人信息更新成功')
      setShowEditModal(false)
      
      // 模拟延迟后重新加载数据
      setTimeout(() => {
        loadUserData()
      }, 500)
      
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

  const removeFavorite = async (favoriteId: string) => {
    try {
      // 模拟删除操作，移除数据库依赖
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
                  <CardTitle className="text-xl">
                    {user.user_metadata?.display_name || user.email?.split('@')[0] || '用户'}
                  </CardTitle>
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
                  onClick={() => navigate('/favorites')}
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
                  onClick={() => navigate('/map')}
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
                        onClick={() => navigate(`/pos/${favorite.pos_machines!.id}`)}
                      >
                        <h4 className="font-medium text-gray-900">{favorite.pos_machines.name}</h4>
                        <p className="text-sm text-gray-600">{favorite.pos_machines.merchant_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{favorite.pos_machines.address}</p>
                        {favorite.pos_machines.average_rating && (
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="flex">
                              {renderStars(Math.round(favorite.pos_machines.average_rating))}
                            </div>
                            <span className="text-xs text-gray-600">
                              {favorite.pos_machines.average_rating.toFixed(1)}
                            </span>
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
            <Button
              onClick={() => navigate('/add-pos')}
              variant="outline"
              className="w-full justify-start"
            >
              <MapPin className="w-4 h-4 mr-3" />
              添加POS机
            </Button>
            
            <Button
              onClick={() => navigate('/my-pos')}
              variant="outline"
              className="w-full justify-start"
            >
              <Edit className="w-4 h-4 mr-3" />
              我的POS机
            </Button>
            
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="w-full justify-start"
            >
              <Settings className="w-4 h-4 mr-3" />
              设置
            </Button>
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
      <Modal
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
      </Modal>
    </div>
  )
}

export default Profile