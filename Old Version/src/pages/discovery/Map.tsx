import { useOutletContext } from 'react-router-dom'
import { type LayoutOutletContext } from '@/components/Layout'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import MapPageView from './map/MapPageView'
import { useMapFilters } from './map/useMapFilters'

const Map = () => {
  const context = useOutletContext<LayoutOutletContext>()
  const showLabels = context?.showLabels ?? true
  const { filterOpen, filters, setFilters, handleApplyFilters, handleResetFilters, closeFilters } = useMapFilters()

  useBodyScrollLock(true, { includeHtml: true })

  return (
    <MapPageView
      showLabels={showLabels}
      filterOpen={filterOpen}
      filters={filters}
      setFilters={setFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      onClose={closeFilters}
    />
  )
}

export default Map
