import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// import { supabase } from '@/lib/supabase' // 移除数据库依赖
import Loading from '@/components/ui/Loading'
import { notify } from '@/lib/notify'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 由于已禁用登录，直接跳转到地图页面
        notify.success('自动登录成功！')
        navigate('/app/map')
      } catch (error) {
        console.error('处理认证回调失败:', error)
        navigate('/app/map') // 即使出错也跳转到地图页面
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loading size="lg" text="正在处理登录..." />
    </div>
  )
}

export default AuthCallback
