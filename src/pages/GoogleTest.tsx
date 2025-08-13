import React from 'react'
import { getGoogleAuthUrl } from '@/lib/google'

const GoogleTest = () => {
  const handleTestGoogleConfig = () => {
    console.log('🧪 测试Google配置')
    
    // 检查环境变量
    console.log('环境变量检查:')
    console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID)
    console.log('VITE_GOOGLE_CLIENT_SECRET:', import.meta.env.VITE_GOOGLE_CLIENT_SECRET)
    console.log('VITE_GOOGLE_API_KEY:', import.meta.env.VITE_GOOGLE_API_KEY)
    
    // 生成授权URL
    const authUrl = getGoogleAuthUrl()
    console.log('生成的授权URL:', authUrl)
    
    // 检查URL是否包含占位符
    if (authUrl.includes('your_google_client_id_here')) {
      console.error('❌ 客户端ID仍然是占位符！')
      alert('错误：Google客户端ID仍然是占位符，请检查.env文件配置')
      return
    }
    
    console.log('✅ Google配置看起来正常，即将跳转到Google授权页面')
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Google OAuth 测试
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            测试Google登录配置
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleTestGoogleConfig}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            测试Google登录配置
          </button>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>当前环境变量:</p>
            <p>CLIENT_ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID?.substring(0, 20)}...</p>
            <p>API_KEY: {import.meta.env.VITE_GOOGLE_API_KEY?.substring(0, 20)}...</p>
            <p>重定向URI: {window.location.origin}/auth/google/callback</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleTest