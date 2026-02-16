import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { syncGitHubUserToSupabase } from '@/lib/supabase-auth'
import { getErrorDetails, notify } from '@/lib/notify'
import FullScreenLoading from '@/components/ui/FullScreenLoading'

export default function GitHubCallback() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 获取URL中的认证参数
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('GitHub认证回调错误:', error)
          notify.critical('GitHub登录失败', {
            title: '登录失败',
            details: getErrorDetails(error),
          })
          navigate('/login')
          return
        }

        if (data.session?.user) {
          // 同步用户信息到数据库
          await syncGitHubUserToSupabase(data.session.user)
          
          // 更新本地状态
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            created_at: data.session.user.created_at,
            updated_at: data.session.user.updated_at || data.session.user.created_at,
            user_metadata: {
              display_name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || '',
              avatar_url: data.session.user.user_metadata?.avatar_url || '',
              provider: 'github'
            }
          })

          notify.success('GitHub登录成功！')
          navigate('/app/map')
        } else {
          console.error('GitHub认证失败：未获取到用户信息')
          notify.critical('GitHub登录失败', {
            title: '登录失败',
          })
          navigate('/login')
        }
      } catch (error) {
        console.error('GitHub认证回调处理失败:', error)
        notify.critical('GitHub登录失败', {
          title: '登录失败',
          details: getErrorDetails(error),
        })
        navigate('/login')
      }
    }

    handleAuthCallback()
  }, [navigate, setUser])

  return (
    <FullScreenLoading message="正在处理 GitHub 登录..." />
  )
}
