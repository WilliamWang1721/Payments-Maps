import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase } from '@/lib/supabase'
import { syncMicrosoftUserToSupabase } from '@/lib/supabase-auth'
import { getErrorDetails, notify } from '@/lib/notify'
import FullScreenLoading from '@/components/ui/FullScreenLoading'

const MicrosoftCallback = () => {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleMicrosoftCallback = async () => {
      try {
        console.log('🔄 处理Microsoft OAuth回调...')
        
        // 获取当前会话
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('获取会话失败:', sessionError)
          throw sessionError
        }

        if (!session?.user) {
          console.error('未找到用户会话')
          throw new Error('认证失败：未找到用户会话')
        }

        console.log('✅ Microsoft用户认证成功:', session.user)
        
        // 同步用户信息到数据库
        const user = await syncMicrosoftUserToSupabase(session.user)
        
        // 更新本地状态
        setUser(user)
        
        console.log('✅ 用户信息同步完成:', user)
        notify.success('Microsoft登录成功！')
        
        // 重定向到首页
        navigate('/app/map', { replace: true })
        
      } catch (error) {
        console.error('❌ Microsoft OAuth回调处理失败:', error)
        notify.critical('登录失败，请重试', {
          title: 'Microsoft 登录失败',
          details: getErrorDetails(error),
        })
        navigate('/login', { replace: true })
      } finally {
        setIsProcessing(false)
      }
    }

    handleMicrosoftCallback()
  }, [navigate, setUser])

  if (isProcessing) {
    return <FullScreenLoading message="正在处理Microsoft登录..." />
  }

  return null
}

export default MicrosoftCallback
