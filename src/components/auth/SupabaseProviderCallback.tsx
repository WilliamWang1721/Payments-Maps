import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type User } from '@/lib/supabase'
import { getErrorDetails, notify } from '@/lib/notify'
import { useAuthStore } from '@/stores/useAuthStore'
import FullScreenLoading from '@/components/ui/FullScreenLoading'

interface SupabaseProviderCallbackProps {
  providerName: string
  processingMessage: string
  syncUserToSupabase: (oauthUser: any) => Promise<User>
  replaceAfterSuccess?: boolean
  replaceAfterFailure?: boolean
}

const SupabaseProviderCallback = ({
  providerName,
  processingMessage,
  syncUserToSupabase,
  replaceAfterSuccess = false,
  replaceAfterFailure = false,
}: SupabaseProviderCallbackProps) => {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  useEffect(() => {
    const redirectToLogin = (error?: unknown) => {
      notify.critical(`${providerName}登录失败`, {
        title: '登录失败',
        details: getErrorDetails(error),
      })
      navigate('/login', { replace: replaceAfterFailure })
    }

    const handleProviderCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error(`${providerName}认证回调错误:`, error)
          redirectToLogin(error)
          return
        }

        if (!data.session?.user) {
          console.error(`${providerName}认证失败：未获取到用户信息`)
          redirectToLogin()
          return
        }

        const user = await syncUserToSupabase(data.session.user)
        setUser(user)
        notify.success(`${providerName}登录成功！`)
        navigate('/app/map', { replace: replaceAfterSuccess })
      } catch (error) {
        console.error(`${providerName}认证回调处理失败:`, error)
        redirectToLogin(error)
      }
    }

    void handleProviderCallback()
  }, [
    navigate,
    providerName,
    replaceAfterFailure,
    replaceAfterSuccess,
    setUser,
    syncUserToSupabase,
  ])

  return <FullScreenLoading message={processingMessage} />
}

export default SupabaseProviderCallback
