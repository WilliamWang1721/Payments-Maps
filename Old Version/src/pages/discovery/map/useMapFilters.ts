import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMapStore, type MapState } from '@/stores/useMapStore'

type MapFilterController = {
  filterOpen: boolean
  filters: MapState['filters']
  setFilters: MapState['setFilters']
  handleApplyFilters: () => void
  handleResetFilters: () => void
  closeFilters: () => void
}

const FILTER_VIEW_PARAM = 'view'
const FILTER_VIEW_VALUE = 'filters'

export const useMapFilters = (): MapFilterController => {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterOpen = searchParams.get(FILTER_VIEW_PARAM) === FILTER_VIEW_VALUE

  const filters = useMapStore((state) => state.filters)
  const setFilters = useMapStore((state) => state.setFilters)
  const loadPOSMachines = useMapStore((state) => state.loadPOSMachines)
  const resetFilters = useMapStore((state) => state.resetFilters)

  const closeFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete(FILTER_VIEW_PARAM)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const refreshPOSMachines = useCallback(
    (actionLabel: string) => {
      loadPOSMachines().catch((error) => console.error(`${actionLabel}地图筛选失败:`, error))
    },
    [loadPOSMachines]
  )

  const handleApplyFilters = useCallback(() => {
    refreshPOSMachines('应用')
    closeFilters()
  }, [refreshPOSMachines, closeFilters])

  const handleResetFilters = useCallback(() => {
    resetFilters()
    refreshPOSMachines('重置')
    closeFilters()
  }, [resetFilters, refreshPOSMachines, closeFilters])

  return {
    filterOpen,
    filters,
    setFilters,
    handleApplyFilters,
    handleResetFilters,
    closeFilters,
  }
}
