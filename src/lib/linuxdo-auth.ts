// Native LinuxDO OAuth Authentication Service
// This replaces Supabase Auth for LinuxDO authentication

import { completeLinuxDOAuth, startLinuxDOAuth, type LinuxDOUserInfo } from './linuxdo-oauth'
import { syncLinuxDOUserToSupabase } from './supabase-auth'
import { type User } from './supabase'

// Convert LinuxDO user to application user format
export function convertLinuxDOUserToAppUser(linuxdoUser: LinuxDOUserInfo): User {
  // Generate email from username if not provided
  const email = `${linuxdoUser.username}@linuxdo.local`
  
  // Generate avatar URL from template
  const avatarUrl = linuxdoUser.avatar_template 
    ? linuxdoUser.avatar_template.replace('{size}', '96')
    : null

  return {
    id: linuxdoUser.id.toString(),
    email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: {
      display_name: linuxdoUser.name || linuxdoUser.username,
      avatar_url: avatarUrl,
      provider: 'linuxdo',
      username: linuxdoUser.username,
      trust_level: linuxdoUser.trust_level,
      active: linuxdoUser.active,
      silenced: linuxdoUser.silenced,
      api_key: linuxdoUser.api_key
    }
  }
}

// Start LinuxDO OAuth login process
export function loginWithLinuxDO(): void {
  try {
    startLinuxDOAuth()
  } catch (error) {
    console.error('启动LinuxDO OAuth失败:', error)
    throw error
  }
}

// Handle LinuxDO OAuth callback
export async function handleLinuxDOCallback(code: string): Promise<User> {
  try {
    // Complete OAuth flow to get user info
    const linuxdoUserInfo = await completeLinuxDOAuth(code)
    
    // Convert to application user format
    const appUser = convertLinuxDOUserToAppUser(linuxdoUserInfo)
    
    // Sync to Supabase database (but not using Supabase Auth)
    const syncedUser = await syncLinuxDOUserToSupabase({
      id: appUser.id,
      email: appUser.email,
      user_metadata: appUser.user_metadata
    })
    
    // Store user in localStorage for persistence
    localStorage.setItem('linuxdo_user', JSON.stringify(syncedUser))
    localStorage.setItem('linuxdo_access_token', Date.now().toString())
    
    return syncedUser
  } catch (error) {
    console.error('处理LinuxDO OAuth回调失败:', error)
    throw error
  }
}

// Get current user from localStorage
export function getCurrentLinuxDOUser(): User | null {
  try {
    const userData = localStorage.getItem('linuxdo_user')
    if (!userData) {
      return null
    }
    
    const user: User = JSON.parse(userData)
    
    // Check if user data is still valid (optional: add expiration check)
    const timestamp = localStorage.getItem('linuxdo_access_token')
    if (!timestamp) {
      return null
    }
    
    // Optional: Check if token is expired (e.g., 24 hours)
    const tokenAge = Date.now() - parseInt(timestamp)
    const ONE_DAY = 24 * 60 * 60 * 1000
    if (tokenAge > ONE_DAY) {
      // Token expired, clear storage
      clearLinuxDOUser()
      return null
    }
    
    return user
  } catch (error) {
    console.error('获取当前LinuxDO用户失败:', error)
    clearLinuxDOUser()
    return null
  }
}

// Clear LinuxDO user from localStorage
export function clearLinuxDOUser(): void {
  localStorage.removeItem('linuxdo_user')
  localStorage.removeItem('linuxdo_access_token')
}

// Logout LinuxDO user
export async function logoutLinuxDO(): Promise<void> {
  try {
    // Clear local storage
    clearLinuxDOUser()
    
    // No need to call LinuxDO logout endpoint as it's handled client-side
    console.log('LinuxDO用户已登出')
  } catch (error) {
    console.error('LinuxDO登出失败:', error)
    throw error
  }
}

// Refresh user data (optional - can be used to update user info periodically)
export async function refreshLinuxDOUser(): Promise<User | null> {
  try {
    const currentUser = getCurrentLinuxDOUser()
    if (!currentUser) {
      return null
    }
    
    // Since we don't store the access token, we can't refresh from LinuxDO directly
    // For now, just return the current user
    // In a production app, you might want to store the refresh token
    
    return currentUser
  } catch (error) {
    console.error('刷新LinuxDO用户失败:', error)
    return null
  }
}

// Check if user is authenticated with LinuxDO
export function isLinuxDOAuthenticated(): boolean {
  return getCurrentLinuxDOUser() !== null
}