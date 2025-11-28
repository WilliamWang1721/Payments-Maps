import { useMemo, useState } from 'react'
import { Key, Loader2, PenSquare, Trash2, Plus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePasskeyManager } from '@/hooks/usePasskeys'

const formatDate = (value?: string | null) => {
  if (!value) return '尚未使用'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export const PasskeyManager = () => {
  const {
    passkeys,
    loading,
    actionLoading,
    error,
    registerPasskey,
    deletePasskey,
    renamePasskey
  } = usePasskeyManager()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const handleRegister = async () => {
    const friendlyName = (newName || '').trim()
    try {
      await registerPasskey(friendlyName)
      toast.success('Passkey 已注册')
      setShowAddForm(false)
      setNewName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Passkey 注册失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePasskey(id)
      toast.success('Passkey 已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败，请重试')
    }
  }

  const startEdit = (id: string, current: string) => {
    setEditingId(id)
    setEditingValue(current)
  }

  const handleRename = async () => {
    if (!editingId) return
    const friendlyName = editingValue.trim()
    if (!friendlyName) {
      toast.error('名称不能为空')
      return
    }
    try {
      await renamePasskey(editingId, friendlyName)
      toast.success('名称已更新')
      setEditingId(null)
      setEditingValue('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败，请重试')
    }
  }

  const canUsePasskey = useMemo(
    () => typeof window !== 'undefined' && !!window.PublicKeyCredential,
    []
  )

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-soft-black">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-soft-black">Passkey 无密码登录</h3>
            <p className="text-sm text-gray-500">
              使用 Face ID / 指纹等生物识别登录，更安全、更快捷
            </p>
          </div>
        </div>
        {canUsePasskey ? (
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-soft-black transition hover:border-soft-black"
            disabled={actionLoading}
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? '取消' : '添加 Passkey'}
          </button>
        ) : (
          <span className="text-sm text-gray-500">
            当前浏览器不支持 Passkey，请在支持 WebAuthn 的浏览器中添加
          </span>
        )}
      </div>

      {showAddForm && canUsePasskey && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newName}
            maxLength={80}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="为新的 Passkey 设置一个名称，例如「iPhone Face ID」"
            className="flex-1 rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-soft-black shadow-inner shadow-gray-100 outline-none focus:border-soft-black"
          />
          <button
            onClick={handleRegister}
            disabled={actionLoading}
            className="inline-flex items-center justify-center rounded-2xl bg-soft-black px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#101940]"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              '开始注册'
            )}
          </button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            正在同步 Passkey...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && passkeys.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-center text-sm text-gray-500">
            暂无 Passkey，添加后可快速登录 Payments Maps
          </div>
        )}

        {passkeys.map((passkey) => (
          <div
            key={passkey.id}
            className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 shadow-sm transition hover:border-soft-black/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              {editingId === passkey.id ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={editingValue}
                    maxLength={80}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="flex-1 rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-soft-black"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRename}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center rounded-2xl bg-soft-black px-3 py-2 text-xs font-semibold text-white"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-soft-black">
                    {passkey.friendly_name || '未命名 Passkey'}
                  </p>
                  <p className="text-xs text-gray-500">
                    最近使用：{formatDate(passkey.last_used_at)}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {passkey.device_type && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {passkey.device_type === 'multiDevice'
                          ? '跨设备凭证'
                          : '单设备凭证'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                      注册时间：{formatDate(passkey.created_at)}
                    </span>
                    {passkey.backed_up !== undefined && passkey.backed_up !== null && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                        {passkey.backed_up ? '已备份' : '未备份'}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            {editingId !== passkey.id && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(passkey.id, passkey.friendly_name || '')}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 p-2 text-gray-500 hover:border-soft-black hover:text-soft-black"
                  aria-label="重命名 Passkey"
                >
                  <PenSquare className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(passkey.id)}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 p-2 text-gray-500 hover:border-red-500 hover:text-red-500"
                  aria-label="删除 Passkey"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
