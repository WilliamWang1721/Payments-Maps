import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'
import usePersistedLanguage from '@/hooks/usePersistedLanguage'
import CriticalErrorModal from '@/components/notifications/CriticalErrorModal'

function App() {
  const { initialize, setUser } = useAuthStore()
  usePersistedLanguage()

  useEffect(() => {
    initialize()

    // 监听 Supabase 认证状态变化
    let authListener: any = null
    
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event)
        if (event === 'SIGNED_IN' && session) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_metadata: {
              display_name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
              provider: session.user.app_metadata?.provider || 'google',
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
              trust_level: session.user.user_metadata?.trust_level || 0,
              role: session.user.user_metadata?.role || 'user',
            }
          }
          setUser(user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      })
      authListener = data
    } catch (error) {
      console.warn('Failed to setup auth listener:', error)
    }

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [initialize, setUser])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
        offset={24}
        toastOptions={{
          className: 'toast-notification app-toast',
          descriptionClassName: 'app-toast__description',
        }}
      />
      <CriticalErrorModal />
    </>
  )
}

export default App
