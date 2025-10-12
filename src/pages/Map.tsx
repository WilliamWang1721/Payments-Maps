import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, Filter, Search, CreditCard, Smartphone, Settings, FileText, Shield, Building2, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import AnimatedModal from '@/components/ui/AnimatedModal'
import { AnimatedListItem } from '@/components/AnimatedListItem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import PaymentIcon from '@/components/icons/PaymentIcon'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import { usePermissions } from '@/hooks/usePermissions'
import { SearchSuggestions } from '@/components/SearchSuggestions'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import OnboardingTour from '@/components/OnboardingTour'

const Map = () => {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<any>(null)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  
  // 搜索历史功能
  const { searchHistory, addSearchHistory, clearSearchHistory, removeSearchHistory } = useSearchHistory()
  
  // 新手引导
  const { showTour, completeTour } = useOnboardingTour()
  
  const {
    mapInstance,
    currentLocation,
    posMachines,
    selectedPOSMachine,
    loading,
    locationLoading,
    searchKeyword,
    filters,
    setMapInstance,
    getCurrentLocation,
    loadPOSMachines,
    selectPOSMachine,
    setSearchKeyword,
    setFilters,
  } = useMapStore()
  
  const { user } = useAuthStore()
  const permissions = usePermissions()

  // 初始化地图 - 简化版本
  useEffect(() => {
    let mounted = true
    
    const initMap = async () => {
      try {
        console.log('开始初始化地图组件...')
        
        // 检查API配置
        if (!import.meta.env.VITE_AMAP_KEY) {
          throw new Error('API配置错误: 高德地图API密钥未配置')
        }
        
        // 直接使用现有的 mapRef 容器
        const container = mapRef.current
        if (!container) {
          throw new Error('地图容器未找到')
        }
        
        // 确保容器有正确的样式
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.minHeight = '400px'
        container.style.position = 'relative'
        container.style.top = '0'
        container.style.left = '0'
        container.style.right = '0'
        container.style.bottom = '0'
        
        // 强制重排
        container.offsetHeight
        
        const rect = container.getBoundingClientRect()
        console.log('最终容器尺寸:', {
          width: rect.width,
          height: rect.height,
          offsetWidth: container.offsetWidth,
          offsetHeight: container.offsetHeight
        })
        
        if (rect.width === 0 || rect.height === 0) {
          throw new Error(`容器尺寸异常: ${rect.width}x${rect.height}`)
        }
        
        console.log('开始加载高德地图API...')
        const AMap = await loadAMap()
        
        if (!mounted) return
        
        console.log('创建地图实例...')
        const map = new AMap.Map(container, {
          ...DEFAULT_MAP_CONFIG,
          zoom: 15,
        } as any)
        
        if (!mounted) return
        
        console.log('地图实例创建成功')
        setMapInstance(map)
        
        // 添加地图控件
        try {
          if (window.AMap && (window.AMap as any).Scale && (window.AMap as any).ToolBar) {
            const scale = new (window.AMap as any).Scale()
            const toolbar = new (window.AMap as any).ToolBar()
            map.addControl(scale)
            map.addControl(toolbar)
            console.log('地图控件添加成功')
          }
        } catch (controlError) {
          console.warn('添加地图控件失败:', controlError)
        }
        
        // 监听地图加载完成事件
        map.on('complete', () => {
          console.log('地图加载完成')
        })
        
        // 获取当前位置
        try {
          await getCurrentLocation()
        } catch (error) {
          console.warn('获取位置失败，使用默认位置:', error)
        }
        
      } catch (error) {
        console.error('地图初始化失败:', error)
        if (mounted) {
          toast.error(`地图加载失败: ${error.message}`)
        }
      } finally {
        if (mounted) {
          setMapLoading(false)
        }
      }
    }

    // 延迟执行确保组件完全挂载
    const timeoutId = setTimeout(() => {
      initMap()
    }, 500) // 增加延迟时间
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)

      const currentMapInstance = useMapStore.getState().mapInstance
      if (currentMapInstance) {
        if (typeof currentMapInstance.destroy === 'function') {
          currentMapInstance.destroy()
        }
        setMapInstance(null)
      }
    }
  }, [])

  // 加载POS机数据
  useEffect(() => {
    if (mapInstance) {
      loadPOSMachines()
    }
  }, [mapInstance, loadPOSMachines])

  // 在地图上显示POS机标记
  useEffect(() => {
    if (!mapInstance || !window.AMap) return

    // 清除现有标记
    if (typeof mapInstance.clearMap === 'function') {
      mapInstance.clearMap()
    }
    
    // 添加POS机标记
    posMachines.forEach((pos) => {
      // 根据POS机状态设置图标颜色
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'active':
            return '#3B82F6' // 蓝色 - 正常运行
          case 'inactive':
            return '#9CA3AF' // 灰色 - 暂时不可用
          case 'maintenance':
            return '#F59E0B' // 橙色 - 维修中
          case 'disabled':
            return '#EF4444' // 红色 - 已停用
          default:
            return '#3B82F6' // 默认蓝色
        }
      }
      
      const statusColor = getStatusColor(pos.status || 'active')
      
      const marker = new window.AMap.Marker({
        position: [pos.longitude, pos.latitude],
        title: pos.merchant_name,
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(32, 32),
          image: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${statusColor}" stroke="white" stroke-width="2"/>
              <path d="M16 8L20 12H18V20H14V12H12L16 8Z" fill="white"/>
            </svg>
          `),
          imageSize: new window.AMap.Size(32, 32),
        }),
      })
      
      // 点击标记显示详情
      marker.on('click', () => {
        selectPOSMachine(pos)
        setSelectedMarker(marker)
      })
      
      mapInstance.add(marker)
    })
  }, [mapInstance, posMachines, selectPOSMachine])

  // 监听搜索关键词变化，实现实时搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchKeyword !== undefined) {
        handleSearch()
      }
    }, 500) // 500ms防抖
    
    return () => clearTimeout(timeoutId)
  }, [searchKeyword])

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

  // 添加POS机
  const handleAddPOS = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate('/app/add-pos')
  }

  // 获取当前位置
  const handleGetLocation = async () => {
    try {
      await getCurrentLocation()
      toast.success('位置获取成功')
    } catch (error) {
      toast.error('位置获取失败，请检查定位权限')
    }
  }

  return (
    <div className="w-full h-full relative"> 
      {/* 新手引导 */}
      <OnboardingTour 
        isOpen={showTour} 
        onComplete={completeTour}
      /> 


      {/* 加载遮罩 */}
      {mapLoading && (
        <div className="map-loading-overlay absolute inset-0 flex items-center justify-center bg-white/70">
          <Loading size="lg" text="正在加载地图..." />
        </div>
      )}

      
      {/* 搜索栏 */}
      <div className="search-bar absolute top-4 left-4 right-4" style={{ top: '64px' }}>
        <div className="space-y-2">
          <div className="flex space-x-2">
            <div className="flex-1 flex space-x-2">
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
                  className="w-full bg-white shadow-lg"
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
                className="search-button px-3"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={() => setShowFilters(true)}
              variant="outline"
              size="sm"
              className="filter-button bg-white shadow-lg"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 已选择的筛选条件标签 */}
          {Object.keys(filters).some(key => filters[key as keyof typeof filters]) && (
            <div className="filter-panel bg-white rounded-lg shadow-lg p-3">
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
                      className="filter-close-button ml-1 text-blue-600 hover:text-blue-800 min-h-[32px] min-w-[32px] touch-manipulation webkit-tap-highlight-none"
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
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
                      className="filter-close-button ml-1 text-red-600 hover:text-red-800 min-h-[32px] min-w-[32px] touch-manipulation webkit-tap-highlight-none"
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
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
                      className="filter-close-button ml-1 text-green-600 hover:text-green-800 min-h-[32px] min-w-[32px] touch-manipulation webkit-tap-highlight-none"
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
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
        </div>
      </div>

      {/* 地图容器 */}
      <div 
        ref={mapRef} 
        className="w-full h-full" 
        style={{ 
          minHeight: '400px',
          minWidth: '300px',
          position: 'relative',
          zIndex: 1
        }}
      />

      {/* 控制按钮 */}
      <div className="absolute right-4 z-40 space-y-2" style={{ bottom: '70px' }}>
        <Button
          onClick={handleGetLocation}
          loading={locationLoading}
          className="map-control-button w-12 h-12 rounded-full p-0 shadow-lg min-h-[48px] min-w-[48px] touch-manipulation webkit-tap-highlight-none"
          title="获取当前位置"
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <MapPin className="w-5 h-5" />
        </Button>
        
        {permissions.canAdd && (
          <Button
            onClick={handleAddPOS}
            className="map-control-button w-12 h-12 rounded-full p-0 shadow-lg min-h-[48px] min-w-[48px] touch-manipulation webkit-tap-highlight-none"
            title="添加POS机"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* POS机详情弹窗 */}
      <AnimatedModal
        isOpen={!!selectedPOSMachine}
        onClose={() => selectPOSMachine(null)}
        title="POS机详情"
        size="md"
      >
        {selectedPOSMachine && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">{selectedPOSMachine.merchant_name}</CardTitle>
              <CardDescription>{selectedPOSMachine.address}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {selectedPOSMachine.basic_info && Object.keys(selectedPOSMachine.basic_info).length > 0 && (
                <div className="space-y-4">
                  {/* 卡组织支持和Contactless支持并行布局 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 卡组织支持 */}
                    <div>
                      <h4 className="flex items-center space-x-2 font-medium text-gray-900 mb-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>卡组织支持</span>
                      </h4>
                      {selectedPOSMachine.basic_info.supported_card_networks && selectedPOSMachine.basic_info.supported_card_networks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedPOSMachine.basic_info.supported_card_networks.map((network) => (
                            <span
                              key={network}
                              className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
                            >
                              {getCardNetworkLabel(network)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">待勘察</p>
                      )}
                    </div>

                    {/* Contactless 支持 */}
                    <div>
                      <h4 className="flex items-center space-x-2 font-medium text-gray-900 mb-2">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <span>Contactless 支持</span>
                      </h4>
                      {(selectedPOSMachine.basic_info.supports_apple_pay || selectedPOSMachine.basic_info.supports_google_pay || selectedPOSMachine.basic_info.supports_contactless || selectedPOSMachine.basic_info.supports_hce_simulation) ? (
                        <div className="space-y-2 text-sm">
                          {selectedPOSMachine.basic_info.supports_contactless && (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>实体卡 Contactless</span>
                            </div>
                          )}
                          {selectedPOSMachine.basic_info.supports_apple_pay && (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Apple Pay</span>
                            </div>
                          )}
                          {selectedPOSMachine.basic_info.supports_google_pay && (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Google Pay</span>
                            </div>
                          )}
                          {selectedPOSMachine.basic_info.supports_hce_simulation && (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>HCE模拟</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">待勘察</p>
                      )}
                    </div>
                  </div>

                  {/* 设备支持 */}
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-gray-900 mb-2">
                      <Settings className="w-4 h-4 text-purple-600" />
                      <span>设备支持</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">POS机型号:</span>
                        <p className="text-gray-900 mt-1">
                          {selectedPOSMachine.basic_info.model || <span className="text-gray-500">待勘察</span>}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">收单机构:</span>
                        <p className="text-gray-900 mt-1">
                          {selectedPOSMachine.basic_info.acquiring_institution || <span className="text-gray-500">待勘察</span>}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">收银位置:</span>
                        <p className="text-gray-900 mt-1">
                          {selectedPOSMachine.basic_info.checkout_location || <span className="text-gray-500">待勘察</span>}
                        </p>
                      </div>
                    </div>
                    
                    {/* 收单模式支持 */}
                    <div className="mt-3">
                      <span className="font-medium text-gray-700 block mb-2">收单模式支持:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-xs">DCC</span>
                          <div className={`w-2 h-2 rounded-full ${
                            selectedPOSMachine.basic_info.supports_dcc ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-xs">EDC</span>
                          <div className={`w-2 h-2 rounded-full ${
                            selectedPOSMachine.basic_info.supports_edc ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 验证模式 */}
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-gray-900 mb-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>验证模式</span>
                    </h4>
                    {(selectedPOSMachine.verification_modes?.small_amount_no_pin || selectedPOSMachine.verification_modes?.requires_password || selectedPOSMachine.verification_modes?.requires_signature) ? (
                      <div className="space-y-2 text-sm">
                        {selectedPOSMachine.verification_modes?.small_amount_no_pin && (
                          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>小额免密</span>
                          </div>
                        )}
                        {selectedPOSMachine.verification_modes?.requires_password && (
                          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>PIN验证</span>
                          </div>
                        )}
                        {selectedPOSMachine.verification_modes?.requires_signature && (
                          <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>签名验证</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">待勘察</p>
                    )}
                  </div>

                  {/* 备注板块 */}
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-gray-900 mb-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>备注</span>
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedPOSMachine.remarks || <span className="text-gray-500">待勘察</span>}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    console.log('点击查看详情按钮，POS ID:', selectedPOSMachine.id)
                    navigate(`/app/pos/${selectedPOSMachine.id}`)
                  }}
                  className="flex-1"
                >
                  查看详情
                </Button>
                <Button
                  onClick={() => {
                    // 导航到该位置
                    if (mapInstance) {
                      mapInstance.setCenter([selectedPOSMachine.longitude, selectedPOSMachine.latitude])
                      mapInstance.setZoom(18)
                    }
                    selectPOSMachine(null)
                  }}
                  variant="outline"
                >
                  导航
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedModal>

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
              <CreditCard className="w-5 h-5 mr-2 text-green-600" />
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
                  <option value="500">500米内</option>
                  <option value="1000">1公里内</option>
                  <option value="2000">2公里内</option>
                  <option value="5000">5公里内</option>
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
                  <option value="移动收银">移动收银</option>
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
                    最低免密金额（最小）
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
                    最低免密金额（最大）
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
              
              {/* 其他条件 */}
              <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={filters.createdAfter || ''}
                      onChange={(e) => setFilters({ createdAfter: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">开始日期</span>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={filters.createdBefore || ''}
                      onChange={(e) => setFilters({ createdBefore: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">结束日期</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const oneWeekAgo = new Date()
                      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
                      setFilters({ createdAfter: oneWeekAgo.toISOString().split('T')[0] })
                    }}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
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
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
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
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    最近三个月
                  </button>
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

export default Map