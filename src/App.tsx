import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import VersionUpdateModal from '@/components/VersionUpdateModal'

function App() {
  const { initialize } = useAuthStore()
  const { showVersionModal, versionInfo, closeVersionModal } = useVersionCheck()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster 
        position="top-center"
        richColors
        closeButton
        duration={3000}
      />
      <VersionUpdateModal 
        isOpen={showVersionModal}
        onClose={closeVersionModal}
        versionInfo={versionInfo}
      />
    </>
  )
}

export default App
