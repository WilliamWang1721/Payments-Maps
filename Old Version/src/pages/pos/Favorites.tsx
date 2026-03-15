import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Heart, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getErrorDetails, notify } from '@/lib/notify'
import { getPOSStatusDotClass, getPOSStatusLabel } from '@/lib/posStatus'
import FullScreenLoading from '@/components/ui/FullScreenLoading'
import { useUserPOSStore } from '@/stores/useUserPOSStore'
import { useAsyncAction } from '@/hooks/useAsyncAction'

const Favorites: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const favorites = useUserPOSStore((state) => state.favorites)
  const loading = useUserPOSStore((state) => state.favoritesLoading)
  const loaded = useUserPOSStore((state) => state.favoritesLoaded)
  const favoritesError = useUserPOSStore((state) => state.favoritesError)
  const loadFavorites = useUserPOSStore((state) => state.loadFavorites)
  const removeFavoriteById = useUserPOSStore((state) => state.removeFavorite)
  const resetUserPOSState = useUserPOSStore((state) => state.reset)
  const { loading: removingFavorite, run: runRemoveFavorite } = useAsyncAction()

  const fetchFavorites = useCallback(async () => {
    if (!user) return

    try {
      await loadFavorites(user.id)
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      notify.critical('加载失败，请重试', {
        title: '加载收藏列表失败',
        details: getErrorDetails(error),
      })
    }
  }, [loadFavorites, user])

  useEffect(() => {
    if (user) {
      void fetchFavorites()
    } else {
      resetUserPOSState()
      navigate('/login')
    }
  }, [fetchFavorites, navigate, resetUserPOSState, user])

  const removeFavorite = async (favoriteId: string, posName: string) => {
    const removed = await runRemoveFavorite(() => removeFavoriteById(favoriteId), {
      logLabel: '取消收藏失败',
      feedback: 'critical',
      errorMessage: '取消收藏失败，请重试',
      errorTitle: '取消收藏失败',
    })
    if (removed === null) return
    notify.success(`已取消收藏 "${posName}"`)
  }

  if (loading || !loaded) {
    return <FullScreenLoading message="加载中..." />
  }

  const validFavorites = favorites.filter((favorite) => favorite.pos_machines)
  const hasInitialLoadError = Boolean(favoritesError) && validFavorites.length === 0
  const hasOnlyInvalidFavorites = !hasInitialLoadError && favorites.length > 0 && validFavorites.length === 0

  const formatFavoriteDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '未知日期'
    return date.toLocaleDateString('zh-CN')
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
        {hasInitialLoadError ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">收藏列表加载失败</h3>
              <p className="text-gray-600 mb-6">{favoritesError}</p>
              <button
                onClick={() => void fetchFavorites()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          </div>
        ) : hasOnlyInvalidFavorites ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">收藏数据暂不可用</h3>
              <p className="text-gray-600 mb-6">部分收藏对应的 POS 记录已失效，请刷新后重试。</p>
              <button
                onClick={() => void fetchFavorites()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                刷新收藏
              </button>
            </div>
          </div>
        ) : validFavorites.length === 0 ? (
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
            {validFavorites.map((favorite) => {
              const pos = favorite.pos_machines
              if (!pos) return null
              return (
                <div key={favorite.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Status and Remove Button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getPOSStatusDotClass(pos.status)}`}></div>
                        <span className="text-sm text-gray-600">{getPOSStatusLabel(pos.status)}</span>
                      </div>
                      <button
                        onClick={() => removeFavorite(favorite.id, pos.merchant_name)}
                        disabled={removingFavorite}
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
                      收藏于 {formatFavoriteDate(favorite.created_at)}
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
