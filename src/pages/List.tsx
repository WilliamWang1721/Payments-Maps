import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, MapPin, Star, Plus, Navigation, Calendar, MoreHorizontal, ArrowRight, Trash2, CheckSquare, Square } from 'lucide-react'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import usePermissions from '@/hooks/usePermissions'
import Button from '@/components/ui/Button'
import FilterPanel from '@/components/modern-dashboard/FilterPanel'
import { AnimatedListItem } from '../components/AnimatedListItem'
import { SkeletonCard } from '@/components/AnimatedLoading'
import { supabase, type POSMachine } from '@/lib/supabase'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import { HighlightText } from '../components/HighlightText'
import { toast } from 'sonner'

interface POSMachineWithStats extends POSMachine {
  distance?: number
  review_count?: number
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

  return uniqueTags.slice(0, 6)
}

const List = () => {
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')
  const {
    posMachines,
    currentLocation,
    loading,
    searchKeyword,
    filters,
    loadPOSMachines,
    setFilters,
    getCurrentLocation,
    resetFilters,
  } = useMapStore()
  
  const { user } = useAuthStore()
  const permissions = usePermissions()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPOSIds, setSelectedPOSIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const canBulkDelete = !permissions.isLoading && (permissions.canDelete || permissions.canDeleteAll)
  const selectedCount = selectedPOSIds.size
  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedPOSIds(new Set())
      }
      return !prev
    })
  }

  const togglePosSelection = (posId: string) => {
    setSelectedPOSIds((prev) => {
      const next = new Set(prev)
      if (next.has(posId)) {
        next.delete(posId)
      } else {
        next.add(posId)
      }
      return next
    })
  }

  // 滚动容器引用，用于在数据变化后自动调整 scrollTop，避免出现空白
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPOSMachines()
  }, [loadPOSMachines])

  useEffect(() => {
    if (currentLocation) return
    getCurrentLocation().catch(() => {
      console.warn('无法获取当前位置')
    })
  }, [currentLocation, getCurrentLocation])

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

  const allSelectableIds = sortedPOSMachines
    .filter((pos) => permissions.canDeleteItem(pos.created_by || ''))
    .map((pos) => pos.id)
  const allSelectableCount = allSelectableIds.length
  const hasSelectableItems = allSelectableCount > 0
  const isAllSelected = selectionMode && hasSelectableItems && selectedCount === allSelectableCount

  const handleSelectAll = () => {
    if (!selectionMode || !hasSelectableItems) return
    if (isAllSelected) {
      setSelectedPOSIds(new Set())
      return
    }
    setSelectedPOSIds(new Set(allSelectableIds))
  }

  const handleBulkDelete = async () => {
    if (!selectionMode || selectedCount === 0) return
    const idsToDelete = sortedPOSMachines
      .filter((pos) => selectedPOSIds.has(pos.id) && permissions.canDeleteItem(pos.created_by || ''))
      .map((pos) => pos.id)

    if (idsToDelete.length === 0) {
      toast.error('没有可删除的POS机')
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

      toast.success(`已删除 ${idsToDelete.length} 台POS机`)
      setSelectedPOSIds(new Set())
      setSelectionMode(false)
      await loadPOSMachines()
    } catch (error) {
      console.error('批量删除POS机失败:', error)
      toast.error('删除失败，请重试')
    } finally {
      setBulkDeleting(false)
    }
  }

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

  const handleSearch = useCallback(() => {
    loadPOSMachines().catch((error) => console.error('搜索 POS 机失败:', error))
  }, [loadPOSMachines])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0)
    if (el.scrollTop > maxScrollTop) {
      el.scrollTop = maxScrollTop
    }
  }, [sortedPOSMachines.length])

  // 监听搜索关键词变化，实现实时搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchKeyword !== undefined) {
        handleSearch()
      }
    }, 500) // 500ms防抖
    
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
              {[1, 2, 3, 4, 5].map((index) => (
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
                  当前排序：{sortBy === 'distance' ? '距离优先' : '评分优先'}
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
                      {isAllSelected ? '取消全选' : '全选可删除'}
                      {hasSelectableItems && (
                        <span className="text-[10px] text-gray-500">({allSelectableCount})</span>
                      )}
                    </button>
                    {selectionMode && (
                      <>
                        <span className="text-xs font-medium text-gray-600">
                          已选择 {selectedCount} 台
                        </span>
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
                {selectionMode
                  ? '只有你创建或拥有删除权限的POS机可以被选中。删除操作不可恢复，请谨慎操作。'
                  : '需要批量删除时请开启多选模式。'}
              </p>
            )}

            {Object.keys(filters).some(key => filters[key as keyof typeof filters]) && (
              <div className="bg-cream rounded-3xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
                  <Filter className="w-4 h-4" />
                  已应用筛选
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.supportsApplePay && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Apple Pay
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsApplePay: false })}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsGooglePay && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Google Pay
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsGooglePay: false })}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsContactless && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      闪付支持
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsContactless: false })}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsHCE && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                      HCE 模拟
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsHCE: false })}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsVisa && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Visa
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsVisa: false })}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsMastercard && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-red-100 text-red-800">
                      Mastercard
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsMastercard: false })}
                        className="ml-1 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsUnionPay && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-red-100 text-red-800">
                      银联
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsUnionPay: false })}
                        className="ml-1 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsAmex && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      American Express
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsAmex: false })}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsJCB && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                      JCB
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsJCB: false })}
                        className="ml-1 text-yellow-600 hover:text-yellow-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsDiners && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                      Diners Club
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsDiners: false })}
                        className="ml-1 text-gray-600 hover:text-gray-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsSmallAmountExemption && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800">
                      小额免密
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsSmallAmountExemption: false })}
                        className="ml-1 text-emerald-600 hover:text-emerald-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsPinVerification && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      PIN 验证
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsPinVerification: false })}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsSignatureVerification && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-pink-100 text-pink-800">
                      签名验证
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsSignatureVerification: false })}
                        className="ml-1 text-pink-600 hover:text-pink-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsDCC && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-cyan-100 text-cyan-800">
                      DCC 支持
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsDCC: false })}
                        className="ml-1 text-cyan-600 hover:text-cyan-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.supportsEDC && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                      EDC 支持
                      <button
                        type="button"
                        onClick={() => setFilters({ supportsEDC: false })}
                        className="ml-1 text-teal-600 hover:text-teal-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.acquiringInstitution && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                      {filters.acquiringInstitution}
                      <button
                        type="button"
                        onClick={() => setFilters({ acquiringInstitution: undefined })}
                        className="ml-1 text-slate-600 hover:text-slate-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.posModel && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                      {filters.posModel}
                      <button
                        type="button"
                        onClick={() => setFilters({ posModel: undefined })}
                        className="ml-1 text-amber-600 hover:text-amber-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilters({})}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    清除全部
                  </button>
                </div>
              </div>
            )}
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
                const tags = getPosTags(pos)
                const createdText = formatCreatedAt(pos.created_at)
                const displayName = pos.merchant_name || pos.address || 'POS机'
                const badgeLetter = displayName.charAt(0)
                const categoryColor = LIST_CARD_COLORS[index % LIST_CARD_COLORS.length]
                const canDeleteThis = permissions.canDeleteItem(pos.created_by || '')
                const isSelected = selectedPOSIds.has(pos.id)

                const handleItemClick = () => {
                  if (selectionMode) {
                    if (canDeleteThis) {
                      togglePosSelection(pos.id)
                    }
                    return
                  }
                  navigate(`/app/pos/${pos.id}`)
                }

                const cardClassName = [
                  'group relative bg-white border border-gray-100 rounded-3xl p-6 flex flex-col gap-6 transition-all duration-300 hover:shadow-soft hover:border-blue-100 hover:translate-x-0.5 cursor-pointer',
                  selectionMode && isSelected ? 'border-blue-300 bg-blue-50/50 shadow-soft' : '',
                  selectionMode && !canDeleteThis ? 'cursor-not-allowed opacity-90' : ''
                ].join(' ').trim()

                return (
                  <AnimatedListItem
                    key={pos.id}
                    index={index}
                    direction="up"
                    onClick={handleItemClick}
                  >
                    <div className={cardClassName}>
                      <div className="flex items-start gap-5 flex-1">
                        {selectionMode && (
                          <label
                            className={`flex-shrink-0 mt-1 ${canDeleteThis ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-soft-black border-gray-300 rounded focus:ring-soft-black"
                              disabled={!canDeleteThis}
                              checked={isSelected}
                              onChange={(event) => {
                                event.stopPropagation()
                                if (canDeleteThis) {
                                  togglePosSelection(pos.id)
                                }
                              }}
                              aria-label={`选择 ${displayName}`}
                            />
                          </label>
                        )}
                        <div className={`w-14 h-14 rounded-2xl ${categoryColor} flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-300`}>
                          <span className="font-bold text-lg">{badgeLetter}</span>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          <h3 className="font-bold text-lg text-soft-black group-hover:text-accent-yellow transition-colors">
                            <HighlightText
                              text={pos.merchant_name}
                              searchKeyword={searchKeyword}
                            />
                          </h3>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">
                              <HighlightText
                                text={pos.address}
                                searchKeyword={searchKeyword}
                              />
                            </span>
                          </div>
                          {pos.basic_info?.acquiring_institution && (
                            <div className="text-xs font-medium text-gray-500">
                              收单机构：<span className="text-soft-black">{pos.basic_info.acquiring_institution}</span>
                            </div>
                          )}
                          {pos.remarks && (
                            <div className="text-xs text-gray-500 bg-cream px-3 py-1.5 rounded-2xl inline-flex items-center border border-transparent">
                              <span className="truncate">{pos.remarks}</span>
                            </div>
                          )}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-cream text-gray-500 border border-transparent hover:border-accent-yellow/30 hover:text-accent-yellow transition-colors"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {currentLocation && (
                            <div className="flex items-center gap-1.5 text-accent-yellow font-bold text-sm bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                              <Navigation className="w-3.5 h-3.5" />
                              {formatDistance(pos)}
                            </div>
                          )}
                          {createdText && (
                            <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-medium whitespace-nowrap">
                              <Calendar className="w-3 h-3" />
                              {createdText}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-soft-black hover:text-white hover:border-transparent transition-all active:scale-95 group/btn"
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate(`/app/pos/${pos.id}`)
                            }}
                          >
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                          <button
                            type="button"
                            className="p-2 text-gray-300 hover:text-soft-black transition-colors rounded-full hover:bg-gray-50"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
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
        onReset={() => {
          resetFilters()
          loadPOSMachines()
            .catch((error) => console.error('重置筛选失败:', error))
          setShowFilters(false)
        }}
        onApply={() => {
          loadPOSMachines()
            .catch((error) => console.error('应用筛选失败:', error))
          setShowFilters(false)
        }}
      />
    </div>
  )

}

export default List
