import { useEffect } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import MapCanvas from '@/components/modern-dashboard/MapCanvas'
import FilterPanel from '@/components/modern-dashboard/FilterPanel'
import { type LayoutOutletContext } from '@/components/Layout'
import { useMapStore } from '@/stores/useMapStore'

const Map = () => {
  const context = useOutletContext<LayoutOutletContext>()
  const showLabels = context?.showLabels ?? true
  const [searchParams, setSearchParams] = useSearchParams()
  const filterOpen = searchParams.get('view') === 'filters'

  const { filters, setFilters, loadPOSMachines, resetFilters } = useMapStore()

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

  const closeFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('view')
    setSearchParams(next, { replace: true })
  }

  const handleApplyFilters = () => {
    loadPOSMachines().catch((error) => console.error('应用地图筛选失败:', error))
    closeFilters()
  }

  const handleResetFilters = () => {
    resetFilters()
    loadPOSMachines().catch((error) => console.error('重置地图筛选失败:', error))
    closeFilters()
  }

  return (
    <>
      <div className="w-full h-full overflow-hidden">
        <MapCanvas showLabels={showLabels} />
      </div>
      <FilterPanel
        isOpen={filterOpen}
        onClose={closeFilters}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </>
  )
}

export default Map
