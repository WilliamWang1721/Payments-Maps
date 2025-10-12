import { useEffect } from 'react'

/**
 * Ensures that the CSS variable `--app-height` always reflects the actual viewport
 * height on iOS Safari and other mobile browsers where the `100vh` unit can be
 * inaccurate because of dynamic toolbars.
 */
const useDynamicViewportHeight = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const setAppHeight = () => {
      const viewport = window.visualViewport
      const height = viewport ? viewport.height : window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${height}px`)
    }

    setAppHeight()

    window.addEventListener('resize', setAppHeight)
    window.addEventListener('orientationchange', setAppHeight)

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', setAppHeight)
    viewport?.addEventListener('scroll', setAppHeight)

    return () => {
      window.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', setAppHeight)
      viewport?.removeEventListener('resize', setAppHeight)
      viewport?.removeEventListener('scroll', setAppHeight)
    }
  }, [])
}

export default useDynamicViewportHeight
