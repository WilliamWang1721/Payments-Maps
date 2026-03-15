import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import { getFriendlyErrorMessage } from '@/lib/notify'
import { getPOSStatusMapColor } from '@/lib/posStatus'
import { useMapStore } from '@/stores/useMapStore'
import { useNavigate } from 'react-router-dom'

const DETAIL_VIEW_ZOOM = 15
const AMAP_RECOVERY_COOLDOWN_MS = 5000
const AMAP_RECOVERY_DECAY_MS = 5 * 60 * 1000
const AMAP_RECOVERY_SOFT_LIMIT = 2
const AMAP_RECOVERY_HARD_RELOAD_STORAGE_KEY = 'amap_hard_reload_v1'
const CLUSTER_GRID_SIZE = 72
const DEFAULT_MAP_ZOOM = 12
const CLUSTER_COUNT_DISPLAY_LIMIT = 999
const DETAIL_MARKER_OFFSET_Y = -8
const CLUSTER_BUCKET_COORDINATE_PRECISION = 3
const CLUSTER_Z_INDEX_BASE = 120
const CLUSTER_Z_INDEX_BONUS_CAP = 50
const CLUSTER_ZOOM_LARGE_BUCKET_COUNT = 20
const CLUSTER_ZOOM_MEDIUM_BUCKET_COUNT = 6
const CLUSTER_ZOOM_STEP_SMALL = 1
const CLUSTER_ZOOM_STEP_MEDIUM = 2
const CLUSTER_ZOOM_STEP_LARGE = 3
const MAP_ZOOM_IN_DELTA = 1
const MAP_ZOOM_OUT_DELTA = -1

const escapeLabel = (label: string) =>
  label.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[char] || char
  })

const createMarkerContent = (color: string, label: string, showLabel: boolean) => {
  const safeLabel = escapeLabel(label || 'POS')
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="
        width:32px;
        height:32px;
        border-radius:999px;
        background:${color};
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-weight:600;
        box-shadow:0 12px 30px rgba(17,28,68,0.25);
        border:4px solid rgba(255,255,255,0.6);
      ">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C8.13401 2 5 5.13401 5 9C5 12.866 8.13401 16 12 16C15.866 16 19 12.866 19 9C19 5.13401 15.866 2 12 2ZM7 9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9C17 11.7614 14.7614 14 12 14C9.23858 14 7 11.7614 7 9Z"/>
          <circle cx="12" cy="9" r="3"/>
        </svg>
      </div>
      ${
        showLabel
          ? `<div style="
              padding:2px 8px;
              border-radius:999px;
              background:rgba(255,255,255,0.95);
              color:#1B2559;
              font-size:11px;
              font-weight:600;
              max-width:120px;
              white-space:nowrap;
              text-overflow:ellipsis;
              overflow:hidden;
              box-shadow:0 4px 12px rgba(17,28,68,0.15);
            ">
              ${safeLabel}
            </div>`
          : ''
      }
    </div>
  `
}

const createClusterContent = (count: number) => {
  const safeCount = count > CLUSTER_COUNT_DISPLAY_LIMIT ? `${CLUSTER_COUNT_DISPLAY_LIMIT}+` : String(count)
  return `
    <div style="display:flex;align-items:center;justify-content:center;">
      <div style="
        width:54px;
        height:54px;
        border-radius:999px;
        background:radial-gradient(circle at 30% 30%, #60A5FA 0%, #2563EB 56%, #1D4ED8 100%);
        box-shadow:0 12px 30px rgba(29, 78, 216, 0.38);
        border:3px solid rgba(255,255,255,0.85);
        color:#fff;
        font-weight:700;
        font-size:16px;
        line-height:1;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        ${safeCount}
      </div>
    </div>
  `
}

type MapCanvasProps = {
  showLabels: boolean
}

const MapCanvas = ({ showLabels }: MapCanvasProps) => {
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<AMap.Marker[]>([])
  const doubleClickHandlerRef = useRef<((e: any) => void) | null>(null)
  const unmountingRef = useRef(false)
  const recoveryRef = useRef<{ lastAt: number; softCount: number }>({ lastAt: 0, softCount: 0 })
  const [mapReady, setMapReady] = useState(false)
  const [markerMode, setMarkerMode] = useState<'cluster' | 'detail'>('cluster')
  const [mapError, setMapError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const mapInstance = useMapStore((state) => state.mapInstance)
  const setMapInstance = useMapStore((state) => state.setMapInstance)
  const currentLocation = useMapStore((state) => state.currentLocation)
  const posMachines = useMapStore((state) => state.posMachines)
  const loadPOSMachines = useMapStore((state) => state.loadPOSMachines)
  const selectPOSMachine = useMapStore((state) => state.selectPOSMachine)
  const selectedPOSMachine = useMapStore((state) => state.selectedPOSMachine)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isAmapGetOptionsCrash = (message: string, stack: string, filename: string) => {
      const combined = `${message}\n${stack}\n${filename}`
      if (!/getoptions/i.test(combined)) return false
      if (!/undefined/i.test(combined)) return false
      return true
    }

    const attemptRecovery = (reason: string) => {
      if (unmountingRef.current) {
        return
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      const now = Date.now()
      const state = recoveryRef.current
      if (now - state.lastAt > AMAP_RECOVERY_DECAY_MS) {
        state.softCount = 0
      }
      if (now - state.lastAt < AMAP_RECOVERY_COOLDOWN_MS) {
        return
      }

      state.lastAt = now
      state.softCount += 1

      // 尽量“无感”恢复：先软重载地图组件；若短时间内连续触发，降级为整页刷新一次。
      if (import.meta.env.DEV) {
        console.warn('[MapCanvas] 捕获到高德地图异常，尝试自愈:', reason)
      }
      setMapError(null)
      setMapReady(false)
      setReloadToken((prev) => prev + 1)

      if (state.softCount <= AMAP_RECOVERY_SOFT_LIMIT) {
        return
      }

      try {
        const prevHardReloads = Number(sessionStorage.getItem(AMAP_RECOVERY_HARD_RELOAD_STORAGE_KEY) || '0')
        if (Number.isFinite(prevHardReloads) && prevHardReloads < 1) {
          sessionStorage.setItem(AMAP_RECOVERY_HARD_RELOAD_STORAGE_KEY, String(prevHardReloads + 1))
          setTimeout(() => window.location.reload(), 200)
          return
        }
      } catch {
        // ignore storage errors
      }

      setMapReady(true)
      setMapError('地图模块发生异常，请刷新页面后重试。')
    }

    const handleError = (event: ErrorEvent) => {
      const message = event?.message || String((event as any)?.error?.message || '')
      const stack = String((event as any)?.error?.stack || '')
      const filename = String(event?.filename || '')
      if (!isAmapGetOptionsCrash(message, stack, filename)) return

      if (import.meta.env.PROD) {
        event.preventDefault()
      }
      attemptRecovery('window.error')
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any)?.reason
      const message = typeof reason === 'string' ? reason : String(reason?.message || '')
      const stack = String(reason?.stack || '')
      if (!isAmapGetOptionsCrash(message, stack, '')) return

      if (import.meta.env.PROD) {
        event.preventDefault()
      }
      attemptRecovery('unhandledrejection')
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    let destroyed = false
    let localMap: AMap.Map | null = null
    unmountingRef.current = false

    const initMap = async () => {
      if (!mapContainerRef.current) return
      try {
        setMapError(null)
        const AMap = await loadAMap()
        if (destroyed) return

        localMap = new AMap.Map(mapContainerRef.current, {
          ...DEFAULT_MAP_CONFIG,
          zoom: DEFAULT_MAP_ZOOM,
        })

        // 禁用默认双击缩放，避免和快速添加位置的交互冲突
        localMap.setStatus({ doubleClickZoom: false })

        const handleDoubleClick = async (e: any) => {
          const lngLat = e?.lnglat
          const lng = typeof lngLat?.getLng === 'function' ? lngLat.getLng() : lngLat?.lng
          const lat = typeof lngLat?.getLat === 'function' ? lngLat.getLat() : lngLat?.lat

          if (
            typeof lng === 'number' &&
            typeof lat === 'number' &&
            Number.isFinite(lng) &&
            Number.isFinite(lat)
          ) {
            const params = new URLSearchParams()
            params.set('lat', String(lat))
            params.set('lng', String(lng))

            try {
              const address = await locationUtils.getAddress(lng, lat)
              if (address && address.trim()) {
                params.set('address', address.trim())
              }
            } catch (error) {
              console.warn('[MapCanvas] 双击定位反查地址失败:', error)
            }

            navigate(`/app/add-pos?${params.toString()}`)
          }
        }

        doubleClickHandlerRef.current = handleDoubleClick
        localMap.on('dblclick', handleDoubleClick)

        // 容器尺寸在初次渲染/动画中可能为 0，延迟触发 resize 能显著降低白屏概率
        requestAnimationFrame(() => {
          try {
            ;(localMap as any)?.resize?.()
          } catch (error) {
            console.warn('[MapCanvas] map.resize 失败:', error)
          }
        })

        setMapInstance(localMap)
        setMapReady(true)
      } catch (error) {
        console.error('初始化高德地图失败:', error)
        setMapError(
          getFriendlyErrorMessage(
            error,
            '地图加载失败，请检查 VITE_AMAP_KEY / 域名白名单 / 安全密钥配置',
            '网络异常，无法加载地图服务，请检查网络或代理设置'
          )
        )
        setMapReady(true)
      }
    }

    initMap()

    return () => {
      destroyed = true
      unmountingRef.current = true
      markersRef.current.forEach((marker) => {
        try {
          marker?.setMap?.(null)
        } catch (error) {
          console.warn('[MapCanvas] 清理 marker 失败:', error)
        }
      })
      markersRef.current = []
      if (localMap) {
        try {
          if (doubleClickHandlerRef.current) {
            localMap.off('dblclick', doubleClickHandlerRef.current)
          }
        } catch (error) {
          console.warn('[MapCanvas] 解绑 dblclick 失败:', error)
        }
        try {
          localMap.destroy()
        } catch (error) {
          // 高德地图内部偶发 overlay 列表包含 undefined，destroy/remove 时会抛出 getOptions 错误
          console.warn('[MapCanvas] 地图实例销毁失败:', error)
        }
      }
      doubleClickHandlerRef.current = null
      setMapInstance(null)
      setMapReady(false)
      setMapError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken])

  useEffect(() => {
    const el = mapContainerRef.current
    if (!mapInstance || !el) return
    if (typeof ResizeObserver === 'undefined') return

    let rafId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        try {
          ;(mapInstance as any)?.resize?.()
        } catch (error) {
          console.warn('[MapCanvas] resize observer 触发 resize 失败:', error)
        }
      })
    })

    observer.observe(el)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [mapInstance])

  useEffect(() => {
    if (!mapInstance || !currentLocation) return

    try {
      mapInstance.setCenter([currentLocation.longitude, currentLocation.latitude])
    } catch (error) {
      console.warn('[MapCanvas] 应用默认地点失败:', error)
    }
  }, [mapInstance, currentLocation])

  useEffect(() => {
    if (!mapInstance) return
    loadPOSMachines().catch((error) => console.error('加载POS机数据失败:', error))
  }, [mapInstance, loadPOSMachines])

  useEffect(() => {
    const AMap = (window as any).AMap
    if (!mapInstance || !AMap) return

    const clearMarkers = () => {
      markersRef.current.forEach((marker) => {
        try {
          marker?.setMap?.(null)
        } catch (error) {
          console.warn('[MapCanvas] 清理 marker 失败:', error)
        }
      })
      markersRef.current = []
    }

    const createDetailMarkers = () => {
      const markers: AMap.Marker[] = []

      posMachines.forEach((pos) => {
        const lng = Number(pos.longitude)
        const lat = Number(pos.latitude)
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

        const statusColor = getPOSStatusMapColor(pos.status)
        const marker = new AMap.Marker({
          position: [lng, lat],
          map: mapInstance,
          title: pos.merchant_name,
          anchor: 'bottom-center',
          offset: new AMap.Pixel(0, DETAIL_MARKER_OFFSET_Y),
          content: createMarkerContent(statusColor, pos.merchant_name, showLabels),
        })

        marker.on('click', () => {
          selectPOSMachine(pos)
          navigate(`/app/pos/${pos.id}`)
        })

        markers.push(marker)
      })

      return markers
    }

    const createClusterMarkers = () => {
      type ClusterBucket = {
        count: number
        sumLng: number
        sumLat: number
      }

      const buckets = new Map<string, ClusterBucket>()

      posMachines.forEach((pos) => {
        const lng = Number(pos.longitude)
        const lat = Number(pos.latitude)
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

        let bucketKey = `${lng.toFixed(CLUSTER_BUCKET_COORDINATE_PRECISION)}_${lat.toFixed(CLUSTER_BUCKET_COORDINATE_PRECISION)}`
        try {
          const pixel = mapInstance.lngLatToContainer([lng, lat])
          const pixelX = typeof pixel?.getX === 'function' ? pixel.getX() : Number.NaN
          const pixelY = typeof pixel?.getY === 'function' ? pixel.getY() : Number.NaN

          if (Number.isFinite(pixelX) && Number.isFinite(pixelY)) {
            bucketKey = `${Math.floor(pixelX / CLUSTER_GRID_SIZE)}_${Math.floor(pixelY / CLUSTER_GRID_SIZE)}`
          }
        } catch (error) {
          console.warn('[MapCanvas] 聚合计算像素坐标失败，回退经纬度分桶:', error)
        }

        const currentBucket = buckets.get(bucketKey) || { count: 0, sumLng: 0, sumLat: 0 }
        currentBucket.count += 1
        currentBucket.sumLng += lng
        currentBucket.sumLat += lat
        buckets.set(bucketKey, currentBucket)
      })

      const markers: AMap.Marker[] = []
      buckets.forEach((bucket) => {
        const center: [number, number] = [bucket.sumLng / bucket.count, bucket.sumLat / bucket.count]
        const marker = new AMap.Marker({
          position: center,
          map: mapInstance,
          title: `${bucket.count} 台 POS 机`,
          anchor: 'center',
          content: createClusterContent(bucket.count),
          zIndex: CLUSTER_Z_INDEX_BASE + Math.min(bucket.count, CLUSTER_Z_INDEX_BONUS_CAP),
        })

        marker.on('click', () => {
          const currentZoom = mapInstance.getZoom()
          const zoomStep =
            bucket.count > CLUSTER_ZOOM_LARGE_BUCKET_COUNT
              ? CLUSTER_ZOOM_STEP_LARGE
              : bucket.count > CLUSTER_ZOOM_MEDIUM_BUCKET_COUNT
                ? CLUSTER_ZOOM_STEP_MEDIUM
                : CLUSTER_ZOOM_STEP_SMALL

          mapInstance.setCenter(center)
          mapInstance.setZoom(Math.min(DETAIL_VIEW_ZOOM, currentZoom + zoomStep))
        })

        markers.push(marker)
      })

      return markers
    }

    const renderMarkers = () => {
      clearMarkers()

      if (!mapInstance) {
        console.warn('Map instance is unavailable or invalid, skip rendering markers')
        return
      }

      const currentZoom = mapInstance.getZoom()
      const shouldShowDetail = currentZoom >= DETAIL_VIEW_ZOOM
      const nextMode: 'cluster' | 'detail' = shouldShowDetail ? 'detail' : 'cluster'
      setMarkerMode((prev) => (prev === nextMode ? prev : nextMode))

      const overlays = (shouldShowDetail ? createDetailMarkers() : createClusterMarkers()).filter(Boolean)
      markersRef.current = overlays

      // Marker 已通过构造参数 map 挂载到地图，无需再次调用 map.add，
      // 避免高德内部偶发 overlay 列表出现 undefined 时触发 getOptions 错误。
    }

    let renderTimer = 0
    const scheduleRender = () => {
      window.clearTimeout(renderTimer)
      renderTimer = window.setTimeout(() => {
        try {
          renderMarkers()
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[MapCanvas] renderMarkers 异常:', error)
          }
        }
      }, 80)
    }

    const handleZoomEnd = () => {
      scheduleRender()
    }

    const handleMoveEnd = () => {
      if (mapInstance.getZoom() < DETAIL_VIEW_ZOOM) {
        scheduleRender()
      }
    }

    scheduleRender()
    mapInstance.on('zoomend', handleZoomEnd)
    mapInstance.on('moveend', handleMoveEnd)

    return () => {
      window.clearTimeout(renderTimer)
      mapInstance.off('zoomend', handleZoomEnd)
      mapInstance.off('moveend', handleMoveEnd)
      clearMarkers()
    }
  }, [mapInstance, posMachines, navigate, selectPOSMachine, showLabels])

  useEffect(() => {
    if (!mapInstance || !selectedPOSMachine) return
    if (typeof selectedPOSMachine.longitude !== 'number' || typeof selectedPOSMachine.latitude !== 'number') return

    try {
      mapInstance.setCenter([selectedPOSMachine.longitude, selectedPOSMachine.latitude])
      mapInstance.setZoom(DETAIL_VIEW_ZOOM)
    } catch (error) {
      console.error('Failed to focus map on selected POS:', error)
    }
  }, [mapInstance, selectedPOSMachine])

  const handleZoom = (delta: number) => {
    if (!mapInstance) return
    const currentZoom = mapInstance.getZoom()
    mapInstance.setZoom(currentZoom + delta)
  }

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] shadow-soft flex-1 relative overflow-hidden animate-fade-in-up transition-all hover:shadow-lg duration-300 border border-white/50 dark:border-slate-800 group h-full min-h-[420px] sm:min-h-[500px]"
      style={{ animationDelay: '0.3s' }}
    >
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm z-20">
          <span className="text-sm text-gray-500 dark:text-gray-300">正在加载高德地图…</span>
        </div>
      )}

      {mapReady && mapError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/80 dark:bg-slate-900/85 backdrop-blur-sm z-20">
          <div className="max-w-md w-full rounded-2xl border border-white/60 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft p-5">
            <div className="text-sm font-semibold text-soft-black dark:text-gray-100">地图无法显示</div>
            <div className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {mapError}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReloadToken((prev) => prev + 1)}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-soft-black text-white hover:bg-soft-black/90 transition"
              >
                重试加载
              </button>
              <button
                type="button"
                onClick={() => setMapError(null)}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition"
              >
                暂时关闭
              </button>
            </div>
            <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              提示：本地开发请先创建 `.env` 并填写 `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_JS_CODE`，同时在高德控制台添加当前域名到白名单。
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-6 left-4 right-4 sm:left-8 sm:right-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-soft border border-white/50 dark:border-slate-800 sm:max-w-xs animate-slide-in-left z-30 hidden sm:block">
        <h3 className="font-bold text-soft-black dark:text-gray-100 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent-yellow" />
          附近 POS 机
        </h3>
        <div className="mt-2 text-2xl font-bold text-soft-black dark:text-white">{posMachines.length}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {markerMode === 'cluster' ? '缩小时显示聚合球，点击数字先放大再查看明细' : '点击具体标记查看 POS 详情'}
        </p>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-8 flex gap-3 sm:flex-col z-30">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-2xl shadow-soft border border-white/50 dark:border-slate-800 flex gap-1.5 sm:flex-col">
          <button
            type="button"
            onClick={() => handleZoom(MAP_ZOOM_IN_DELTA)}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
          >
            <span className="text-xl font-bold">+</span>
          </button>
          <div className="w-px h-full bg-gray-100 dark:bg-slate-800 sm:w-full sm:h-px" />
          <button
            type="button"
            onClick={() => handleZoom(MAP_ZOOM_OUT_DELTA)}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
          >
            <span className="text-xl font-bold">-</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MapCanvas
