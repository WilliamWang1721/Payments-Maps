import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { signInWithGoogleSupabase } from '@/lib/supabase-auth'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Chrome } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  // 如果用户已登录，重定向到首页
  if (user) {
    return <Navigate to="/" replace />
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      console.log('🚀 开始 Supabase Google OAuth 登录...')
      await signInWithGoogleSupabase()
      // Supabase OAuth 会自动处理重定向，无需手动导航
    } catch (error) {
      console.error('Google 登录失败:', error)
      toast.error('登录失败，请重试')
    } finally {
      setIsLoading(false)
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
              onClick={handleGoogleLogin}
              loading={loading || isLoading}
              disabled={loading || isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Chrome className="w-5 h-5 mr-2" />
              <span>使用 Google 登录</span>
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              请使用 Google 账户登录以继续使用服务
            </p>
            <p className="text-xs text-gray-400 mt-1">
              登录即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login