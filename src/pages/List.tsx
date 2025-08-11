import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, MapPin, Star, Plus } from 'lucide-react'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import Modal from '@/components/ui/Modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { POSMachine } from '@/lib/supabase'
import PaymentIcon from '@/components/icons/PaymentIcon'

interface POSMachineWithStats extends POSMachine {
  distance?: number
  average_rating?: number
  review_count?: number
}

const List = () => {
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance')
  
  const {
    posMachines,
    currentLocation,
    loading,
    searchKeyword,
    filters,
    loadPOSMachines,
    setSearchKeyword,
    setFilters,
    getCurrentLocation,
  } = useMapStore()
  
  const { user } = useAuthStore()

  useEffect(() => {
    loadPOSMachines()
    if (!currentLocation) {
      getCurrentLocation().catch(() => {
        console.warn('无法获取当前位置')
      })
    }
  }, [])

  // 处理搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      await loadPOSMachines()
      return
    }
    // 这里可以实现搜索逻辑
    await loadPOSMachines()
  }

  // 计算距离的辅助函数
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 计算距离并排序
  const sortedPOSMachines = [...posMachines].sort((a: POSMachineWithStats, b: POSMachineWithStats) => {
    if (sortBy === 'distance' && currentLocation) {
      const distanceA = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        a.latitude,
        a.longitude
      )
      const distanceB = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        b.latitude,
        b.longitude
      )
      return distanceA - distanceB
    }
    
    if (sortBy === 'rating') {
      return (b.average_rating || 0) - (a.average_rating || 0)
    }
    
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }
    
    return 0
  })

  // 格式化距离
  const formatDistance = (pos: POSMachineWithStats) => {
    if (!currentLocation) return ''
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      pos.latitude,
      pos.longitude
    )
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  // 渲染评分星星
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
        <Loading size="lg" text="正在加载数据..." />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 搜索和筛选栏 */}
      <div className="bg-white p-4 shadow-sm border-b">
        <div className="flex space-x-2 mb-3">
          <div className="flex-1">
            <Input
              placeholder="搜索POS机或商户..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            size="sm"
            className="px-3"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setShowFilters(true)}
            variant="outline"
            size="sm"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 排序选项 */}
        <div className="flex space-x-2">
          <span className="text-sm text-gray-600 self-center">排序：</span>
          <Button
            onClick={() => setSortBy('distance')}
            variant={sortBy === 'distance' ? 'primary' : 'outline'}
            size="sm"
          >
            距离
          </Button>
          <Button
            onClick={() => setSortBy('rating')}
            variant={sortBy === 'rating' ? 'primary' : 'outline'}
            size="sm"
          >
            评分
          </Button>
          <Button
            onClick={() => setSortBy('name')}
            variant={sortBy === 'name' ? 'primary' : 'outline'}
            size="sm"
          >
            名称
          </Button>
        </div>
      </div>

      {/* POS机列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedPOSMachines.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无POS机数据</h3>
            <p className="text-gray-600 mb-4">附近还没有POS机信息，快来添加第一个吧！</p>
            {user && (
              <Button onClick={() => navigate('/add-pos')}>
                <Plus className="w-4 h-4 mr-2" />
                添加POS机
              </Button>
            )}
          </div>
        ) : (
          sortedPOSMachines.map((pos: POSMachineWithStats) => (
            <Card
              key={pos.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/pos/${pos.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{pos.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {pos.merchant_name}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    {currentLocation && (
                      <span className="text-sm text-gray-600">
                        {formatDistance(pos)}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {pos.address}
                  </p>
                  
                  {/* 评分 */}
                  {pos.average_rating && (
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {renderStars(Math.round(pos.average_rating))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {pos.average_rating.toFixed(1)} ({pos.review_count || 0}条评价)
                      </span>
                    </div>
                  )}
                  
                  {/* 支付方式标签 */}
                  {pos.basic_info && (
                    <div className="flex flex-wrap gap-1">
                      {pos.basic_info.supports_apple_pay && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          <PaymentIcon type="apple_pay" size={14} className="mr-1" />Apple Pay
                        </span>
                      )}
                      {pos.basic_info.supports_google_pay && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          <PaymentIcon type="google_pay" size={14} className="mr-1" />Google Pay
                        </span>
                      )}
                      {pos.basic_info.supports_foreign_cards && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          <PaymentIcon type="foreign_cards" size={14} className="mr-1" />外卡支持
                        </span>
                      )}
                      {pos.basic_info.supports_contactless && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                          <PaymentIcon type="contactless" size={14} className="mr-1" />闪付
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 筛选弹窗 */}
      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="筛选条件"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">支付方式</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.supportsApplePay || false}
                  onChange={(e) => setFilters({ supportsApplePay: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm"><PaymentIcon type="apple_pay" size={14} className="mr-1" />Apple Pay</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.supportsGooglePay || false}
                  onChange={(e) => setFilters({ supportsGooglePay: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm"><PaymentIcon type="google_pay" size={14} className="mr-1" />Google Pay</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.supportsForeignCards || false}
                  onChange={(e) => setFilters({ supportsForeignCards: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">外卡支持</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.supportsContactless || false}
                  onChange={(e) => setFilters({ supportsContactless: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">闪付支持</span>
              </label>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setFilters({})
                setShowFilters(false)
                loadPOSMachines()
              }}
              variant="outline"
              className="flex-1"
            >
              重置
            </Button>
            <Button
              onClick={() => {
                setShowFilters(false)
                loadPOSMachines()
              }}
              className="flex-1"
            >
              应用
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default List