import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { handleLinuxDOCallback } from '@/lib/linuxdo-auth'
import { verifyOAuthState } from '@/lib/linuxdo-oauth'
import Loading from '@/components/ui/Loading'
import { getErrorDetails, notify } from '@/lib/notify'

export default function LinuxDOCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL parameters
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error('LinuxDO OAuth error:', error, errorDescription)
          setStatus('error')
          setErrorMessage(errorDescription || error)
          notify.critical('登录失败: ' + (errorDescription || error), { title: 'LinuxDO 登录失败' })
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (!code) {
          setStatus('error')
          setErrorMessage('未获取到授权码')
          notify.critical('登录失败: 未获取到授权码', { title: 'LinuxDO 登录失败' })
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        // Verify state parameter for CSRF protection
        if (!state || !verifyOAuthState(state)) {
          setStatus('error')
          setErrorMessage('安全验证失败，请重新登录')
          notify.critical('登录失败: 安全验证失败', { title: 'LinuxDO 登录失败' })
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        // Handle OAuth callback
        console.log('处理LinuxDO OAuth回调...')
        const user = await handleLinuxDOCallback(code)
        
        // Update auth store
        setUser(user)
        setStatus('success')
        
        notify.success('登录成功!')
        
        // Redirect to main app
        setTimeout(() => {
          navigate('/app/map', { replace: true })
        }, 1500)
        
      } catch (error) {
        console.error('处理LinuxDO回调失败:', error)
        setStatus('error')
        const message = error instanceof Error ? error.message : '登录过程中发生错误'
        setErrorMessage(message)
        notify.critical('登录失败: ' + message, {
          title: 'LinuxDO 登录失败',
          details: getErrorDetails(error),
        })
        
        // Redirect back to login page after error
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loading />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                正在处理 LinuxDO 登录...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                请稍候，我们正在验证您的身份
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                登录成功!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                正在跳转到应用主页...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                登录失败
              </h2>
              <p className="mt-2 text-sm text-gray-600 mb-4">
                {errorMessage}
              </p>
              <p className="text-xs text-gray-500">
                正在返回登录页面...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
