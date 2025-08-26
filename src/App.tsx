import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import VersionUpdateModal from '@/components/VersionUpdateModal'
import { supabase, type User } from '@/lib/supabase'

function App() {
  const { initialize, setUser } = useAuthStore()
  const { showVersionModal, versionInfo, closeVersionModal } = useVersionCheck()

  useEffect(() => {
    initialize()

    // 监听 Supabase 认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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

    return () => {
      authListener?.subscription.unsubscribe()
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
