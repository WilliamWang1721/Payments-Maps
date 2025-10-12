import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MapPin, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'

interface MapPickerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (latitude: number, longitude: number, address?: string) => void
  initialLatitude?: number
  initialLongitude?: number
  title?: string
}

const MapPicker = ({
  isOpen,
  onClose,
  onConfirm,
  initialLatitude = 39.9042,
  initialLongitude = 116.4074,
  title = '选择位置'
}: MapPickerProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLatitude,
    longitude: initialLongitude,
    address: ''
  })

  // 根据坐标获取地址
  const getAddressFromCoords = useCallback((lng: number, lat: number) => {
    if (!geocoderRef.current) return

    geocoderRef.current.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result.info === 'OK') {
        const address = result.regeocode.formattedAddress
        setSelectedLocation(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address
        }))
      }
    })
  }, [])

  // 更新标记位置
  const updateMarker = useCallback((lng: number, lat: number) => {
    if (!mapInstanceRef.current) return

    const AMap = (window as any).AMap
    if (!AMap) return

    // 移除旧标记
    if (markerRef.current) {
      mapInstanceRef.current.remove(markerRef.current)
    }

    // 创建新标记
    const marker = new AMap.Marker({
      position: [lng, lat],
      map: mapInstanceRef.current,
      draggable: true,
      cursor: 'move',
      animation: 'AMAP_ANIMATION_DROP'
    })

    // 标记拖拽事件
    marker.on('dragend', () => {
      const position = marker.getPosition()
      const newLng = position.getLng()
      const newLat = position.getLat()
      getAddressFromCoords(newLng, newLat)
    })

    markerRef.current = marker

    // 更新选中位置
    setSelectedLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))

    // 将地图中心移动到标记位置
    mapInstanceRef.current.setCenter([lng, lat])
  }, [getAddressFromCoords])

  // 初始化地图
  const initializeMap = useCallback(async () => {
    if (!mapContainerRef.current) return

    setLoading(true)

    try {
      console.log('[MapPicker] Starting map initialization...')
      const AMap = await loadAMap()

      // 确保容器仍然存在
      if (!mapContainerRef.current) {
        console.log('[MapPicker] Container no longer exists')
        return
      }

      // 销毁旧实例
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy()
        } catch (e) {
          console.error('[MapPicker] Error destroying old map:', e)
        }
      }

      // 创建地图实例
      const map = new AMap.Map(mapContainerRef.current, {
        ...DEFAULT_MAP_CONFIG,
        zoom: 16,
        center: [selectedLocation.longitude, selectedLocation.latitude]
      })

      mapInstanceRef.current = map

      // 添加控件
      map.addControl(new AMap.Scale())
      map.addControl(new AMap.ToolBar({
        position: 'RT'
      }))

      // 初始化地理编码器
      geocoderRef.current = new AMap.Geocoder({
        city: '全国',
        radius: 1000
      })

      // 添加点击事件
      map.on('click', (e: any) => {
        const lng = e.lnglat.getLng()
        const lat = e.lnglat.getLat()
        updateMarker(lng, lat)
        getAddressFromCoords(lng, lat)
      })

      // 如果有初始位置，添加标记
      if (initialLatitude && initialLongitude) {
        updateMarker(initialLongitude, initialLatitude)
        getAddressFromCoords(initialLongitude, initialLatitude)
      }

      console.log('[MapPicker] Map initialized successfully')
    } catch (error) {
      console.error('[MapPicker] Map initialization failed:', error)
      toast.error('地图加载失败，请刷新页面重试')
    } finally {
      setLoading(false)
    }
  }, [
    getAddressFromCoords,
    initialLatitude,
    initialLongitude,
    selectedLocation.latitude,
    selectedLocation.longitude,
    updateMarker
  ])

  // 获取当前位置
  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true)
    
    try {
      const position = await locationUtils.getCurrentPosition()
      
      if (position) {
        const { longitude: lng, latitude: lat } = position
        updateMarker(lng, lat)
        getAddressFromCoords(lng, lat)
        
        // 移动地图中心
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter([lng, lat])
          mapInstanceRef.current.setZoom(16)
        }
        
        toast.success('定位成功')
      } else {
        toast.error('无法获取当前位置')
      }
    } catch (error) {
      console.error('[MapPicker] Location error:', error)
      toast.error('定位失败，请检查定位权限')
    } finally {
      setLocationLoading(false)
    }
  }, [updateMarker, getAddressFromCoords])

  // 确认选择
  const handleConfirm = () => {
    if (selectedLocation.latitude === 0 || selectedLocation.longitude === 0) {
      toast.error('请先选择位置')
      return
    }
    
    onConfirm(
      selectedLocation.latitude,
      selectedLocation.longitude,
      selectedLocation.address
    )
    onClose()
  }

  // 监听打开状态，初始化地图
  useEffect(() => {
    if (isOpen) {
      // 延迟初始化，确保DOM渲染完成
      const timer = setTimeout(() => {
        initializeMap()
      }, 300)
      
      return () => clearTimeout(timer)
    } else {
      // 关闭时销毁地图
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy()
          mapInstanceRef.current = null
          markerRef.current = null
          geocoderRef.current = null
        } catch (e) {
          console.error('[MapPicker] Error cleaning up:', e)
        }
      }
    }
  }, [isOpen, initializeMap])

  // 清理函数
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy()
          mapInstanceRef.current = null
        } catch (e) {
          console.error('[MapPicker] Cleanup error:', e)
        }
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* 背景遮罩 */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* 主容器 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 提示信息 */}
          <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-800">
              点击地图选择位置，或拖动标记调整位置
            </p>
          </div>

          {/* 地图容器 */}
          <div className="relative h-[400px] sm:h-[500px] bg-gray-100">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">正在加载地图...</span>
                </div>
              </div>
            )}
            
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* 定位按钮 */}
            <button
              onClick={getCurrentLocation}
              disabled={loading || locationLoading}
              className="absolute bottom-4 right-4 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {locationLoading ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5 text-blue-500" />
              )}
            </button>
          </div>

          {/* 位置信息 */}
          {selectedLocation.latitude !== 0 && selectedLocation.longitude !== 0 && (
            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">坐标：</span>
                  <span className="font-mono text-gray-700">
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </span>
                </div>
                {selectedLocation.address && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500">地址：</span>
                    <span className="text-gray-700 flex-1">{selectedLocation.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedLocation.latitude === 0 || selectedLocation.longitude === 0}
              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认选择
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default MapPicker
