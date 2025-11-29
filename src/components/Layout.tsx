import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import OnboardingDetector from '@/components/OnboardingDetector'
import PageTransition from '@/components/PageTransition'
import ModernSidebar from '@/components/modern-dashboard/Sidebar'
import ModernHeader from '@/components/modern-dashboard/Header'
import MobileNav from '@/components/modern-dashboard/MobileNav'
import { useMapStore } from '@/stores/useMapStore'
import { parseSearchInput } from '@/utils/searchParser'

export type LayoutOutletContext = {
  showLabels: boolean
}

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const searchKeyword = useMapStore((state) => state.searchKeyword)
  const setSearchQuery = useMapStore((state) => state.setSearchQuery)
  const setSearchKeyword = useMapStore((state) => state.setSearchKeyword)
  const loadPOSMachines = useMapStore((state) => state.loadPOSMachines)
  const getCurrentLocation = useMapStore((state) => state.getCurrentLocation)
  const locationLoading = useMapStore((state) => state.locationLoading)

  const [searchValue, setSearchValue] = useState(searchKeyword)
  const [showLabels, setShowLabels] = useState(true)
  const hideHeaderControls =
    location.pathname.startsWith('/app/profile') || location.pathname.startsWith('/app/brands')
  const isMapPage = location.pathname.startsWith('/app/map')

  useEffect(() => {
    setSearchValue(searchKeyword)
  }, [searchKeyword])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    setSearchKeyword(value)
  }

  const handleSearchSubmit = (value?: string) => {
    const nextValue = typeof value === 'string' ? value : searchValue
    const parsed = parseSearchInput(nextValue || '')
    setSearchValue(nextValue)
    setSearchQuery(parsed)
    loadPOSMachines()
      .catch((error) => console.error('搜索 POS 机失败:', error))
  }

  const handleFilterClick = () => {
    navigate('/app/map?view=filters')
  }

  const handleLocate = () => {
    getCurrentLocation().catch((error) => console.warn('定位失败:', error))
  }

  return (
    <OnboardingDetector>
      <>
        <div className="flex min-h-screen md:h-screen flex-col md:flex-row bg-cream dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans overflow-hidden text-soft-black dark:text-gray-100">
          <ModernSidebar />

          <main className={`flex-1 ml-0 md:ml-6 lg:ml-8 max-w-screen-2xl w-full mx-auto flex flex-col min-h-[70vh] pb-28 md:pb-0 md:overflow-hidden ${isMapPage ? 'pb-0 overflow-hidden' : ''}`}>
            <div className="sticky top-0 z-30 bg-cream dark:bg-slate-950 pb-4">
              <ModernHeader
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleSearchSubmit}
                onFilterClick={handleFilterClick}
                onLocate={handleLocate}
                locating={locationLoading}
                showLabels={showLabels}
                onToggleLabels={() => setShowLabels((prev) => !prev)}
                hideControls={hideHeaderControls}
              />
            </div>

            <div className={`flex-1 w-full h-full pb-2 ${isMapPage ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
              <PageTransition variant="fadeIn">
                <Outlet context={{ showLabels }} />
              </PageTransition>
            </div>
          </main>
        </div>
        <MobileNav />
      </>
    </OnboardingDetector>
  )
}

export default Layout
