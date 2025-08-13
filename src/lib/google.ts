// Google OAuth2 配置和工具函数

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

// Google OAuth2 配置
const GOOGLE_AUTH_URL = 'https://accounts.google.com/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_PEOPLE_API_URL = 'https://people.googleapis.com/v1/people/me'

// Google用户信息接口（基础信息）
export interface GoogleUser {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
  locale: string
}

// Google People API 详细用户信息接口
export interface GooglePeopleUser {
  resourceName: string
  etag: string
  names?: Array<{
    displayName: string
    familyName: string
    givenName: string
    displayNameLastFirst: string
    unstructuredName: string
  }>
  photos?: Array<{
    url: string
    default?: boolean
  }>
  emailAddresses?: Array<{
    value: string
    type: string
    formattedType: string
  }>
  phoneNumbers?: Array<{
    value: string
    canonicalForm: string
    type: string
    formattedType: string
  }>
  addresses?: Array<{
    formattedValue: string
    type: string
    formattedType: string
    streetAddress: string
    city: string
    region: string
    postalCode: string
    country: string
    countryCode: string
  }>
  birthdays?: Array<{
    date: {
      year: number
      month: number
      day: number
    }
  }>
  genders?: Array<{
    value: string
    formattedValue: string
  }>
  locales?: Array<{
    value: string
  }>
  organizations?: Array<{
    name: string
    title: string
    type: string
    formattedType: string
  }>
}

// 增强的用户信息接口（合并基础信息和详细信息）
export interface EnhancedGoogleUser extends GoogleUser {
  // People API 额外信息
  phoneNumbers?: string[]
  addresses?: string[]
  birthday?: string
  gender?: string
  organizations?: Array<{
    name: string
    title: string
  }>
  alternativeEmails?: string[]
  highResPhoto?: string
}

// Google OAuth2 令牌响应接口
interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
  id_token?: string
}

// 生成Google OAuth2授权URL
export function getGoogleAuthUrl(): string {
  console.log('🔧 Google OAuth 配置调试:')
  console.log('CLIENT_ID:', CLIENT_ID)
  console.log('REDIRECT_URI:', `${window.location.origin}/auth/google/callback`)
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent'
  })
  
  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`
  console.log('🚀 生成的Google授权URL:', authUrl)
  
  return authUrl
}

// 使用授权码获取访问令牌
export async function getGoogleAccessToken(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${window.location.origin}/auth/google/callback`,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`获取Google访问令牌失败: ${response.status} ${errorData}`)
  }

  return response.json()
}

// 使用访问令牌获取用户信息
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch(`${GOOGLE_USER_INFO_URL}?access_token=${accessToken}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`获取Google用户信息失败: ${response.status} ${errorData}`)
  }

  return response.json()
}

// 使用People API获取详细用户信息
export async function getGooglePeopleInfo(accessToken: string): Promise<GooglePeopleUser> {
  const personFields = [
    'names',
    'emailAddresses', 
    'phoneNumbers',
    'addresses',
    'photos',
    'birthdays',
    'genders',
    'locales',
    'organizations'
  ].join(',')

  const response = await fetch(`${GOOGLE_PEOPLE_API_URL}?personFields=${personFields}&key=${API_KEY}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`获取Google People信息失败: ${response.status} ${errorData}`)
  }

  return response.json()
}

// 合并基础用户信息和People API详细信息
export function mergeGoogleUserInfo(basicUser: GoogleUser, peopleUser: GooglePeopleUser): EnhancedGoogleUser {
  const enhanced: EnhancedGoogleUser = { ...basicUser }

  // 提取电话号码
  if (peopleUser.phoneNumbers && peopleUser.phoneNumbers.length > 0) {
    enhanced.phoneNumbers = peopleUser.phoneNumbers.map(phone => phone.value)
  }

  // 提取地址信息
  if (peopleUser.addresses && peopleUser.addresses.length > 0) {
    enhanced.addresses = peopleUser.addresses.map(addr => addr.formattedValue)
  }

  // 提取生日信息
  if (peopleUser.birthdays && peopleUser.birthdays.length > 0) {
    const birthday = peopleUser.birthdays[0].date
    if (birthday.year && birthday.month && birthday.day) {
      enhanced.birthday = `${birthday.year}-${birthday.month.toString().padStart(2, '0')}-${birthday.day.toString().padStart(2, '0')}`
    }
  }

  // 提取性别信息
  if (peopleUser.genders && peopleUser.genders.length > 0) {
    enhanced.gender = peopleUser.genders[0].value
  }

  // 提取组织信息
  if (peopleUser.organizations && peopleUser.organizations.length > 0) {
    enhanced.organizations = peopleUser.organizations.map(org => ({
      name: org.name,
      title: org.title
    }))
  }

  // 提取额外邮箱
  if (peopleUser.emailAddresses && peopleUser.emailAddresses.length > 1) {
    enhanced.alternativeEmails = peopleUser.emailAddresses
      .filter(email => email.value !== basicUser.email)
      .map(email => email.value)
  }

  // 提取高分辨率头像
  if (peopleUser.photos && peopleUser.photos.length > 0) {
    const highResPhoto = peopleUser.photos.find(photo => !photo.default) || peopleUser.photos[0]
    if (highResPhoto) {
      enhanced.highResPhoto = highResPhoto.url
    }
  }

  return enhanced
}

// 完整的OAuth流程：从授权码到用户信息
export async function getGoogleUserFromCode(code: string): Promise<GoogleUser> {
  try {
    // 1. 获取访问令牌
    const tokenData = await getGoogleAccessToken(code)
    
    // 2. 获取用户信息
    const userInfo = await getGoogleUserInfo(tokenData.access_token)
    
    return userInfo
  } catch (error) {
    console.error('Google OAuth流程失败:', error)
    throw error
  }
}

// 完整的OAuth流程：从授权码到增强用户信息（包含People API数据）
export async function getEnhancedGoogleUserFromCode(code: string): Promise<EnhancedGoogleUser> {
  try {
    // 1. 获取访问令牌
    const tokenData = await getGoogleAccessToken(code)
    
    // 2. 获取基础用户信息
    const basicUserInfo = await getGoogleUserInfo(tokenData.access_token)
    
    // 3. 尝试获取People API详细信息
    try {
      const peopleInfo = await getGooglePeopleInfo(tokenData.access_token)
      return mergeGoogleUserInfo(basicUserInfo, peopleInfo)
    } catch (peopleError) {
      console.warn('People API获取失败，使用基础用户信息:', peopleError)
      return basicUserInfo as EnhancedGoogleUser
    }
  } catch (error) {
    console.error('Google OAuth流程失败:', error)
    throw error
  }
}

// 启动Google OAuth登录流程
export function initiateGoogleLogin(): void {
  const authUrl = getGoogleAuthUrl()
  window.location.href = authUrl
}

// 检查是否为Google OAuth回调
export function isGoogleCallback(): boolean {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.has('code') && urlParams.has('scope')
}

// 从URL中提取Google OAuth授权码
export function getGoogleCodeFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('code')
}