import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useAuthStore } from '@/stores/useAuthStore'

function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster 
        position="top-center"
        richColors
        closeButton
        duration={3000}
      />
    </>
  )
}

export default App
