import { useCallback, useEffect, useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { supabase } from '@/lib/supabase'

export interface PasskeyRecord {
  id: string
  friendly_name: string
  created_at: string
  last_used_at?: string | null
  device_type?: string | null
  backed_up?: boolean | null
}

const getAccessToken = async () => {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error) throw new Error(error.message || '无法获取登录状态')
  const token = session?.access_token
  if (!token) {
    throw new Error('当前登录方式不支持 Passkey，请使用 Supabase OAuth 登录后再试')
  }
  return token
}

const request = async (
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
) => {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  }
  let payload: BodyInit | undefined

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(path, {
    method,
    headers,
    body: payload
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || '请求失败，请稍后再试')
  }
  return data
}

export const usePasskeyManager = () => {
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPasskeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await request('/api/passkey/list', 'GET')
      setPasskeys(data?.passkeys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Passkey 失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPasskeys().catch((err) => {
      console.error('Passkey 初始化失败', err)
    })
  }, [loadPasskeys])

  const registerPasskey = useCallback(
    async (friendlyName: string) => {
      if (typeof window === 'undefined') {
        throw new Error('Passkey 注册只在浏览器环境中可用')
      }
      if (!window.PublicKeyCredential) {
        throw new Error('当前浏览器不支持 Passkey，请更换浏览器后重试')
      }

      setActionLoading(true)
      setError(null)
      try {
        const options = await request('/api/passkey/register/options', 'POST')
        const attestationResponse = await startRegistration(options)
        await request('/api/passkey/register/verify', 'POST', {
          attestationResponse,
          friendlyName
        })
        await loadPasskeys()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Passkey 注册失败')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    [loadPasskeys]
  )

  const deletePasskey = useCallback(
    async (id: string) => {
      setActionLoading(true)
      setError(null)
      try {
        await request('/api/passkey/delete', 'DELETE', { id })
        setPasskeys((prev) => prev.filter((item) => item.id !== id))
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除 Passkey 失败')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    []
  )

  const renamePasskey = useCallback(
    async (id: string, friendlyName: string) => {
      setActionLoading(true)
      setError(null)
      try {
        await request('/api/passkey/rename', 'PATCH', { id, friendlyName })
        setPasskeys((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, friendly_name: friendlyName } : item
          )
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : '重命名 Passkey 失败')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    []
  )

  return {
    passkeys,
    loading,
    actionLoading,
    error,
    refresh: loadPasskeys,
    registerPasskey,
    deletePasskey,
    renamePasskey
  }
}
