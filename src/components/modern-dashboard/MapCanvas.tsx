import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadAMap, DEFAULT_MAP_CONFIG } from '@/lib/amap'
import { useMapStore } from '@/stores/useMapStore'
import { useNavigate } from 'react-router-dom'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return '#4318FF'
    case 'inactive':
      return '#94A3B8'
    case 'maintenance':
      return '#FBBF24'
    case 'disabled':
      return '#EF4444'
    default:
      return '#05CD99'
  }
}

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

type MapCanvasProps = {
  showLabels: boolean
}

const MapCanvas = ({ showLabels }: MapCanvasProps) => {
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<AMap.Marker[]>([])
  const doubleClickHandlerRef = useRef<((e: any) => void) | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const mapInstance = useMapStore((state) => state.mapInstance)
  const setMapInstance = useMapStore((state) => state.setMapInstance)
  const posMachines = useMapStore((state) => state.posMachines)
  const loadPOSMachines = useMapStore((state) => state.loadPOSMachines)
  const selectPOSMachine = useMapStore((state) => state.selectPOSMachine)
  const selectedPOSMachine = useMapStore((state) => state.selectedPOSMachine)
  const getCurrentLocation = useMapStore((state) => state.getCurrentLocation)

  useEffect(() => {
    let destroyed = false
    let localMap: AMap.Map | null = null

    const initMap = async () => {
      if (!mapContainerRef.current) return
      try {
        const AMap = await loadAMap()
        if (destroyed) return

        localMap = new AMap.Map(mapContainerRef.current, {
          ...DEFAULT_MAP_CONFIG,
          zoom: 12,
        })

        // 禁用默认双击缩放，避免和快速添加位置的交互冲突
        localMap.setStatus({ doubleClickZoom: false })

        const handleDoubleClick = (e: any) => {
          const lngLat = e?.lnglat
          const lng = typeof lngLat?.getLng === 'function' ? lngLat.getLng() : lngLat?.lng
          const lat = typeof lngLat?.getLat === 'function' ? lngLat.getLat() : lngLat?.lat

          if (
            typeof lng === 'number' &&
            typeof lat === 'number' &&
            Number.isFinite(lng) &&
            Number.isFinite(lat)
          ) {
            navigate(`/app/add-pos?lat=${lat}&lng=${lng}`)
          }
        }

        doubleClickHandlerRef.current = handleDoubleClick
        localMap.on('dblclick', handleDoubleClick)

        setMapInstance(localMap)
        setMapReady(true)

        try {
          await getCurrentLocation()
        } catch (error) {
          console.warn('获取当前位置失败:', error)
        }
      } catch (error) {
        console.error('初始化高德地图失败:', error)
        setMapReady(true)
      }
    }

    initMap()

    return () => {
      destroyed = true
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
      if (localMap) {
        if (doubleClickHandlerRef.current) {
          localMap.off('dblclick', doubleClickHandlerRef.current)
        }
        localMap.destroy()
      }
      doubleClickHandlerRef.current = null
      setMapInstance(null)
      setMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapInstance) return
    loadPOSMachines().catch((error) => console.error('加载POS机数据失败:', error))
  }, [mapInstance, loadPOSMachines])

  useEffect(() => {
    const AMap = (window as any).AMap
    if (!mapInstance || !AMap) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    const markers: AMap.Marker[] = []
    posMachines.forEach((pos) => {
      if (typeof pos.longitude !== 'number' || typeof pos.latitude !== 'number') return

      const statusColor = getStatusColor(pos.status || 'active')
      const marker = new AMap.Marker({
        position: [pos.longitude, pos.latitude],
        title: pos.merchant_name,
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, -8),
        content: createMarkerContent(statusColor, pos.merchant_name, showLabels),
      })

      marker.on('click', () => {
        selectPOSMachine(pos)
        navigate(`/app/pos/${pos.id}`)
      })

      markers.push(marker)
    })

    const overlays = markers.filter(Boolean)
    markersRef.current = overlays

    if (!mapInstance || typeof mapInstance.add !== 'function') {
      console.warn('Map instance is unavailable or invalid, skip rendering markers')
      return
    }

    if (overlays.length > 0) {
      try {
        mapInstance.add(overlays)
      } catch (error) {
        console.error('Failed to add markers to map:', error)
      }
    }
  }, [mapInstance, posMachines, navigate, selectPOSMachine, showLabels])

  useEffect(() => {
    if (!mapInstance || !selectedPOSMachine) return
    if (typeof selectedPOSMachine.longitude !== 'number' || typeof selectedPOSMachine.latitude !== 'number') return

    try {
      mapInstance.setCenter([selectedPOSMachine.longitude, selectedPOSMachine.latitude])
      mapInstance.setZoom(15)
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

      <div className="absolute top-6 left-4 right-4 sm:left-8 sm:right-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-soft border border-white/50 dark:border-slate-800 sm:max-w-xs animate-slide-in-left z-30 hidden sm:block">
        <h3 className="font-bold text-soft-black dark:text-gray-100 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent-yellow" />
          附近 POS 机
        </h3>
        <div className="mt-2 text-2xl font-bold text-soft-black dark:text-white">{posMachines.length}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">点击标记查看详细信息</p>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-8 flex gap-3 sm:flex-col z-30">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-2xl shadow-soft border border-white/50 dark:border-slate-800 flex gap-1.5 sm:flex-col">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
          >
            <span className="text-xl font-bold">+</span>
          </button>
          <div className="w-px h-full bg-gray-100 dark:bg-slate-800 sm:w-full sm:h-px" />
          <button
            type="button"
            onClick={() => handleZoom(-1)}
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
