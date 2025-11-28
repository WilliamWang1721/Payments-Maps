import { useOutletContext } from 'react-router-dom'
import MapCanvas from '@/components/modern-dashboard/MapCanvas'
import { type LayoutOutletContext } from '@/components/Layout'

const Map = () => {
  const context = useOutletContext<LayoutOutletContext>()
  const showLabels = context?.showLabels ?? true

  return <MapCanvas showLabels={showLabels} />
}

export default Map
