// Linux DO Connect OAuth2 配置和工具函数

const CLIENT_ID = import.meta.env.VITE_LINUXDO_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_LINUXDO_CLIENT_SECRET
const REDIRECT_URI = import.meta.env.VITE_LINUXDO_REDIRECT_URI

const AUTH_URL = 'https://connect.linux.do/oauth2/authorize'
const TOKEN_URL = 'https://connect.linux.do/oauth2/token'
const USER_INFO_URL = 'https://connect.linux.do/oauth2/userinfo'

export interface LinuxDoUser {
  id: string
  username: string
  email?: string
  avatar_url?: string
  name?: string
}

export interface LinuxDoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

// 生成授权链接
export function getLinuxDoAuthUrl(): string {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error('Linux DO OAuth配置缺失')
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'user'
  })

  return `${AUTH_URL}?${params.toString()}`
}

// 使用授权码获取访问令牌
export async function getLinuxDoAccessToken(code: string): Promise<LinuxDoTokenResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Linux DO OAuth配置缺失')
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`获取访问令牌失败: ${response.status} ${errorText}`)
  }

  return await response.json()
}

// 使用访问令牌获取用户信息
export async function getLinuxDoUserInfo(accessToken: string): Promise<LinuxDoUser> {
  const response = await fetch(USER_INFO_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`获取用户信息失败: ${response.status} ${errorText}`)
  }

  return await response.json()
}

// 完整的OAuth流程：从授权码到用户信息
export async function getLinuxDoUserFromCode(code: string): Promise<LinuxDoUser> {
  try {
    // 1. 获取访问令牌
    const tokenData = await getLinuxDoAccessToken(code)
    
    // 2. 获取用户信息
    const userInfo = await getLinuxDoUserInfo(tokenData.access_token)
    
    return userInfo
  } catch (error) {
    console.error('Linux DO OAuth流程失败:', error)
    throw error
  }
}