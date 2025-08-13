import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type User } from '@/lib/supabase'
import { signInWithGoogleSupabase, getCurrentSupabaseUser, signOutSupabase, onSupabaseAuthStateChange } from '@/lib/supabase-auth'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  loginWithSupabaseGoogle: () => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => {
    // 监听 Supabase 认证状态变化
    let authListener: { data: { subscription: any } } | null = null

    return {
      user: null,
      loading: false,
      initialized: false,

      loginWithSupabaseGoogle: async () => {
        set({ loading: true })
        try {
          await signInWithGoogleSupabase()
          // Supabase OAuth 会自动处理重定向和状态更新
        } catch (error) {
          console.error('Supabase Google 登录失败:', error)
          set({ loading: false })
          throw error
        }
      },

      logout: async () => {
        set({ loading: true })
        try {
          await signOutSupabase()
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
          // 获取当前 Supabase 用户
          const supabaseUser = await getCurrentSupabaseUser()
          
          set({ 
            user: supabaseUser,
            loading: false,
            initialized: true
          })

          // 设置认证状态监听器
          if (!authListener) {
            authListener = onSupabaseAuthStateChange((user) => {
              set({ 
                user,
                loading: false,
                initialized: true
              })
            })
          }
        } catch (error) {
          console.error('初始化失败:', error)
          set({ 
            user: null,
            loading: false, 
            initialized: true 
          })
        }
      },
    }
  },
  {
    name: 'auth-storage',
    partialize: (state) => ({ user: state.user }),
  }
))