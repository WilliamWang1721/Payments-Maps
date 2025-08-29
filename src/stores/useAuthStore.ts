import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type User, supabase } from '@/lib/supabase'
import { loginWithLinuxDO, getCurrentLinuxDOUser, logoutLinuxDO, refreshLinuxDOUser } from '@/lib/linuxdo-auth'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  loginWithLinuxDO: () => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(persist(
  (set) => {
    return {
      user: null,
      loading: false,
      initialized: false,

      setUser: (user: User | null) => {
        set({ user })
      },

      loginWithLinuxDO: () => {
        set({ loading: true })
        try {
          loginWithLinuxDO()
          // LinuxDO OAuth 会自动处理重定向
        } catch (error) {
          console.error('LinuxDO 登录失败:', error)
          set({ loading: false })
          throw error
        }
      },

      logout: async () => {
        set({ loading: true })
        try {
          // 先尝试登出Supabase
          const { error: supabaseError } = await supabase.auth.signOut()
          if (supabaseError) {
            console.error('Supabase 登出失败:', supabaseError)
          }
          
          // 再尝试登出LinuxDO
          await logoutLinuxDO()
          
          set({ 
            user: null,
            loading: false,
            initialized: true
          })
          
          // 清除localStorage中的持久化数据
          localStorage.removeItem('auth-storage')
        } catch (error) {
          console.error('登出失败:', error)
          set({ loading: false })
          throw error
        }
      },

      initialize: async () => {
        set({ loading: true })
        
        try {
          // 首先检查 Supabase 会话
          try {
            const { data: { session }, error: supabaseError } = await supabase.auth.getSession()
            
            if (session?.user && !supabaseError) {
              // 如果有 Supabase 会话，使用 Supabase 用户
              const supabaseUser: User = {
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
              
              set({ 
                user: supabaseUser,
                loading: false,
                initialized: true
              })
              return
            }
          } catch (supabaseError) {
            console.warn('Supabase session check failed:', supabaseError)
          }
          
          // 如果没有 Supabase 会话，尝试获取 LinuxDO 用户
          const linuxdoUser = getCurrentLinuxDOUser()
          
          set({ 
            user: linuxdoUser,
            loading: false,
            initialized: true
          })
        } catch (error) {
          console.error('初始化失败:', error)
          set({ 
            user: null,
            loading: false, 
            initialized: true 
          })
        }
      },

      refreshUser: async () => {
        try {
          // 首先尝试刷新 Supabase 会话
          const { data: { session }, error: supabaseError } = await supabase.auth.getSession()
          
          if (session?.user && !supabaseError) {
            // 如果有 Supabase 会话，使用 Supabase 用户
            const supabaseUser: User = {
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
            set({ user: supabaseUser })
            return
          }
          
          // 如果没有 Supabase 会话，尝试刷新 LinuxDO 用户
          const linuxdoUser = await refreshLinuxDOUser()
          set({ user: linuxdoUser })
        } catch (error) {
          console.error('刷新用户信息失败:', error)
          throw error
        }
      },
    }
  },
  {
    name: 'auth-storage',
    partialize: (state) => ({ user: state.user }),
  }
))