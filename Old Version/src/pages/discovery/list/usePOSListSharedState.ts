import { useMapStore, type MapState } from '@/stores/useMapStore'

type POSListSharedState = Pick<
  MapState,
  'posMachines' | 'currentLocation' | 'loading' | 'searchKeyword' | 'filters' | 'loadPOSMachines' | 'setFilters' | 'resetFilters'
>

export const usePOSListSharedState = (): POSListSharedState => {
  const posMachines = useMapStore((state) => state.posMachines)
  const currentLocation = useMapStore((state) => state.currentLocation)
  const loading = useMapStore((state) => state.loading)
  const searchKeyword = useMapStore((state) => state.searchKeyword)
  const filters = useMapStore((state) => state.filters)
  const loadPOSMachines = useMapStore((state) => state.loadPOSMachines)
  const setFilters = useMapStore((state) => state.setFilters)
  const resetFilters = useMapStore((state) => state.resetFilters)

  return {
    posMachines,
    currentLocation,
    loading,
    searchKeyword,
    filters,
    loadPOSMachines,
    setFilters,
    resetFilters,
  }
}
