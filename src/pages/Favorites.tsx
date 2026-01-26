import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Heart, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase, type POSMachine } from '@/lib/supabase'
import { getErrorDetails, notify } from '@/lib/notify'

interface FavoriteWithPOS {
  id: string
  user_id: string
  pos_id: string
  created_at: string
  pos_machines: {
    id: string
    merchant_name: string
    address: string
    latitude: number
    longitude: number
    basic_info: any
    status: string
    created_at: string
  } | null
}

const Favorites: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [favorites, setFavorites] = useState<FavoriteWithPOS[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadFavorites()
    } else {
      navigate('/login')
    }
  }, [user, navigate])

  const loadFavorites = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          user_id,
          pos_id,
          created_at,
          pos_machines (
            id,
            merchant_name,
            address,
            latitude,
            longitude,
            basic_info,
            status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('加载收藏列表失败:', error)
        notify.critical('加载失败，请重试', {
          title: '加载收藏列表失败',
          details: getErrorDetails(error),
        })
        return
      }

      // 处理数据结构，pos_machines可能是数组
      const processedData = (data || []).map(item => ({
        ...item,
        pos_machines: Array.isArray(item.pos_machines) ? item.pos_machines[0] : item.pos_machines
      }))
      setFavorites(processedData as FavoriteWithPOS[])
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      notify.critical('加载失败，请重试', {
        title: '加载收藏列表失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (favoriteId: string, posName: string) => {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId)

      if (error) {
        console.error('取消收藏失败:', error)
        notify.error('取消收藏失败，请重试')
        return
      }

      notify.success(`已取消收藏 "${posName}"`)
      loadFavorites() // 重新加载列表
    } catch (error) {
      console.error('取消收藏失败:', error)
      notify.error('取消收藏失败，请重试')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      case 'maintenance':
        return 'bg-orange-500'
      case 'disabled':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '正常运行'
      case 'inactive':
        return '暂时不可用'
      case 'maintenance':
        return '维修中'
      case 'disabled':
        return '已停用'
      default:
        return '未知状态'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">我的收藏</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有收藏的POS机</h3>
              <p className="text-gray-600 mb-6">在POS机详情页点击收藏按钮来添加收藏</p>
              <button
                onClick={() => navigate('/app/map')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                去发现POS机
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const pos = favorite.pos_machines
              return (
                <div key={favorite.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Status and Remove Button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(pos.status || 'active')}`}></div>
                        <span className="text-sm text-gray-600">{getStatusText(pos.status || 'active')}</span>
                      </div>
                      <button
                        onClick={() => removeFavorite(favorite.id, pos.merchant_name)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="取消收藏"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </div>

                    {/* POS Info */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {pos.merchant_name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {pos.address}
                      </p>
                      {pos.basic_info?.model && (
                        <p className="text-gray-600 text-sm">
                          型号: {pos.basic_info.model}
                        </p>
                      )}
                    </div>

                    {/* Basic Info */}
                    {pos.basic_info?.acquiring_institution && (
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <span>收单机构: {pos.basic_info.acquiring_institution}</span>
                      </div>
                    )}

                    {/* Favorite Time */}
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      收藏于 {new Date(favorite.created_at).toLocaleDateString('zh-CN')}
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => navigate(`/app/pos/${pos.id}`)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Favorites
