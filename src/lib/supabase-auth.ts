import { supabase } from './supabase'
import { type User } from './supabase'
import { type GoogleUser } from './google'

// Supabase认证相关的工具函数

// 将Google用户信息同步到Supabase
export async function syncGoogleUserToSupabase(googleUser: GoogleUser): Promise<User> {
  try {
    // 检查用户是否已存在
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 是"未找到记录"的错误码，其他错误需要抛出
      throw fetchError
    }

    const userData: Partial<User> = {
      id: googleUser.id,
      email: googleUser.email,
      user_metadata: {
        display_name: googleUser.name,
        avatar_url: googleUser.picture,
        provider: 'google',
        username: googleUser.email.split('@')[0],
        given_name: googleUser.given_name,
        family_name: googleUser.family_name,
        locale: googleUser.locale,
        verified_email: googleUser.verified_email
      }
    }

    if (existingUser) {
      // 更新现有用户
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return updatedUser
    } else {
      // 创建新用户
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return newUser
    }
  } catch (error) {
    console.error('同步Google用户到Supabase失败:', error)
    
    // 如果Supabase同步失败，返回本地用户对象
    return {
      id: googleUser.id,
      email: googleUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        display_name: googleUser.name,
        avatar_url: googleUser.picture,
        provider: 'google',
        username: googleUser.email.split('@')[0],
        given_name: googleUser.given_name,
        family_name: googleUser.family_name,
        locale: googleUser.locale
      }
    }
  }
}

// 使用Supabase Auth进行Google OAuth（可选的增强方案）
export async function signInWithGoogleSupabase() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/google/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Supabase Google OAuth失败:', error)
    throw error
  }
}

// 获取当前Supabase认证用户
export async function getCurrentSupabaseUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // 转换Supabase用户格式为应用用户格式
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
      user_metadata: {
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        provider: user.app_metadata?.provider || 'supabase',
        username: user.user_metadata?.preferred_username || user.email?.split('@')[0],
        ...user.user_metadata
      }
    }
  } catch (error) {
    console.error('获取Supabase用户失败:', error)
    return null
  }
}

// 登出Supabase认证
export async function signOutSupabase(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Supabase登出失败:', error)
    throw error
  }
}

// 监听Supabase认证状态变化
export function onSupabaseAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const user = await getCurrentSupabaseUser()
      callback(user)
    } else if (event === 'SIGNED_OUT') {
      callback(null)
    }
  })
}