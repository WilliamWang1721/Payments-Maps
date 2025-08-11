import { create } from 'zustand'
import { type User } from '@/lib/supabase'

// 生成唯一用户ID (UUID格式)
const generateUserId = () => {
  // 生成符合UUID v4格式的ID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 生成唯一用户名
const generateUsername = () => {
  return 'user_' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4)
}

// 创建本地模拟用户（不依赖数据库）
const createLocalUser = (): User => {
  const userId = generateUserId()
  const username = generateUsername()
  const email = `${username}@auto.local`
  
  return {
    id: userId,
    email: email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: {
      display_name: `自动用户${userId.slice(-6)}`,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      provider: 'auto',
      username: username
    }
  }
}

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  login: (provider: 'github' | 'google' | 'linuxdo') => void
  loginWithLinuxDoCode: (code: string) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 存储用户实例
  let currentUser: User | null = null
  
  // 初始化时创建用户（同步操作）
  const initializeUser = () => {
    if (!currentUser) {
      currentUser = createLocalUser()
    }
    return currentUser
  }
  
  return {
    user: null, // 初始为null，等待初始化
    loading: true,
    initialized: false,

    login: (provider) => {
      // 自动登录，创建或获取用户
      set({ loading: true })
      
      try {
        const user = initializeUser()
        set({ 
          user: user,
          loading: false,
          initialized: true
        })
      } catch (error) {
        console.error('登录失败:', error)
        set({ loading: false })
      }
    },
    
    loginWithLinuxDoCode: (code: string) => {
      // 自动登录，创建或获取用户
      set({ loading: true })
      
      try {
        const user = initializeUser()
        set({ 
          user: user,
          loading: false,
          initialized: true
        })
      } catch (error) {
        console.error('登录失败:', error)
        set({ loading: false })
      }
    },

    logout: () => {
      // 保持登录状态，不清除用户信息
      set({ loading: true })
      
      // 模拟短暂延迟
      setTimeout(() => {
        set({ loading: false })
      }, 100)
    },

    initialize: () => {
      // 自动初始化并创建用户
      set({ loading: true })
      
      try {
        const user = initializeUser()
        set({ 
          user: user,
          loading: false,
          initialized: true
        })
      } catch (error) {
        console.error('初始化失败:', error)
        set({ 
          loading: false,
          initialized: true
        })
      }
    },
  }
})