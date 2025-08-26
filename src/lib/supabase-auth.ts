import { supabase } from './supabase'
import { type User } from './supabase'
import { type GoogleUser } from './google'

// Supabase认证相关的工具函数

// 将Microsoft用户信息同步到Supabase
export async function syncMicrosoftUserToSupabase(microsoftUser: any): Promise<User> {
  try {
    // 检查用户是否已存在
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', microsoftUser.email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 是"未找到记录"的错误码，其他错误需要抛出
      throw fetchError
    }

    const userData: Partial<User> = {
      id: microsoftUser.id,
      email: microsoftUser.email,
      user_metadata: {
        display_name: microsoftUser.user_metadata?.full_name || microsoftUser.user_metadata?.name || microsoftUser.email?.split('@')[0],
        avatar_url: microsoftUser.user_metadata?.avatar_url,
        provider: 'azure',
        username: microsoftUser.user_metadata?.preferred_username || microsoftUser.email?.split('@')[0],
        given_name: microsoftUser.user_metadata?.given_name,
        family_name: microsoftUser.user_metadata?.family_name
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
    console.error('同步Microsoft用户到Supabase失败:', error)
    
    // 如果Supabase同步失败，返回本地用户对象
    return {
      id: microsoftUser.id,
      email: microsoftUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        display_name: microsoftUser.user_metadata?.full_name || microsoftUser.user_metadata?.name || microsoftUser.email?.split('@')[0],
        avatar_url: microsoftUser.user_metadata?.avatar_url,
        provider: 'azure',
        username: microsoftUser.user_metadata?.preferred_username || microsoftUser.email?.split('@')[0],
        given_name: microsoftUser.user_metadata?.given_name,
        family_name: microsoftUser.user_metadata?.family_name
      }
    }
  }
}

// 将GitHub用户信息同步到Supabase
export async function syncGitHubUserToSupabase(githubUser: any): Promise<User> {
  try {
    // 检查用户是否已存在
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', githubUser.email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 是"未找到记录"的错误码，其他错误需要抛出
      throw fetchError
    }

    const userData: Partial<User> = {
      id: githubUser.id,
      email: githubUser.email,
      user_metadata: {
        display_name: githubUser.user_metadata?.full_name || githubUser.user_metadata?.name || githubUser.email?.split('@')[0],
        avatar_url: githubUser.user_metadata?.avatar_url,
        provider: 'github',
        username: githubUser.user_metadata?.user_name || githubUser.email?.split('@')[0]
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
    console.error('同步GitHub用户到Supabase失败:', error)
    
    // 如果Supabase同步失败，返回本地用户对象
    return {
      id: githubUser.id,
      email: githubUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        display_name: githubUser.user_metadata?.full_name || githubUser.user_metadata?.name || githubUser.email?.split('@')[0],
        avatar_url: githubUser.user_metadata?.avatar_url,
        provider: 'github',
        username: githubUser.user_metadata?.user_name || githubUser.email?.split('@')[0]
      }
    }
  }
}

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

// 将LinuxDO用户信息同步到Supabase
export async function syncLinuxDOUserToSupabase(linuxdoUser: any): Promise<User> {
  try {
    // 检查用户是否已存在
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', linuxdoUser.email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 是"未找到记录"的错误码，其他错误需要抛出
      throw fetchError
    }

    const userData: Partial<User> = {
      id: linuxdoUser.id,
      email: linuxdoUser.email,
      user_metadata: {
        display_name: linuxdoUser.user_metadata?.name || linuxdoUser.user_metadata?.username || linuxdoUser.email?.split('@')[0],
        avatar_url: linuxdoUser.user_metadata?.avatar_url,
        provider: 'linuxdo',
        username: linuxdoUser.user_metadata?.username || linuxdoUser.email?.split('@')[0],
        trust_level: linuxdoUser.user_metadata?.trust_level,
        badge_count: linuxdoUser.user_metadata?.badge_count
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
    console.error('同步LinuxDO用户到Supabase失败:', error)
    
    // 如果Supabase同步失败，返回本地用户对象
    return {
      id: linuxdoUser.id,
      email: linuxdoUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        display_name: linuxdoUser.user_metadata?.name || linuxdoUser.user_metadata?.username || linuxdoUser.email?.split('@')[0],
        avatar_url: linuxdoUser.user_metadata?.avatar_url,
        provider: 'linuxdo',
        username: linuxdoUser.user_metadata?.username || linuxdoUser.email?.split('@')[0]
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

// 使用Supabase Auth进行GitHub OAuth
export async function signInWithGitHubSupabase() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/github/callback`,
        queryParams: {
          scope: 'user:email',
        },
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Supabase GitHub OAuth失败:', error)
    throw error
  }
}

// 使用Supabase Auth进行Microsoft OAuth
export async function signInWithMicrosoftSupabase() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/microsoft/callback`,
        queryParams: {
          scope: 'openid email profile',
        },
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Supabase Microsoft OAuth失败:', error)
    throw error
  }
}

// 使用Supabase Auth进行LinuxDO OAuth
export async function signInWithLinuxDOSupabase() {
  try {
    // Since LinuxDO is not a built-in provider, we'll use a custom implementation
    // This will need to be configured in Supabase as a custom OAuth provider
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github', // Temporarily using github as placeholder - needs Supabase configuration
      options: {
        redirectTo: `${window.location.origin}/auth/linuxdo/callback`,
        queryParams: {
          scope: 'read',
        },
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Supabase LinuxDO OAuth失败:', error)
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