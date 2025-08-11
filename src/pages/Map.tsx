import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import Modal from '@/components/ui/Modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import PaymentIcon from '@/components/icons/PaymentIcon'

const Map = () => {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<any>(null)
  
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
      if (mapInstance) {
        mapInstance.destroy()
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
    mapInstance.clearMap()
    
    // 添加POS机标记
    posMachines.forEach((pos) => {
      const marker = new window.AMap.Marker({
        position: [pos.longitude, pos.latitude],
        title: pos.name,
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(32, 32),
          image: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="2"/>
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

  // 处理搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      await loadPOSMachines()
      return
    }
    
    // 这里可以实现搜索逻辑
    toast.info('搜索功能开发中...')
  }

  // 添加POS机
  const handleAddPOS = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate('/add-pos')
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


      {/* 加载遮罩 */}
      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
          <Loading size="lg" text="正在加载地图..." />
        </div>
      )}

      
      {/* 搜索栏 */}
      <div className="absolute top-4 left-4 right-4 z-40" style={{ top: '64px' }}>
        <div className="flex space-x-2">
          <div className="flex-1 flex space-x-2">
            <Input
              placeholder="搜索POS机或商户..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-white shadow-lg"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="px-3"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={() => setShowFilters(true)}
            variant="outline"
            size="sm"
            className="bg-white shadow-lg"
          >
            <Filter className="w-4 h-4" />
          </Button>
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
          className="w-12 h-12 rounded-full p-0 shadow-lg"
        >
          <MapPin className="w-5 h-5" />
        </Button>
        
        <Button
          onClick={handleAddPOS}
          className="w-12 h-12 rounded-full p-0 shadow-lg"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* POS机详情弹窗 */}
      <Modal
        isOpen={!!selectedPOSMachine}
        onClose={() => selectPOSMachine(null)}
        title="POS机详情"
        size="md"
      >
        {selectedPOSMachine && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedPOSMachine.name}</CardTitle>
              <CardDescription>{selectedPOSMachine.address}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">商户信息</h4>
                <p className="text-sm text-gray-600">{selectedPOSMachine.merchant_name}</p>
              </div>
              
              {selectedPOSMachine.basic_info && Object.keys(selectedPOSMachine.basic_info).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">支付信息</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedPOSMachine.basic_info.supports_apple_pay && (
                      <span className="inline-flex items-center text-green-600"><PaymentIcon type="apple_pay" size={16} className="mr-1" />Apple Pay</span>
                    )}
                    {selectedPOSMachine.basic_info.supports_google_pay && (
                      <span className="inline-flex items-center text-green-600"><PaymentIcon type="google_pay" size={16} className="mr-1" />Google Pay</span>
                    )}
                    {selectedPOSMachine.basic_info.supports_foreign_cards && (
                      <span className="inline-flex items-center text-green-600"><PaymentIcon type="foreign_cards" size={16} className="mr-1" />外卡支持</span>
                    )}
                    {selectedPOSMachine.basic_info.supports_contactless && (
                      <span className="inline-flex items-center text-green-600"><PaymentIcon type="contactless" size={16} className="mr-1" />闪付支持</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => navigate(`/pos/${selectedPOSMachine.id}`)}
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
      </Modal>

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
                <span className="text-sm">Apple Pay</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.supportsGooglePay || false}
                  onChange={(e) => setFilters({ supportsGooglePay: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Google Pay</span>
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

export default Map