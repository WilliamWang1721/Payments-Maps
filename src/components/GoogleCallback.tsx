import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase } from '@/lib/supabase'

const GoogleCallback = () => {
  const navigate = useNavigate()
  const { initialize } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const handleSupabaseCallback = async () => {
      try {
        console.log('🔄 Supabase Auth 回调处理开始')
        console.log('当前URL:', window.location.href)
        
        // 检查URL中是否包含hash fragment（access_token等）
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken) {
          console.log('🔑 检测到URL中的access_token，处理OAuth回调')
          
          // 使用Supabase的setSession方法设置会话
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          
          if (error) {
            console.error('❌ 设置Supabase会话失败:', error)
            setError(error.message || '认证失败')
            setProcessing(false)
            return
          }
          
          if (data.session) {
            console.log('✅ Supabase Auth 登录成功')
            // 清除URL中的hash参数
            window.history.replaceState({}, document.title, window.location.pathname)
            // 等待auth store初始化完成
            await initialize()
            // 稍微延迟以确保状态更新完成
            await new Promise(resolve => setTimeout(resolve, 500))
            // 登录成功，跳转到主页
            navigate('/app/map', { replace: true })
            return
          }
        }
        
        // 如果没有hash参数，尝试获取现有会话
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Supabase Auth 回调错误:', error)
          setError(error.message || '认证失败')
          setProcessing(false)
          return
        }

        if (data.session) {
          console.log('✅ Supabase Auth 登录成功')
          // 重新初始化认证状态
          await initialize()
          // 登录成功，跳转到主页
          navigate('/app/map', { replace: true })
        } else {
          console.log('ℹ️ 未找到有效会话，可能是首次访问')
          // 没有会话，跳转到登录页
          navigate('/login', { replace: true })
        }
      } catch (error) {
        console.error('Supabase Auth 回调处理失败:', error)
        setError(error instanceof Error ? error.message : '登录失败')
        setProcessing(false)
      }
    }

    handleSupabaseCallback()
  }, [initialize, navigate])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在处理Google登录...</h2>
          <p className="text-gray-600">请稍候，我们正在验证您的身份</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">登录失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            返回登录页面
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default GoogleCallback