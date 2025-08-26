// LinuxDO OAuth 2.0 Authentication
// Based on https://connect.linux.do documentation

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
  clientSecret: string
  redirectUri: string
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
}

// LinuxDO OAuth configuration
export const linuxdoConfig: LinuxDOConfig = {
  clientId: import.meta.env.VITE_LINUXDO_CLIENT_ID,
  clientSecret: import.meta.env.VITE_LINUXDO_CLIENT_SECRET,
  redirectUri: import.meta.env.VITE_LINUXDO_REDIRECT_URI || 
    (window.location.hostname === 'localhost' 
      ? 'http://localhost:5173/auth/linuxdo/callback'
      : `${window.location.origin}/auth/linuxdo/callback`),
  authUrl: 'https://connect.linux.do/oauth2/authorize',
  tokenUrl: 'https://connect.linux.do/oauth2/token',
  userInfoUrl: 'https://connect.linux.do/oauth2/userinfo'
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

  const authUrl = `${linuxdoConfig.authUrl}?${params.toString()}`
  console.log('生成LinuxDO授权URL:', authUrl)
  return authUrl
}

// Exchange authorization code for access token
export async function getLinuxDOAccessToken(code: string): Promise<LinuxDOTokenResponse> {
  try {
    console.log('正在获取LinuxDO访问令牌...')
    console.log('使用的配置:', {
      clientId: linuxdoConfig.clientId,
      redirectUri: linuxdoConfig.redirectUri,
      code: code
    })

    // 使用我们的API代理端点而不是直接调用LinuxDO API
    const response = await fetch('/api/linuxdo/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code: code,
        clientId: linuxdoConfig.clientId,
        clientSecret: linuxdoConfig.clientSecret,
        redirectUri: linuxdoConfig.redirectUri
      })
    })

    console.log('Token响应状态:', response.status)
    
    const responseText = await response.text()
    console.log('Token响应内容:', responseText)

    if (!response.ok) {
      let errorMsg = `获取访问令牌失败: ${response.status}`
      try {
        const errorData = JSON.parse(responseText)
        errorMsg += ` - ${errorData.error || errorData.message || responseText}`
      } catch {
        errorMsg += ` - ${responseText}`
      }
      throw new Error(errorMsg)
    }

    try {
      const tokenData: LinuxDOTokenResponse = JSON.parse(responseText)
      return tokenData
    } catch (parseError) {
      console.error('解析令牌响应失败:', parseError)
      throw new Error(`令牌响应格式错误: ${responseText}`)
    }
  } catch (error) {
    console.error('获取LinuxDO访问令牌失败:', error)
    throw error
  }
}

// Get user information using access token
export async function getLinuxDOUserInfo(accessToken: string): Promise<LinuxDOUserInfo> {
  try {
    console.log('正在获取LinuxDO用户信息...')
    console.log('使用访问令牌:', accessToken ? '已提供' : '未提供')

    // 使用我们的API代理端点
    const response = await fetch('/api/linuxdo/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    console.log('用户信息响应状态:', response.status)

    const responseText = await response.text()
    console.log('用户信息响应内容:', responseText)

    if (!response.ok) {
      let errorMsg = `获取用户信息失败: ${response.status}`
      try {
        const errorData = JSON.parse(responseText)
        errorMsg += ` - ${errorData.error || errorData.message || responseText}`
      } catch {
        errorMsg += ` - ${responseText}`
      }
      throw new Error(errorMsg)
    }

    try {
      const userInfo: LinuxDOUserInfo = JSON.parse(responseText)
      console.log('解析后的用户信息:', userInfo)
      return userInfo
    } catch (parseError) {
      console.error('解析用户信息响应失败:', parseError)
      throw new Error(`用户信息响应格式错误: ${responseText}`)
    }
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
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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