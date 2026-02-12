import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import { notify } from '@/lib/notify'

interface SimpleMapPickerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (latitude: number, longitude: number, address: string) => void
  initialLat?: number
  initialLng?: number
}

const SimpleMapPicker: React.FC<SimpleMapPickerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLat = 39.9042,
  initialLng = 116.4074
}) => {
  console.log('[SimpleMapPicker] 组件渲染, isOpen:', isOpen)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  
  const [isMapReady, setIsMapReady] = useState(false)
  const [selectedPos, setSelectedPos] = useState({ lat: initialLat, lng: initialLng, address: '' })
  const [isLocating, setIsLocating] = useState(false)
  const [addressStatus, setAddressStatus] = useState<'idle' | 'loading' | 'resolved' | 'error'>('idle')
  const [addressError, setAddressError] = useState('')
  const addressRequestIdRef = useRef(0)

  const resolveAddress = useCallback(async (lng: number, lat: number) => {
    const requestId = ++addressRequestIdRef.current
    setAddressStatus('loading')
    setAddressError('')
    try {
      const address = await locationUtils.getAddress(lng, lat)
      if (addressRequestIdRef.current !== requestId) return
      setSelectedPos((prev) => ({ ...prev, address }))
      setAddressStatus(address ? 'resolved' : 'error')
    } catch (error) {
      if (addressRequestIdRef.current !== requestId) return
      console.warn('[SimpleMapPicker] 地址解析失败:', error)
      setSelectedPos((prev) => ({ ...prev, address: '' }))
      setAddressError(error instanceof Error ? error.message : String(error))
      setAddressStatus('error')
    }
  }, [])

  const placeMarker = useCallback(
    (lng: number, lat: number) => {
      if (!mapRef.current) return

      const AMap = (window as any).AMap
      if (!AMap) return

      // 移除旧标记（避免 map.remove(undefined) 触发 getOptions 异常）
      if (markerRef.current && typeof markerRef.current.setMap === 'function') {
        try {
          markerRef.current.setMap(null)
        } catch (error) {
          console.warn('[SimpleMapPicker] 旧标记移除失败:', error)
        }
      }
      markerRef.current = null

      // 创建新标记
      const marker = new AMap.Marker({
        position: [lng, lat],
        map: mapRef.current,
      })

      markerRef.current = marker
      setSelectedPos({ lat, lng, address: '' })
      resolveAddress(lng, lat)

      // 移动地图中心
      mapRef.current.setCenter([lng, lat])
    },
    [resolveAddress]
  )

  useEffect(() => {
    if (!isOpen) {
      // 清理地图
      if (mapRef.current) {
        try {
          mapRef.current.destroy()
          mapRef.current = null
          markerRef.current = null
          setIsMapReady(false)
        } catch (error) {
          console.warn('[SimpleMapPicker] 地图实例销毁失败', error)
        }
      }
      return
    }

    // 初始化地图
    let cancelled = false
    const timer = setTimeout(async () => {
      if (!containerRef.current || cancelled) return
      
      try {
        console.log('[SimpleMapPicker] 开始初始化地图...')
        const AMap = await loadAMap()
        
        if (cancelled || !containerRef.current) return
        
        // 创建地图
        const map = new AMap.Map(containerRef.current, {
          zoom: 15,
          center: [initialLng, initialLat],
          ...DEFAULT_MAP_CONFIG
        })
        
        mapRef.current = map
        
        // 添加点击事件
        map.on('click', (e: any) => {
          const lng = e.lnglat.getLng()
          const lat = e.lnglat.getLat()
          placeMarker(lng, lat)
        })
        
        // 添加初始标记
        if (initialLat && initialLng) {
          placeMarker(initialLng, initialLat)
        }
        
        setIsMapReady(true)
        console.log('[SimpleMapPicker] 地图初始化成功')
      } catch (error) {
        console.error('[SimpleMapPicker] 地图初始化失败:', error)
        notify.error('地图加载失败')
      }
    }, 500) // 延迟以确保DOM准备好
    
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOpen, initialLat, initialLng, placeMarker])

  const handleConfirm = () => {
    onConfirm(selectedPos.lat, selectedPos.lng, selectedPos.address)
    onClose()
  }

  const handleLocateMe = async () => {
    if (!isMapReady) return
    if (isLocating) return

    setIsLocating(true)
    const toastId = notify.loading('正在获取当前位置...')
    try {
      const { longitude, latitude } = await locationUtils.getCurrentPosition(3)
      placeMarker(longitude, latitude)
      notify.success('已定位到当前位置', { id: toastId })
    } catch (err: any) {
      console.error('获取当前位置失败:', err)
      notify.error('获取当前位置失败，请手动选择位置', { id: toastId })
    } finally {
      setIsLocating(false)
    }
  }

  // 使用 React Portal 确保脱离父级层叠上下文，并锁定页面滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      className="inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {/* 背景遮罩 */}
      <div
        className="bg-black bg-opacity-50"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max_h-[90vh] max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">选择位置</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 提示信息 */}
        <div className="px-6 py-3 bg-blue-50 text-sm text-blue-700">
          点击地图选择POS机位置
        </div>
        
        {/* 地图容器 */}
        <div className="relative">
          {/* 获取当前位置按钮（悬浮于地图右上角）*/}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocateMe() }}
            className="absolute top-3 right-3 z-10 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-50 active:scale-[0.98] transition flex items-center space-x-2"
            aria-label="获取当前位置"
          >
            {isLocating ? (
              <svg className="w-4 h-4 animate-spin text-gray-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm text-gray-700">获取当前位置</span>
          </button>

          <div 
            ref={containerRef}
            className="w-full"
            style={{ height: '500px', backgroundColor: '#f3f4f6' }}
          >
            {!isMapReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500">加载地图中...</div>
              </div>
            )}
          </div>
        </div>
        
        {/* 地址显示 */}
        {selectedPos.lat !== 0 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-gray-500">当前地址:</span>
              <span className="text-gray-800 flex-1">
                {addressStatus === 'loading'
                  ? '正在解析地址...'
                  : selectedPos.address || addressError || '地址解析失败，请在表单中手动填写'}
              </span>
            </div>
          </div>
        )}
        
        {/* 按钮区域 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SimpleMapPicker
