import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import { getFriendlyErrorMessage, notify } from '@/lib/notify'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

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
  const [mapError, setMapError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
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
      const map = mapRef.current
      if (!map) return

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        console.warn('[SimpleMapPicker] 忽略非法坐标:', { lng, lat })
        return
      }

      const AMap = (window as any).AMap
      if (!AMap || !AMap.Marker) return

      const position: [number, number] = [lng, lat]

      // 复用同一个 Marker，避免频繁 remove/add 导致高德内部 overlay 列表出现 undefined
      // 从而触发 "Cannot read properties of undefined (reading 'getOptions')"。
      if (markerRef.current) {
        try {
          if (typeof markerRef.current.setMap === 'function') {
            markerRef.current.setMap(map)
          }
          if (typeof markerRef.current.setPosition === 'function') {
            markerRef.current.setPosition(position)
          } else {
            // 极端兼容：若 setPosition 不存在，退化为重建 marker
            if (typeof markerRef.current.setMap === 'function') {
              markerRef.current.setMap(null)
            }
            markerRef.current = new AMap.Marker({ position, map })
          }
        } catch (error) {
          console.warn('[SimpleMapPicker] 更新标记失败，尝试重建:', error)
          try {
            markerRef.current?.setMap?.(null)
          } catch {
            // ignore
          }
          markerRef.current = new AMap.Marker({ position, map })
        }
      } else {
        markerRef.current = new AMap.Marker({ position, map })
      }

      setSelectedPos({ lat, lng, address: '' })
      resolveAddress(lng, lat)

      try {
        map.setCenter(position)
      } catch (error) {
        console.warn('[SimpleMapPicker] 地图设置中心失败:', error)
      }
    },
    [resolveAddress]
  )

  useEffect(() => {
    if (!isOpen) {
      // 清理地图
      const map = mapRef.current
      const marker = markerRef.current

      // 先断开引用，避免关闭后异步回调继续操作已销毁对象
      mapRef.current = null
      markerRef.current = null
      setIsMapReady(false)
      setMapError(null)

      if (marker?.setMap) {
        try {
          marker.setMap(null)
        } catch (error) {
          console.warn('[SimpleMapPicker] 标记清理失败:', error)
        }
      }

      if (map?.destroy) {
        try {
          map.destroy()
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
          ...DEFAULT_MAP_CONFIG,
          zoom: 15,
          center: [initialLng, initialLat],
        })
        
        mapRef.current = map
        setMapError(null)

        // 容器在弹窗动画期间可能尺寸不稳定，延迟 resize 可降低白屏概率
        requestAnimationFrame(() => {
          try {
            map.resize?.()
          } catch (error) {
            console.warn('[SimpleMapPicker] map.resize 失败:', error)
          }
        })
        
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
        setMapError(
          getFriendlyErrorMessage(
            error,
            '地图加载失败，请检查 VITE_AMAP_KEY / 域名白名单 / 安全密钥配置',
            '网络异常，无法加载地图服务，请检查网络或代理设置'
          )
        )
        // 失败时尽量回收资源，避免重试时残留 map/overlay 导致无法再次初始化
        try {
          markerRef.current?.setMap?.(null)
        } catch {
          // ignore
        }
        markerRef.current = null
        try {
          mapRef.current?.destroy?.()
        } catch {
          // ignore
        }
        mapRef.current = null
        setIsMapReady(false)
        notify.error('地图加载失败')
      }
    }, 500) // 延迟以确保DOM准备好
    
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOpen, initialLat, initialLng, placeMarker, reloadToken])

  useEffect(() => {
    const map = mapRef.current
    const el = containerRef.current
    if (!isOpen || !isMapReady || !map || !el) return
    if (typeof ResizeObserver === 'undefined') return

    let rafId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        try {
          map.resize?.()
        } catch (error) {
          console.warn('[SimpleMapPicker] resize observer 触发 resize 失败:', error)
        }
      })
    })

    observer.observe(el)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [isOpen, isMapReady])

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

  useBodyScrollLock(isOpen)

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
            {!isMapReady && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500">加载地图中...</div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/70 backdrop-blur-sm">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                  <div className="text-sm font-semibold text-gray-900">地图无法显示</div>
                  <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{mapError}</div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          markerRef.current?.setMap?.(null)
                        } catch {
                          // ignore
                        }
                        markerRef.current = null
                        try {
                          mapRef.current?.destroy?.()
                        } catch {
                          // ignore
                        }
                        mapRef.current = null
                        setMapError(null)
                        setIsMapReady(false)
                        setReloadToken((prev) => prev + 1)
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      重试加载
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapError(null)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    >
                      暂时关闭
                    </button>
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500">
                    提示：本地开发请先创建 `.env` 并填写 `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_JS_CODE`，同时在高德控制台添加当前域名到白名单。
                  </div>
                </div>
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
