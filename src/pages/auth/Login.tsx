import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { signInWithGoogleSupabase, signInWithGitHubSupabase, signInWithMicrosoftSupabase } from '@/lib/supabase-auth'
import { withCsrfHeaders } from '@/lib/csrf'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { getErrorDetails, notify } from '@/lib/notify'
// 移除Chrome图标导入，使用Google官方SVG图标

const Login = () => {
  const navigate = useNavigate()
  const { user, loading, loginWithLinuxDO, refreshUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [passkeyEmail, setPasskeyEmail] = useState('')
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [showPasskeyForm, setShowPasskeyForm] = useState(false)

  // 如果用户已登录，重定向到首页
  if (user) {
    return <Navigate to="/app/map" replace />
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogleSupabase()
      // OAuth会重定向，不需要手动处理成功状态
    } catch (error) {
      console.error('Google登录失败:', error)
      notify.critical('Google登录失败，请重试', {
        title: '登录失败',
        details: getErrorDetails(error),
      })
      setIsLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithGitHubSupabase()
      // OAuth会重定向，不需要手动处理成功状态
    } catch (error) {
      console.error('GitHub登录失败:', error)
      notify.critical('GitHub登录失败，请重试', {
        title: '登录失败',
        details: getErrorDetails(error),
      })
      setIsLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithMicrosoftSupabase()
      // OAuth会重定向，不需要手动处理成功状态
    } catch (error) {
      console.error('Microsoft登录失败:', error)
      notify.critical('Microsoft登录失败，请重试', {
        title: '登录失败',
        details: getErrorDetails(error),
      })
      setIsLoading(false)
    }
  }

  const handleLinuxDOLogin = () => {
    try {
      setIsLoading(true)
      loginWithLinuxDO()
      // OAuth会重定向，不需要手动处理成功状态
    } catch (error) {
      console.error('LinuxDO登录失败:', error)
      notify.critical('LinuxDO登录失败，请重试', {
        title: '登录失败',
        details: getErrorDetails(error),
      })
      setIsLoading(false)
    }
  }

  const handleGuestBrowse = () => {
    // 游客模式：直接进入只读地图页
    navigate('/app/map')
  }

  const handlePasskeyLogin = async () => {
    if (!passkeyEmail.trim()) {
      notify.error('请输入在设置中注册 Passkey 时使用的邮箱')
      return
    }
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      notify.error('当前浏览器不支持 Passkey，请在支持的浏览器中尝试')
      return
    }

    setPasskeyLoading(true)
    try {
      const email = passkeyEmail.trim().toLowerCase()
      const optionsRes = await fetch('/api/passkey/auth/options', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email })
      })
      const optionsData = await optionsRes.json().catch(() => ({}))
      if (!optionsRes.ok) {
        throw new Error(optionsData?.error || '无法创建 Passkey 登录请求')
      }

      const assertionResponse = await startAuthentication(optionsData)

      const verifyRes = await fetch('/api/passkey/auth/verify', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email, assertionResponse })
      })
      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyRes.ok) {
        throw new Error(verifyData?.error || 'Passkey 登录失败，请重试')
      }

      const session = verifyData?.session
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('服务端未返回有效的 Supabase 凭证')
      }

      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })
      if (error) {
        throw error
      }

      await refreshUser()
      notify.success('Passkey 登录成功')
      navigate('/app/map')
    } catch (error) {
      console.error('Passkey 登录失败:', error)
      notify.critical(error instanceof Error ? error.message : 'Passkey 登录失败，请重试', {
        title: 'Passkey 登录失败',
        details: getErrorDetails(error),
      })
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/web_logo.JPG" alt="Payments Maps Logo" className="w-16 h-16 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            欢迎使用 Payments Maps
          </CardTitle>
          <CardDescription>
            发现身边的POS机，分享支付体验
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={handleGoogleLogin}
              loading={loading || isLoading}
              disabled={loading || isLoading}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{loading || isLoading ? '登录中...' : '使用 Google 登录'}</span>
            </Button>

            <Button
              onClick={handleGitHubLogin}
              disabled={loading || isLoading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>{loading || isLoading ? '登录中...' : '使用 GitHub 登录'}</span>
            </Button>

            <Button
              onClick={handleMicrosoftLogin}
              disabled={loading || isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
              </svg>
              <span>{loading || isLoading ? '登录中...' : '使用 Microsoft 登录'}</span>
            </Button>

            <Button
              onClick={handleLinuxDOLogin}
              disabled={loading || isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>{loading || isLoading ? '登录中...' : '使用 LinuxDO 登录'}</span>
            </Button>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-gray-400">或</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="text-xs font-medium text-gray-600">使用 Passkey 登录</label>
              <p className="text-[11px] text-gray-500 mt-1">
                在设置页面注册过 Passkey 的邮箱即可登录，支持系统生物识别与 1Password 等验证器
              </p>
            </div>
            {!showPasskeyForm ? (
              <Button
                onClick={() => setShowPasskeyForm(true)}
                disabled={loading || isLoading || passkeyLoading}
                className="w-full bg-soft-black hover:bg-[#101940] text-white flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors"
              >
                使用 Passkey 登录
              </Button>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  value={passkeyEmail}
                  onChange={(e) => setPasskeyEmail(e.target.value)}
                  placeholder="请输入注册过 Passkey 的邮箱"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handlePasskeyLogin}
                    disabled={loading || isLoading || passkeyLoading}
                    loading={passkeyLoading}
                    className="flex-1 bg-soft-black hover:bg-[#101940] text-white flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors"
                  >
                    确认登录
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={passkeyLoading}
                    onClick={() => {
                      setShowPasskeyForm(false)
                      setPasskeyEmail('')
                    }}
                    className="flex-1 border border-gray-300 text-gray-600 hover:bg-white"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleGuestBrowse}
            disabled={loading || isLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-.25 5.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM11 11h2v6h-2v-6z"/>
            </svg>
            <span>以游客身份继续（仅浏览）</span>
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              请使用 Google、GitHub、Microsoft 或 LinuxDO 账户登录以继续使用服务
            </p>
            <p className="text-xs text-gray-400 mt-1">
              登录即表示您同意我们的服务条款和隐私政策
            </p>
            <p className="text-xs text-gray-400 mt-1">
              游客模式仅支持浏览现有信息，无法新增或编辑信息
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
