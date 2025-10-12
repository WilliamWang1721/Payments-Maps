import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, MapPin, Star, Plus, CreditCard, Building2, Shield, Settings } from 'lucide-react'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import AnimatedModal from '@/components/ui/AnimatedModal'
import { AnimatedListItem } from '../components/AnimatedListItem'
import { SkeletonCard } from '@/components/AnimatedLoading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { POSMachine } from '@/lib/supabase'
import PaymentIcon from '@/components/icons/PaymentIcon'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import { SearchSuggestions } from '../components/SearchSuggestions'
import { HighlightText } from '../components/HighlightText'
import { toast } from 'sonner'

interface POSMachineWithStats extends POSMachine {
  distance?: number
  review_count?: number
}

const List = () => {
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')
  const [showPOSDetail, setShowPOSDetail] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  
  // 搜索历史功能
  const { searchHistory, addSearchHistory, clearSearchHistory, removeSearchHistory } = useSearchHistory()
  
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
  // 滚动容器引用，用于在数据变化后自动调整 scrollTop，避免出现空白
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
    try {
      await loadPOSMachines()
      if (searchKeyword.trim()) {
        addSearchHistory(searchKeyword)
        toast.success(`搜索"${searchKeyword}"完成`)
      }
      setShowSearchSuggestions(false)
    } catch (error) {
      console.error('搜索失败:', error)
      toast.error('搜索失败，请重试')
    }
  }
  
  // 生成搜索建议
  const generateSearchSuggestions = (keyword: string) => {
    if (!keyword.trim()) {
      setSearchSuggestions([])
      return
    }
    
    const suggestions: string[] = []
    const lowerKeyword = keyword.toLowerCase()
    
    // 基于现有POS机数据生成建议
    posMachines.forEach(pos => {
      if (pos.merchant_name?.toLowerCase().includes(lowerKeyword)) {
        suggestions.push(pos.merchant_name)
      }
      if (pos.address?.toLowerCase().includes(lowerKeyword)) {
        suggestions.push(pos.address)
      }
      if (pos.basic_info?.model?.toLowerCase().includes(lowerKeyword)) {
        suggestions.push(pos.basic_info.model)
      }
      if (pos.basic_info?.acquiring_institution?.toLowerCase().includes(lowerKeyword)) {
        suggestions.push(pos.basic_info.acquiring_institution)
      }
    })
    
    // 去重并限制数量
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5)
    setSearchSuggestions(uniqueSuggestions)
  }
  
  // 选择搜索建议
  const handleSelectSuggestion = (suggestion: string) => {
    setSearchKeyword(suggestion)
    setShowSearchSuggestions(false)
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
      return (b.review_count || 0) - (a.review_count || 0)
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

  // 监听搜索关键词变化，实现实时搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchKeyword !== undefined) {
        handleSearch()
      }
    }, 500) // 500ms防抖
    
    return () => clearTimeout(timeoutId)
  }, [searchKeyword])

  // 当列表长度变化，确保滚动条位置始终在有效范围内
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0)
    if (el.scrollTop > maxScrollTop) {
      el.scrollTop = maxScrollTop
    }
  }, [sortedPOSMachines.length])

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* 搜索和筛选栏骨架 */}
        <div className="bg-white p-4 shadow-sm border-b">
          <div className="space-y-3">
            <div className="flex space-x-2">
              <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-20 h-10 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-20 h-10 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* 列表骨架 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 搜索和筛选栏 */}
      <div className="bg-white p-4 shadow-sm border-b">
        <div className="space-y-3">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="搜索商户、地址或POS机型号..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value)
                  generateSearchSuggestions(e.target.value)
                  setShowSearchSuggestions(true)
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                className="w-full"
              />
              <SearchSuggestions
                searchHistory={searchHistory}
                suggestions={searchSuggestions}
                onSelectSuggestion={handleSelectSuggestion}
                onRemoveHistory={removeSearchHistory}
                onClearHistory={clearSearchHistory}
                isVisible={showSearchSuggestions && (searchHistory.length > 0 || searchSuggestions.length > 0)}
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
          
          {/* 数据条数显示 */}
          <div className="text-sm text-gray-600 text-right">
            目前已有 {sortedPOSMachines.length} 条数据
          </div>
          
          {/* 已选择的筛选条件标签 */}
          {Object.keys(filters).some(key => filters[key as keyof typeof filters]) && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                {filters.supportsApplePay && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Apple Pay
                    <button
                      onClick={() => setFilters({ supportsApplePay: false })}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsGooglePay && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Google Pay
                    <button
                      onClick={() => setFilters({ supportsGooglePay: false })}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsContactless && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    闪付支持
                    <button
                      onClick={() => setFilters({ supportsContactless: false })}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsHCE && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                    HCE 模拟
                    <button
                      onClick={() => setFilters({ supportsHCE: false })}
                      className="ml-1 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsVisa && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Visa
                    <button
                      onClick={() => setFilters({ supportsVisa: false })}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsMastercard && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    Mastercard
                    <button
                      onClick={() => setFilters({ supportsMastercard: false })}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsUnionPay && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    银联
                    <button
                      onClick={() => setFilters({ supportsUnionPay: false })}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsAmex && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    American Express
                    <button
                      onClick={() => setFilters({ supportsAmex: false })}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsJCB && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    JCB
                    <button
                      onClick={() => setFilters({ supportsJCB: false })}
                      className="ml-1 text-yellow-600 hover:text-yellow-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsDiners && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                    Diners Club
                    <button
                      onClick={() => setFilters({ supportsDiners: false })}
                      className="ml-1 text-gray-600 hover:text-gray-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsSmallAmountExemption && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800">
                    小额免密
                    <button
                      onClick={() => setFilters({ supportsSmallAmountExemption: false })}
                      className="ml-1 text-emerald-600 hover:text-emerald-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsPinVerification && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    PIN 验证
                    <button
                      onClick={() => setFilters({ supportsPinVerification: false })}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsSignatureVerification && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-800">
                    签名验证
                    <button
                      onClick={() => setFilters({ supportsSignatureVerification: false })}
                      className="ml-1 text-pink-600 hover:text-pink-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsDCC && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-100 text-cyan-800">
                    DCC 支持
                    <button
                      onClick={() => setFilters({ supportsDCC: false })}
                      className="ml-1 text-cyan-600 hover:text-cyan-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.supportsEDC && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                    EDC 支持
                    <button
                      onClick={() => setFilters({ supportsEDC: false })}
                      className="ml-1 text-teal-600 hover:text-teal-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.acquiringInstitution && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                    {filters.acquiringInstitution}
                    <button
                      onClick={() => setFilters({ acquiringInstitution: undefined })}
                      className="ml-1 text-slate-600 hover:text-slate-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.posModel && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                    {filters.posModel}
                    <button
                      onClick={() => setFilters({ posModel: undefined })}
                      className="ml-1 text-amber-600 hover:text-amber-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setFilters({})}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  清除全部
                </button>
              </div>
            </div>
          )}
          
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

          </div>
        </div>
      </div>

      {/* POS机列表 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedPOSMachines.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无POS机数据</h3>
            <p className="text-gray-600 mb-4">附近还没有POS机信息，快来添加第一个吧！</p>
            {user && (
              <Button onClick={() => navigate('/app/add-pos')}>
                <Plus className="w-4 h-4 mr-2" />
                添加POS机
              </Button>
            )}
          </div>
        ) : (
          sortedPOSMachines.map((pos: POSMachineWithStats, index) => (
            <AnimatedListItem
              key={pos.id}
              index={index}
              direction="up"
              onClick={() => {
                console.log('点击POS卡片，ID:', pos.id)
                navigate(`/app/pos/${pos.id}`)
              }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-xl font-bold">
                        <HighlightText 
                          text={pos.merchant_name} 
                          searchKeyword={searchKeyword}
                        />
                      </CardTitle>
                      {/* POS机状态标识 */}
                      <div className="flex items-center space-x-1">
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            pos.status === 'active' ? 'bg-blue-500' :
                            pos.status === 'inactive' ? 'bg-gray-400' :
                            pos.status === 'maintenance' ? 'bg-orange-500' :
                            pos.status === 'disabled' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}
                        />
                        <span className={`text-xs font-medium ${
                          pos.status === 'active' ? 'text-blue-600' :
                          pos.status === 'inactive' ? 'text-gray-500' :
                          pos.status === 'maintenance' ? 'text-orange-600' :
                          pos.status === 'disabled' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {pos.status === 'active' ? '正常' :
                           pos.status === 'inactive' ? '不可用' :
                           pos.status === 'maintenance' ? '维修中' :
                           pos.status === 'disabled' ? '已停用' :
                           '正常'}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="mt-1 text-sm text-gray-500">
                      <HighlightText 
                        text={pos.address} 
                        searchKeyword={searchKeyword}
                      />
                    </CardDescription>
                    {pos.created_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        添加于 {new Date(pos.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    )}
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
                  {/* POS机型号和收单机构 */}
                  {pos.basic_info?.model && (
                        <div className="text-sm text-gray-600">
                          POS机型号: <HighlightText 
                            text={pos.basic_info.model} 
                            searchKeyword={searchKeyword}
                          />
                        </div>
                      )}
                      {pos.basic_info?.acquiring_institution && (
                        <div className="text-sm text-gray-600">
                          收单机构: <HighlightText 
                            text={pos.basic_info.acquiring_institution} 
                            searchKeyword={searchKeyword}
                          />
                        </div>
                      )}
                  
                  {/* 收单机构信息 */}
                  {pos.basic_info?.acquiring_institution && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">收单机构：</span>{pos.basic_info.acquiring_institution}
                    </div>
                  )}
                  
                  {/* 备注信息 */}
                  {pos.remarks && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="font-medium">备注：</span>{pos.remarks}
                    </div>
                  )}
                  
                  {/* 支付方式标签 - 只显示已填写的信息 */}
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
                      {pos.basic_info.supports_contactless && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                          <PaymentIcon type="contactless" size={14} className="mr-1" />闪付
                        </span>
                      )}
                      {/* 显示卡组织支持（如果有的话） */}
                      {pos.basic_info.supported_card_networks && pos.basic_info.supported_card_networks.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          {pos.basic_info.supported_card_networks.length}种卡组织
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </AnimatedListItem>
          ))
        )}
      </div>

      {/* 筛选弹窗 */}
      <AnimatedModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="筛选条件"
        size="lg"
      >
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {/* 支付方式筛选 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
              支付方式
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsApplePay || false}
                  onChange={(e) => setFilters({ supportsApplePay: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Apple Pay</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsGooglePay || false}
                  onChange={(e) => setFilters({ supportsGooglePay: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Google Pay</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsContactless || false}
                  onChange={(e) => setFilters({ supportsContactless: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">闪付支持</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsHCE || false}
                  onChange={(e) => setFilters({ supportsHCE: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">HCE 模拟</span>
              </label>
            </div>
          </div>
          
          {/* 卡组织筛选 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-green-600" />
              卡组织支持
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsVisa || false}
                  onChange={(e) => setFilters({ supportsVisa: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Visa</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsMastercard || false}
                  onChange={(e) => setFilters({ supportsMastercard: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mastercard</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsUnionPay || false}
                  onChange={(e) => setFilters({ supportsUnionPay: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">银联</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsAmex || false}
                  onChange={(e) => setFilters({ supportsAmex: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">American Express</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsJCB || false}
                  onChange={(e) => setFilters({ supportsJCB: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">JCB</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsDiners || false}
                  onChange={(e) => setFilters({ supportsDiners: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Diners Club</span>
              </label>
            </div>
          </div>
          
          {/* 验证模式筛选 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-600" />
              验证模式
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsSmallAmountExemption || false}
                  onChange={(e) => setFilters({ supportsSmallAmountExemption: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">小额免密</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsPinVerification || false}
                  onChange={(e) => setFilters({ supportsPinVerification: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">PIN 验证</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsSignatureVerification || false}
                  onChange={(e) => setFilters({ supportsSignatureVerification: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">签名验证</span>
              </label>
            </div>
          </div>
          
          {/* 收单模式筛选 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-orange-600" />
              收单模式
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsDCC || false}
                  onChange={(e) => setFilters({ supportsDCC: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">DCC 支持</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.supportsEDC || false}
                  onChange={(e) => setFilters({ supportsEDC: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">EDC 支持</span>
              </label>
            </div>
          </div>
          
          {/* 其他筛选 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-gray-600" />
              其他条件
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  收单机构
                </label>
                <input
                  type="text"
                  value={filters.acquiringInstitution || ''}
                  onChange={(e) => setFilters({ acquiringInstitution: e.target.value || undefined })}
                  placeholder="输入收单机构名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* 设备状态筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设备状态
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ status: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">不限</option>
                  <option value="active">正常运行</option>
                  <option value="inactive">暂时不可用</option>
                  <option value="maintenance">维修中</option>
                  <option value="disabled">已停用</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  POS 机型号
                </label>
                <input
                  type="text"
                  value={filters.posModel || ''}
                  onChange={(e) => setFilters({ posModel: e.target.value || undefined })}
                  placeholder="输入POS机型号"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* 高级筛选 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-600" />
              高级筛选
            </h3>
            
            <div className="space-y-4">
              {/* 评分筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最低评分
                </label>
                <select
                  value={filters.minRating || ''}
                  onChange={(e) => setFilters({ minRating: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">不限</option>
                  <option value="1">1星及以上</option>
                  <option value="2">2星及以上</option>
                  <option value="3">3星及以上</option>
                  <option value="4">4星及以上</option>
                  <option value="5">5星</option>
                </select>
              </div>
              
              {/* 距离筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大距离
                </label>
                <select
                  value={filters.maxDistance || ''}
                  onChange={(e) => setFilters({ maxDistance: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">不限</option>
                  <option value="0.5">500米内</option>
                  <option value="1">1公里内</option>
                  <option value="2">2公里内</option>
                  <option value="5">5公里内</option>
                </select>
              </div>
              
              {/* 收银位置筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  收银位置
                </label>
                <select
                  value={filters.checkoutLocation || ''}
                  onChange={(e) => setFilters({ checkoutLocation: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">不限</option>
                  <option value="自助收银">自助收银</option>
                  <option value="人工收银">人工收银</option>
                </select>
              </div>
              
              {/* 商户类型筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商户类型
                </label>
                <input
                  type="text"
                  value={filters.merchantType || ''}
                  onChange={(e) => setFilters({ merchantType: e.target.value || undefined })}
                  placeholder="输入商户类型"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* 最低免密金额筛选 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最小免密金额
                  </label>
                  <input
                    type="number"
                    value={filters.minAmountNoPin || ''}
                    onChange={(e) => setFilters({ minAmountNoPin: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="最小金额"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大免密金额
                  </label>
                  <input
                    type="number"
                    value={filters.maxAmountNoPin || ''}
                    onChange={(e) => setFilters({ maxAmountNoPin: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="最大金额"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* 其他筛选选项 */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filters.hasRemarks || false}
                    onChange={(e) => setFilters({ hasRemarks: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">有备注信息</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filters.hasReviews || false}
                    onChange={(e) => setFilters({ hasReviews: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">有评价</span>
                </label>
              </div>
              
              {/* 创建时间筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  创建时间
                </label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                      <input
                        type="date"
                        value={filters.createdAfter || ''}
                        onChange={(e) => setFilters({ createdAfter: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                      <input
                        type="date"
                        value={filters.createdBefore || ''}
                        onChange={(e) => setFilters({ createdBefore: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const oneWeekAgo = new Date()
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
                        setFilters({ createdAfter: oneWeekAgo.toISOString().split('T')[0] })
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      最近一周
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const oneMonthAgo = new Date()
                        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
                        setFilters({ createdAfter: oneMonthAgo.toISOString().split('T')[0] })
                      }}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    >
                      最近一个月
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const threeMonthsAgo = new Date()
                        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                        setFilters({ createdAfter: threeMonthsAgo.toISOString().split('T')[0] })
                      }}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                    >
                      最近三个月
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4 border-t">
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
              应用筛选
            </Button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  )

}

export default List
