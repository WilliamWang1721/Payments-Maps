import MapCanvas from '@/components/modern-dashboard/MapCanvas'
import FilterPanel from '@/components/modern-dashboard/FilterPanel'
import { type MapState } from '@/stores/useMapStore'

type MapPageViewProps = {
  showLabels: boolean
  filterOpen: boolean
  filters: MapState['filters']
  setFilters: MapState['setFilters']
  onApply: () => void
  onReset: () => void
  onClose: () => void
}

const MapPageView = ({
  showLabels,
  filterOpen,
  filters,
  setFilters,
  onApply,
  onReset,
  onClose,
}: MapPageViewProps) => {
  return (
    <>
      <div className={`w-full h-full overflow-hidden transition-all duration-300 ${filterOpen ? 'blur-sm' : ''}`}>
        <MapCanvas showLabels={showLabels} />
      </div>

      <FilterPanel
        isOpen={filterOpen}
        onClose={onClose}
        filters={filters}
        setFilters={setFilters}
        onApply={onApply}
        onReset={onReset}
        variant="map"
      />
    </>
  )
}

export default MapPageView
