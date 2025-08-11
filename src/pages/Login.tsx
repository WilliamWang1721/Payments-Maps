import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Github } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'

const Login = () => {
  const { user, loading, login } = useAuthStore()
  const [signingIn, setSigningIn] = useState<string | null>(null)

  // 如果用户已登录，重定向到地图页面
  if (user) {
    return <Navigate to="/map" replace />
  }

  // 如果正在初始化认证状态，显示加载
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" text="正在加载..." />
      </div>
    )
  }

  const handleSignIn = async (provider: 'github' | 'google' | 'linuxdo') => {
    try {
      setSigningIn(provider)
      await login(provider)
      toast.success('登录成功！')
    } catch (error) {
      console.error('登录失败:', error)
      toast.error('登录失败，请重试')
    } finally {
      setSigningIn(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
              onClick={() => handleSignIn('github')}
              loading={signingIn === 'github'}
              disabled={signingIn !== null}
              className="w-full flex items-center justify-center space-x-2"
              variant="outline"
            >
              <Github className="w-5 h-5" />
              <span>使用 GitHub 登录</span>
            </Button>
            
            <Button
              onClick={() => handleSignIn('google')}
              loading={signingIn === 'google'}
              disabled={signingIn !== null}
              className="w-full flex items-center justify-center space-x-2"
              variant="outline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>使用 Google 登录</span>
            </Button>
            
            <Button
              onClick={() => handleSignIn('linuxdo')}
              loading={signingIn === 'linuxdo'}
              disabled={signingIn !== null}
              className="w-full flex items-center justify-center space-x-2"
              variant="outline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span>使用 Linux DO 登录</span>
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              登录即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login