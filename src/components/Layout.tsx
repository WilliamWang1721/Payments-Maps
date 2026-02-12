import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import OnboardingDetector from '@/components/OnboardingDetector'
import PageTransition from '@/components/PageTransition'
import ModernSidebar from '@/components/modern-dashboard/Sidebar'
import ModernHeader from '@/components/modern-dashboard/Header'
import MobileNav from '@/components/modern-dashboard/MobileNav'
import { useMapStore } from '@/stores/useMapStore'
import { parseSearchInput } from '@/utils/searchParser'
import { notify } from '@/lib/notify'
import { locationUtils } from '@/lib/amap'

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
  const mapInstance = useMapStore((state) => state.mapInstance)

  const [searchValue, setSearchValue] = useState(searchKeyword)
  const [showLabels, setShowLabels] = useState(true)
  const hideHeaderControls =
    location.pathname.startsWith('/app/profile') || location.pathname.startsWith('/app/brands')
  const isMapPage = location.pathname.startsWith('/app/map')
  const isCardAlbumPage = location.pathname.startsWith('/app/card-album')
  const searchPlaceholder = isCardAlbumPage
    ? '搜索卡片：卡BIN / 卡名 / 发卡行 / 卡组织'
    : '全域搜索：商户 / 地址 / 坐标 / 收单机构 / 时间'

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

    if (isMapPage && mapInstance && parsed.keyword && !parsed.coordinates) {
      locationUtils
        .getCoordinatesByAddress(parsed.keyword)
        .then(({ longitude, latitude }) => {
          mapInstance.setCenter([longitude, latitude])
          mapInstance.setZoom(15)
          notify.success('已根据输入地址完成手动定位')
        })
        .catch(() => {
          // 地址可能不是定位地址（例如商户关键字），忽略解析失败并继续执行搜索
        })
    }

    if (isCardAlbumPage) {
      return
    }
    loadPOSMachines()
      .catch((error) => console.error('搜索 POS 机失败:', error))
  }

  const handleFilterClick = () => {
    navigate('/app/map?view=filters')
  }

  const handleLocate = () => {
    getCurrentLocation().catch((error) => {
      console.warn('定位失败:', error)
      notify.critical('无法获取当前位置，请在右上角搜索框输入当前地址进行手动定位。', {
        title: '定位失败',
      })
    })
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
                searchPlaceholder={searchPlaceholder}
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
