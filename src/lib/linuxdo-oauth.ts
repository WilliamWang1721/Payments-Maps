// LinuxDO OAuth 2.0 Authentication
// Based on https://connect.linux.do documentation
import { withCsrfHeaders } from '@/lib/csrf'

export interface LinuxDOUserInfo {
  id: number
  username: string
  name: string
  avatar_template: string
  active: boolean
  trust_level: number
  silenced: boolean
  external_ids: Record<string, unknown>
  api_key?: string
}

export interface LinuxDOTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export interface LinuxDOConfig {
  clientId: string
  redirectUri: string
  authUrl: string
}

// LinuxDO OAuth configuration
export const linuxdoConfig: LinuxDOConfig = {
  clientId: import.meta.env.VITE_LINUXDO_CLIENT_ID,
  redirectUri: import.meta.env.VITE_LINUXDO_REDIRECT_URI || 
    (window.location.hostname === 'localhost' 
      ? 'http://localhost:5173/auth/linuxdo/callback'
      : `${window.location.origin}/auth/linuxdo/callback`),
  authUrl: 'https://connect.linux.do/oauth2/authorize',
}

// Generate LinuxDO OAuth authorization URL
export function getLinuxDOAuthUrl(): string {
  // Validate configuration
  if (!linuxdoConfig.clientId) {
    throw new Error('LinuxDO Client ID 未配置')
  }
  if (!linuxdoConfig.redirectUri) {
    throw new Error('LinuxDO Redirect URI 未配置')
  }

  // Generate and store state for CSRF protection
  const state = generateState()
  storeOAuthState(state)

  const params = new URLSearchParams({
    client_id: linuxdoConfig.clientId,
    redirect_uri: linuxdoConfig.redirectUri,
    response_type: 'code',
    state: state
  })

  return `${linuxdoConfig.authUrl}?${params.toString()}`
}

// Exchange authorization code for access token
export async function getLinuxDOAccessToken(code: string): Promise<LinuxDOTokenResponse> {
  try {
    // 使用我们的API代理端点而不是直接调用LinuxDO API
    const response = await fetch('/api/linuxdo/token', {
      method: 'POST',
      headers: withCsrfHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      body: JSON.stringify({
        code: code,
        clientId: linuxdoConfig.clientId,
        redirectUri: linuxdoConfig.redirectUri
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error || `获取访问令牌失败: ${response.status}`)
    }

    const tokenData: LinuxDOTokenResponse = await response.json().catch(() => ({} as LinuxDOTokenResponse))
    if (!tokenData?.access_token) {
      throw new Error('令牌响应格式错误')
    }
    return tokenData
  } catch (error) {
    console.error('获取LinuxDO访问令牌失败:', error)
    throw error
  }
}

// Get user information using access token
export async function getLinuxDOUserInfo(accessToken: string): Promise<LinuxDOUserInfo> {
  try {
    // 使用我们的API代理端点
    const response = await fetch('/api/linuxdo/userinfo', {
      method: 'GET',
      headers: withCsrfHeaders({
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error || `获取用户信息失败: ${response.status}`)
    }

    const userInfo: LinuxDOUserInfo = await response.json().catch(() => ({} as LinuxDOUserInfo))
    if (!userInfo?.id || !userInfo?.username) {
      throw new Error('用户信息响应格式错误')
    }
    return userInfo
  } catch (error) {
    console.error('获取LinuxDO用户信息失败:', error)
    throw error
  }
}

// Complete LinuxDO OAuth flow
export async function completeLinuxDOAuth(code: string): Promise<LinuxDOUserInfo> {
  try {
    // Get access token
    const tokenResponse = await getLinuxDOAccessToken(code)
    
    if (!tokenResponse.access_token) {
      throw new Error('未获取到有效的访问令牌')
    }

    // Get user information
    const userInfo = await getLinuxDOUserInfo(tokenResponse.access_token)
    
    return userInfo
  } catch (error) {
    console.error('完成LinuxDO认证失败:', error)
    throw error
  }
}

// Start LinuxDO OAuth process (redirect to authorization page)
export function startLinuxDOAuth(): void {
  const authUrl = getLinuxDOAuthUrl()
  window.location.href = authUrl
}

// Generate random state parameter for CSRF protection
export function generateState(): string {
  if (!globalThis.crypto?.getRandomValues) {
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
  }
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Store state in sessionStorage for verification
export function storeOAuthState(state: string): void {
  sessionStorage.setItem('linuxdo_oauth_state', state)
}

// Verify state parameter
export function verifyOAuthState(state: string): boolean {
  const storedState = sessionStorage.getItem('linuxdo_oauth_state')
  sessionStorage.removeItem('linuxdo_oauth_state')
  return storedState === state
}
