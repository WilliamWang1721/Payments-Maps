import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, MapPin, Star, Plus, Navigation, Trash2, CheckSquare, Square, RefreshCcw } from 'lucide-react'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import usePermissions from '@/hooks/usePermissions'
import Button from '@/components/ui/Button'
import FilterPanel from '@/components/modern-dashboard/FilterPanel'
import { AnimatedListItem } from '@/components/AnimatedListItem'
import { SkeletonCard } from '@/components/AnimatedLoading'
import { supabase } from '@/lib/supabase'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import { notify } from '@/lib/notify'
import { locationUtils } from '@/lib/amap'
import type { POSMachine } from '@/types'
import ActiveFiltersPanel from './list/ActiveFiltersPanel'
import POSListCard from './list/POSListCard'

interface POSMachineWithStats extends POSMachine {
  distance?: number
  review_count?: number
  reviewCount?: number
  success_rate?: number | null
}

type POSCardRenderMeta = {
  tags: string[]
  createdText: string
  categoryColor: string
  distanceText: string
}

type SortOption = 'distance' | 'rating' | 'successRate' | 'createdAt'

const SORT_LABELS: Record<SortOption, string> = {
  distance: '距离优先',
  rating: '评分优先',
  successRate: '成功率优先',
  createdAt: '添加时间优先',
}

const STATUS_LABELS: Record<POSMachine['status'], string> = {
  active: '正常运行',
  inactive: '不可用',
  maintenance: '维修中',
  disabled: '已停用',
}

const LIST_CARD_COLORS = [
  'bg-accent-yellow',
  'bg-accent-salmon',
  'bg-accent-purple',
  'bg-blue-500',
  'bg-green-500',
  'bg-indigo-500',
]

const MAX_POS_TAGS = 6
const ATTEMPT_STATS_CHUNK_SIZE = 200
const SUCCESS_RATE_PERCENT_BASE = 100
const EARTH_RADIUS_KM = 6371
const DEGREE_TO_RADIAN = Math.PI / 180
const DISTANCE_UNIT_SWITCH_KM = 1
const METERS_PER_KILOMETER = 1000
const DISTANCE_KM_DECIMALS = 1
const ZERO_COORDINATE_VALUE = 0
const SORT_SUCCESS_RATE_EMPTY = -1
const ADDRESS_REFRESH_THROTTLE_MS = 150
const SEARCH_DEBOUNCE_MS = 500
const SKELETON_CARD_COUNT = 5

const formatCreatedAt = (value?: string) => {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

const getPosTags = (pos: POSMachineWithStats) => {
  const rawTags: string[] = []

  if (pos.status && STATUS_LABELS[pos.status]) {
    rawTags.push(STATUS_LABELS[pos.status])
  }

  if (pos.basic_info?.model) {
    rawTags.push(`型号 ${pos.basic_info.model}`)
  }

  if (pos.basic_info?.acquiring_institution) {
    rawTags.push(pos.basic_info.acquiring_institution)
  }

  if (pos.basic_info?.checkout_location) {
    rawTags.push(pos.basic_info.checkout_location)
  }

  const featureFlags: Array<[boolean | undefined, string]> = [
    [pos.basic_info?.supports_contactless, '闪付'],
    [pos.basic_info?.supports_apple_pay, 'Apple Pay'],
    [pos.basic_info?.supports_google_pay, 'Google Pay'],
    [pos.basic_info?.supports_foreign_cards, '外卡友好'],
    [pos.basic_info?.supports_hce_simulation, 'HCE'],
    [pos.basic_info?.supports_dcc, 'DCC'],
    [pos.basic_info?.supports_edc, 'EDC'],
  ]

  featureFlags.forEach(([flag, label]) => {
    if (flag) rawTags.push(label)
  })

  if (pos.basic_info?.supported_card_networks?.length) {
    pos.basic_info.supported_card_networks.forEach((network) => {
      const label = getCardNetworkLabel(network) || network
      rawTags.push(label)
    })
  }

  const uniqueTags: string[] = []
  rawTags.forEach((tag) => {
    if (tag && !uniqueTags.includes(tag)) {
      uniqueTags.push(tag)
    }
  })

  return uniqueTags.slice(0, MAX_POS_TAGS)
}

const getSelectionHintText = (selectionMode: boolean, canBulkRefreshAddress: boolean) => {
  if (!selectionMode) {
    return '需要批量删除时请开启多选模式。'
  }

  if (canBulkRefreshAddress) {
    return '管理员可使用多选刷新地址（基于经纬度重新解析并覆盖地址）。删除操作不可恢复，请谨慎操作。'
  }

  return '只有你创建或拥有删除权限的POS机可以被选中。删除操作不可恢复，请谨慎操作。'
}

const List = () => {
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('distance')
  const [attemptStats, setAttemptStats] = useState<Record<string, { success: number; total: number; rate: number | null }>>({})
  const {
    posMachines,
    currentLocation,
    loading,
    searchKeyword,
    filters,
    loadPOSMachines,
    setFilters,
    resetFilters,
  } = useMapStore()
  
  const { user } = useAuthStore()
  const permissions = usePermissions()
  const { canDeleteItem } = permissions
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPOSIds, setSelectedPOSIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkRefreshingAddress, setBulkRefreshingAddress] = useState(false)
  const canBulkDelete = !permissions.isLoading && (permissions.canDelete || permissions.canDeleteAll)
  const canBulkRefreshAddress = !permissions.isLoading && permissions.isAdmin
  const selectedCount = selectedPOSIds.size
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedPOSIds(new Set())
      }
      return !prev
    })
  }, [])

  const togglePosSelection = useCallback((posId: string) => {
    setSelectedPOSIds((prev) => {
      const next = new Set(prev)
      if (next.has(posId)) {
        next.delete(posId)
      } else {
        next.add(posId)
      }
      return next
    })
  }, [])

  // 滚动容器引用，用于在数据变化后自动调整 scrollTop，避免出现空白
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPOSMachines()
  }, [loadPOSMachines])

  useEffect(() => {
    if (!canBulkDelete && selectionMode) {
      setSelectionMode(false)
      setSelectedPOSIds(new Set())
    }
  }, [canBulkDelete, selectionMode])

  useEffect(() => {
    setSelectedPOSIds((prev) => {
      if (prev.size === 0) return prev
      let mutated = false
      const next = new Set<string>()
      prev.forEach((id) => {
        if (posMachines.some((item) => item.id === id)) {
          next.add(id)
        } else {
          mutated = true
        }
      })
      return mutated ? next : prev
    })
  }, [posMachines])

  useEffect(() => {
    if (sortBy !== 'successRate') return

    let cancelled = false
    const posIds = posMachines.map((pos) => pos.id).filter(Boolean)

    if (posIds.length === 0) {
      setAttemptStats({})
      return
    }

    const uncachedPosIds = posIds.filter((id) => attemptStats[id] === undefined)
    if (uncachedPosIds.length === 0) return

    const fetchAttemptStats = async () => {
      const chunkSize = ATTEMPT_STATS_CHUNK_SIZE
      const allAttempts: Array<{ pos_id: string; result: string }> = []

      for (let index = 0; index < uncachedPosIds.length; index += chunkSize) {
        const chunkIds = uncachedPosIds.slice(index, index + chunkSize)
        const { data, error } = await supabase
          .from('pos_attempts')
          .select('pos_id, result')
          .in('pos_id', chunkIds)

        if (error) {
          throw error
        }

        allAttempts.push(...((data as Array<{ pos_id: string; result: string }>) || []))
      }

      if (cancelled) return

      const nextStats: Record<string, { success: number; total: number; rate: number | null }> = {}

      uncachedPosIds.forEach((id) => {
        nextStats[id] = { success: 0, total: 0, rate: null }
      })

      allAttempts.forEach((attempt) => {
        if (!attempt?.pos_id) return
        const current = nextStats[attempt.pos_id] || { success: 0, total: 0, rate: null }
        current.total += 1
        if (attempt.result === 'success') {
          current.success += 1
        }
        nextStats[attempt.pos_id] = current
      })

      Object.keys(nextStats).forEach((id) => {
        const stat = nextStats[id]
        stat.rate = stat.total > 0 ? (stat.success / stat.total) * SUCCESS_RATE_PERCENT_BASE : null
      })

      setAttemptStats((prev) => ({
        ...prev,
        ...nextStats,
      }))
    }

    fetchAttemptStats()
      .catch((error) => {
        if (!cancelled) {
          console.error('加载 POS 成功率数据失败:', error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [attemptStats, posMachines, sortBy])

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = (lat2 - lat1) * DEGREE_TO_RADIAN
    const dLon = (lon2 - lon1) * DEGREE_TO_RADIAN
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * DEGREE_TO_RADIAN) * Math.cos(lat2 * DEGREE_TO_RADIAN) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c
  }, [])

  const sortedPOSMachines = useMemo(() => {
    const getCreatedAtTimestamp = (value?: string) => {
      if (!value) return 0
      const timestamp = new Date(value).getTime()
      return Number.isFinite(timestamp) ? timestamp : 0
    }

    const getReviewCount = (pos: POSMachineWithStats) => {
      return pos.review_count ?? pos.reviewCount ?? 0
    }

    return [...posMachines].sort((a: POSMachineWithStats, b: POSMachineWithStats) => {
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
        const reviewDiff = getReviewCount(b) - getReviewCount(a)
        if (reviewDiff !== 0) return reviewDiff
        return getCreatedAtTimestamp(b.created_at) - getCreatedAtTimestamp(a.created_at)
      }

      if (sortBy === 'successRate') {
        const statA = attemptStats[a.id]
        const statB = attemptStats[b.id]
        const rateA = a.success_rate ?? statA?.rate ?? SORT_SUCCESS_RATE_EMPTY
        const rateB = b.success_rate ?? statB?.rate ?? SORT_SUCCESS_RATE_EMPTY
        if (rateB !== rateA) return rateB - rateA

        const totalA = statA?.total ?? 0
        const totalB = statB?.total ?? 0
        if (totalB !== totalA) return totalB - totalA

        return getCreatedAtTimestamp(b.created_at) - getCreatedAtTimestamp(a.created_at)
      }

      return getCreatedAtTimestamp(b.created_at) - getCreatedAtTimestamp(a.created_at)
    })
  }, [attemptStats, calculateDistance, currentLocation, posMachines, sortBy])

  const allSelectableIds = useMemo(
    () =>
      sortedPOSMachines
        .filter((pos) => canDeleteItem(pos.created_by || ''))
        .map((pos) => pos.id),
    [canDeleteItem, sortedPOSMachines]
  )
  const allSelectableCount = allSelectableIds.length
  const hasSelectableItems = allSelectableCount > 0
  const isAllSelected = selectionMode && hasSelectableItems && selectedCount === allSelectableCount

  const handleSelectAll = useCallback(() => {
    if (!selectionMode || !hasSelectableItems) return
    if (isAllSelected) {
      setSelectedPOSIds(new Set())
      return
    }
    setSelectedPOSIds(new Set(allSelectableIds))
  }, [allSelectableIds, hasSelectableItems, isAllSelected, selectionMode])

  const handleBulkDelete = async () => {
    if (!selectionMode || selectedCount === 0) return
    const idsToDelete = sortedPOSMachines
      .filter((pos) => selectedPOSIds.has(pos.id) && canDeleteItem(pos.created_by || ''))
      .map((pos) => pos.id)

    if (idsToDelete.length === 0) {
      notify.error('没有可删除的POS机')
      return
    }

    const confirmed = window.confirm(`确定要删除选中的 ${idsToDelete.length} 台POS机吗？此操作无法撤销。`)
    if (!confirmed) return

    setBulkDeleting(true)
    try {
      const { error } = await supabase
        .from('pos_machines')
        .delete()
        .in('id', idsToDelete)

      if (error) {
        throw error
      }

      notify.success(`已删除 ${idsToDelete.length} 台POS机`)
      setSelectedPOSIds(new Set())
      setSelectionMode(false)
      await loadPOSMachines()
    } catch (error) {
      console.error('批量删除POS机失败:', error)
      notify.error('删除失败，请重试')
    } finally {
      setBulkDeleting(false)
    }
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const handleBulkRefreshAddress = async () => {
    if (!selectionMode || selectedCount === 0) return
    if (!canBulkRefreshAddress) {
      notify.error('仅管理员可以批量刷新地址')
      return
    }

    const targets = sortedPOSMachines
      .filter((pos) => selectedPOSIds.has(pos.id))
      .filter((pos) => {
        return (
          Number.isFinite(pos.latitude) &&
          Number.isFinite(pos.longitude) &&
          pos.latitude !== ZERO_COORDINATE_VALUE &&
          pos.longitude !== ZERO_COORDINATE_VALUE
        )
      })

    if (targets.length === 0) {
      notify.error('没有可刷新的POS机')
      return
    }

    const confirmed = window.confirm(
      `确定要刷新选中的 ${targets.length} 台POS机地址吗？将使用经纬度重新解析，并覆盖当前地址字段。`
    )
    if (!confirmed) return

    if (!navigator.onLine) {
      notify.error('网络连接已断开，请检查网络后重试')
      return
    }

    setBulkRefreshingAddress(true)
    const toastId = notify.loading(`正在刷新地址... (0/${targets.length})`)
    let successCount = 0
    let failureCount = 0

    try {
      for (let index = 0; index < targets.length; index += 1) {
        const pos = targets[index]
        try {
          const resolved = await locationUtils.getAddress(pos.longitude, pos.latitude)
          if (!resolved || resolved.trim() === '') {
            throw new Error('解析结果为空')
          }

          const { error } = await supabase
            .from('pos_machines')
            .update({ address: resolved })
            .eq('id', pos.id)

          if (error) throw error
          successCount += 1
        } catch (error) {
          failureCount += 1
          console.warn('[List] 刷新地址失败:', pos.id, error)
        } finally {
          notify.loading(`正在刷新地址... (${index + 1}/${targets.length})`, { id: toastId })
          // 避免触发频控，稍作间隔
          await delay(ADDRESS_REFRESH_THROTTLE_MS)
        }
      }

      if (failureCount === 0) {
        notify.success(`地址刷新完成：${successCount} 条`, { id: toastId })
      } else {
        notify.error(`地址刷新完成：成功 ${successCount}，失败 ${failureCount}（详情见控制台）`, { id: toastId })
      }

      setSelectedPOSIds(new Set())
      setSelectionMode(false)
      await loadPOSMachines()
    } catch (error) {
      console.error('批量刷新地址失败:', error)
      notify.error('批量刷新地址失败，请重试', { id: toastId })
    } finally {
      setBulkRefreshingAddress(false)
    }
  }

  const posCardMetaById = useMemo(() => {
    const metaMap = new Map<string, POSCardRenderMeta>()

    sortedPOSMachines.forEach((pos, index) => {
      let distanceText = ''
      if (currentLocation) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          pos.latitude,
          pos.longitude
        )

        distanceText =
          distance < DISTANCE_UNIT_SWITCH_KM
            ? `${Math.round(distance * METERS_PER_KILOMETER)}m`
            : `${distance.toFixed(DISTANCE_KM_DECIMALS)}km`
      }

      metaMap.set(pos.id, {
        tags: getPosTags(pos),
        createdText: formatCreatedAt(pos.created_at),
        categoryColor: LIST_CARD_COLORS[index % LIST_CARD_COLORS.length],
        distanceText,
      })
    })

    return metaMap
  }, [calculateDistance, currentLocation, sortedPOSMachines])

  const openPOSDetail = useCallback((posId: string) => {
    navigate(`/app/pos/${posId}`)
  }, [navigate])

  const handlePOSCardClick = useCallback((posId: string, canDeleteThis: boolean) => {
    if (selectionMode) {
      if (canDeleteThis) {
        togglePosSelection(posId)
      }
      return
    }
    openPOSDetail(posId)
  }, [openPOSDetail, selectionMode, togglePosSelection])

  const handleSearch = useCallback(() => {
    loadPOSMachines().catch((error) => console.error('搜索 POS 机失败:', error))
  }, [loadPOSMachines])

  const handleApplyFilterPanel = useCallback(() => {
    loadPOSMachines().catch((error) => console.error('应用筛选失败:', error))
    setShowFilters(false)
  }, [loadPOSMachines])

  const handleResetFilterPanel = useCallback(() => {
    resetFilters()
    loadPOSMachines().catch((error) => console.error('重置筛选失败:', error))
    setShowFilters(false)
  }, [loadPOSMachines, resetFilters])

  // 监听搜索关键词变化，实现实时搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchKeyword !== undefined) {
        handleSearch()
      }
    }, SEARCH_DEBOUNCE_MS)
    
    return () => clearTimeout(timeoutId)
  }, [searchKeyword, handleSearch])

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
      <div className="h-full flex flex-col bg-cream">
        <div className="p-4 sm:p-6">
          <div className="bg-white rounded-[32px] shadow-soft border border-white/50 p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-8 w-64 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="h-12 bg-gray-200 rounded-2xl flex-1 animate-pulse" />
                <div className="flex gap-2">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse" />
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
            <div className="h-10 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="bg-white rounded-[32px] shadow-soft flex flex-col h-full border border-white/50 p-4 sm:p-6">
            <div className="space-y-4">
              {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => index + 1).map((index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-cream">
      <div className="px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-6 space-y-4">
        <div className="bg-white rounded-[32px] shadow-soft border border-white/50 p-4 sm:p-6 -mt-1 sm:-mt-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-500">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cream text-soft-black">
                  <MapPin className="w-4 h-4 text-accent-yellow" />
                  已收录 {sortedPOSMachines.length} 台POS终端
                </span>
                {currentLocation && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cream text-soft-black">
                    <Navigation className="w-4 h-4 text-accent-yellow" />
                    已获取当前位置
                  </span>
                )}
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cream text-soft-black/80">
                  <Star className="w-4 h-4 text-accent-yellow" />
                  当前排序：{SORT_LABELS[sortBy]}
                </span>
                {searchKeyword && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cream text-soft-black/80">
                    当前搜索词：{searchKeyword}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadPOSMachines()}
                  className="bg-soft-black text-white px-4 py-2 rounded-2xl text-sm font-medium hover:bg-accent-yellow transition-all hover:scale-105 shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  刷新数据
                </button>
                <div className="flex flex-wrap items-center gap-2 bg-cream text-xs font-medium text-gray-600 px-3 py-2 rounded-2xl border border-gray-100">
                  <span>排序：</span>
                  <button
                    type="button"
                    onClick={() => setSortBy('distance')}
                    className={`px-2 py-1 rounded-full transition-colors ${sortBy === 'distance' ? 'bg-soft-black text-white shadow' : 'text-soft-black/70 hover:text-soft-black'}`}
                  >
                    距离优先
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('rating')}
                    className={`px-2 py-1 rounded-full transition-colors ${sortBy === 'rating' ? 'bg-soft-black text-white shadow' : 'text-soft-black/70 hover:text-soft-black'}`}
                  >
                    评分优先
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('successRate')}
                    className={`px-2 py-1 rounded-full transition-colors ${sortBy === 'successRate' ? 'bg-soft-black text-white shadow' : 'text-soft-black/70 hover:text-soft-black'}`}
                  >
                    成功率优先
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('createdAt')}
                    className={`px-2 py-1 rounded-full transition-colors ${sortBy === 'createdAt' ? 'bg-soft-black text-white shadow' : 'text-soft-black/70 hover:text-soft-black'}`}
                  >
                    添加时间优先
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-gray-600 hover:text-accent-yellow transition-all"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    筛选
                  </button>
                </div>
                {canBulkDelete && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={selectionMode ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={toggleSelectionMode}
                      className={selectionMode ? 'bg-soft-black text-white hover:bg-soft-black/90 border-transparent' : ''}
                    >
                      {selectionMode ? (
                        <CheckSquare className="w-4 h-4 mr-2" />
                      ) : (
                        <Square className="w-4 h-4 mr-2" />
                      )}
                      {selectionMode ? '退出多选' : '开启多选'}
                    </Button>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      disabled={!selectionMode || !hasSelectableItems}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl text-soft-black hover:border-soft-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {isAllSelected ? '取消全选' : canBulkRefreshAddress ? '全选当前列表' : '全选可删除'}
                      {hasSelectableItems && (
                        <span className="text-[10px] text-gray-500">({allSelectableCount})</span>
                      )}
                    </button>
                    {selectionMode && (
                      <>
                        <span className="text-xs font-medium text-gray-600">
                          已选择 {selectedCount} 台
                        </span>
                        {canBulkRefreshAddress && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleBulkRefreshAddress}
                            disabled={!selectedCount || bulkRefreshingAddress || bulkDeleting}
                            loading={bulkRefreshingAddress}
                            className="shadow-none"
                          >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            刷新地址
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={!selectedCount || bulkDeleting}
                          loading={bulkDeleting}
                          className="shadow-none"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除已选
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {canBulkDelete && (
              <p className="text-xs text-gray-500">
                {getSelectionHintText(selectionMode, canBulkRefreshAddress)}
              </p>
            )}
            <ActiveFiltersPanel
              filters={filters}
              onClearFilter={setFilters}
              onClearAll={() => setFilters({})}
            />
          </div>
        </div>
      </div>

      {/* POS机列表 */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="bg-white rounded-[32px] shadow-soft flex flex-col h-full border border-white/50">
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-5 sm:p-10 pt-5 custom-scrollbar"
          >
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedPOSMachines.map((pos: POSMachineWithStats, index) => {
                  const cardMeta = posCardMetaById.get(pos.id)
                  const canDeleteThis = canDeleteItem(pos.created_by || '')
                  const isSelected = selectedPOSIds.has(pos.id)

                  return (
                    <AnimatedListItem
                      key={pos.id}
                      index={index}
                      direction="up"
                      onClick={() => handlePOSCardClick(pos.id, canDeleteThis)}
                    >
                      <POSListCard
                        pos={pos}
                        canDelete={canDeleteThis}
                        isSelected={isSelected}
                        selectionMode={selectionMode}
                        searchKeyword={searchKeyword}
                        tags={cardMeta?.tags || []}
                        createdText={cardMeta?.createdText || ''}
                        categoryColor={cardMeta?.categoryColor || LIST_CARD_COLORS[0]}
                        distanceText={cardMeta?.distanceText || ''}
                        onToggleSelection={togglePosSelection}
                        onOpenDetail={openPOSDetail}
                      />
                    </AnimatedListItem>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        onReset={handleResetFilterPanel}
        onApply={handleApplyFilterPanel}
      />
    </div>
  )

}

export default List
