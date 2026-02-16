import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Mail,
  Hash,
  Loader2,
  Map,
  Bell,
  RotateCcw,
  LogOut,
  Trash2,
  SunMedium,
  Moon,
  Palette
} from 'lucide-react'
import clsx from 'clsx'
import { getErrorDetails, notify } from '@/lib/notify'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import { PasskeyManager } from '@/components/settings/PasskeyManager'
import {
  DEFAULT_LOCATION_OPTIONS,
  getDefaultLocationByKey,
  getUserDefaultLocationKey,
  resolveDefaultLocationFromSettings,
  saveUserDefaultLocationKey
} from '@/lib/defaultLocation'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface UserSettings {
  id?: string
  user_id: string
  default_search_radius: number
  enable_notifications: boolean
  enable_location_tracking: boolean
  preferred_language: string
  theme: string
  auto_refresh_interval: number
  show_pos_status: boolean
  created_at?: string
  updated_at?: string
}

const themeOptions = [
  { value: 'light', label: '浅色', icon: SunMedium },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'auto', label: '自动', icon: Palette }
]

const autoRefreshOptions = [
  { value: 0, label: '关闭自动刷新' },
  { value: 15, label: '每15秒' },
  { value: 30, label: '每30秒' },
  { value: 60, label: '每1分钟' },
  { value: 300, label: '每5分钟' }
]

const Settings = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const setCurrentLocation = useMapStore((state) => state.setCurrentLocation)
  const { resetTour } = useOnboardingTour()

  const [settings, setSettings] = useState<UserSettings>({
    user_id: user?.id || '',
    default_search_radius: 2000,
    enable_notifications: true,
    enable_location_tracking: true,
    preferred_language: 'zh-CN',
    theme: 'light',
    auto_refresh_interval: 30,
    show_pos_status: true
  })
  const [defaultLocationKey, setDefaultLocationKey] = useState<string>('guangzhou')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('加载设置失败:', error)
        notify.error('加载设置失败，请重试')
      }

      if (data) {
        setSettings(data as UserSettings)
        const resolved = resolveDefaultLocationFromSettings(data, user.id)
        if (resolved.key && DEFAULT_LOCATION_OPTIONS.some((option) => option.key === resolved.key)) {
          setDefaultLocationKey(resolved.key)
          saveUserDefaultLocationKey(user.id, resolved.key)
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      notify.error('加载设置失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      setSettings((prev) => ({ ...prev, user_id: user.id }))
      setDefaultLocationKey(getUserDefaultLocationKey(user.id))
      void loadSettings()
    } else {
      navigate('/login')
    }
  }, [user, navigate, loadSettings])

  useBodyScrollLock(showDeleteModal, { includeHtml: true })

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      const selectedDefaultLocation = getDefaultLocationByKey(defaultLocationKey)
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          ...settings,
          user_id: user.id,
          default_location_key: defaultLocationKey,
          default_location_address: selectedDefaultLocation.label,
          default_location_longitude: selectedDefaultLocation.longitude,
          default_location_latitude: selectedDefaultLocation.latitude,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('保存设置失败:', error)
        notify.error('保存失败，请重试')
        return
      }

      saveUserDefaultLocationKey(user.id, defaultLocationKey)
      setCurrentLocation(getDefaultLocationByKey(defaultLocationKey))
      notify.success('设置已保存')
    } catch (error) {
      console.error('保存设置失败:', error)
      notify.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) {
        notify.critical('删除账户失败，请联系客服', {
          title: '删除账户失败',
          details: getErrorDetails(error),
        })
        return
      }
      notify.success('账户已删除')
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('删除账户失败:', error)
      notify.critical('删除账户失败，请联系客服', {
        title: '删除账户失败',
        details: getErrorDetails(error),
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('退出登录失败:', error)
      notify.error('退出登录失败，请重试')
    }
  }

  const radiusKm = useMemo(() => {
    const km = settings.default_search_radius / 1000
    if (!km || Number.isNaN(km)) return 0.5
    return Math.min(10, Math.max(0.5, parseFloat(km.toFixed(1))))
  }, [settings.default_search_radius])

  const radiusLabel = radiusKm < 1 ? `${Math.round(radiusKm * 1000)} m` : `${radiusKm} km`

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-soft-black" />
          <p className="mt-3 text-sm text-gray-500">正在加载个性化设置...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-soft backdrop-blur sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-gray-200 p-3 text-soft-black transition hover:border-soft-black"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                {t('settings.title')}
              </p>
              <h1 className="text-2xl font-bold text-soft-black">账户与体验配置</h1>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-soft-black px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-soft-black/20 transition hover:bg-[#101940] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>

        <section className="rounded-[32px] border border-white/60 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream text-soft-black">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-soft-black">
                  {user?.user_metadata?.display_name || user?.email || 'Payments Maps 用户'}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email || '尚未绑定邮箱'}
                </p>
                <p className="mt-1 flex items-center gap-2 truncate text-xs text-gray-400">
                  <Hash className="h-3.5 w-3.5" />
                  {user?.id}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-soft-black transition hover:border-soft-black"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:border-red-500"
              >
                <Trash2 className="h-4 w-4" />
                删除账户
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <PasskeyManager />

            <section className="rounded-3xl border border-gray-100 bg-cream p-6 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white px-3 py-2 text-soft-black">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-soft-black">界面与语言</h2>
                  <p className="text-sm text-gray-500">自定义界面语言与主题风格</p>
                </div>
              </div>
              <div className="mt-6 space-y-6">
                <LanguageSwitcher className="w-full" showLabel />
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-600">主题模式</p>
                  <div className="flex flex-wrap gap-3">
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      const isActive = settings.theme === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => setSettings({ ...settings, theme: option.value })}
                          className={clsx(
                            'flex flex-1 min-w-[150px] items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                            isActive
                              ? 'border-soft-black bg-white text-soft-black shadow-soft'
                              : 'border-transparent bg-white/60 text-gray-500 hover:border-gray-200'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-cream px-3 py-2 text-soft-black">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-soft-black">引导体验</h2>
                  <p className="text-sm text-gray-500">重置新手引导，回到地图重新体验</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetTour()
                  notify.success('新手引导已重置，返回地图可重新体验')
                  setTimeout(() => navigate('/app/map'), 800)
                }}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-soft-black transition hover:border-soft-black"
              >
                重新开始地图引导
              </button>
            </section>
          </div>

          <div className="space-y-6 lg:flex lg:h-full lg:flex-col lg:gap-6 lg:space-y-0">
            <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-cream px-3 py-2 text-soft-black">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-soft-black">地图体验</h2>
                  <p className="text-sm text-gray-500">调整地图数据刷新与展示方式</p>
                </div>
              </div>
              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                    <span>默认搜索半径</span>
                    <span className="font-semibold text-soft-black">{radiusLabel}</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={radiusKm}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_search_radius: Math.round(parseFloat(e.target.value) * 1000)
                      })
                    }
                    className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-soft-black"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-soft-black">默认地点</p>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80">
                    <select
                      value={defaultLocationKey}
                      onChange={(e) => setDefaultLocationKey(e.target.value)}
                      className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-soft-black outline-none"
                    >
                      {DEFAULT_LOCATION_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    进入地图时将优先使用该城市，不会自动请求系统定位权限（可手动点击顶部定位按钮）。
                  </p>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-soft-black">允许定位权限</p>
                      <p className="text-xs text-gray-500">用于手动点击定位按钮时获取当前位置</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enable_location_tracking}
                      onChange={(e) =>
                        setSettings({ ...settings, enable_location_tracking: e.target.checked })
                      }
                      className="h-5 w-10 cursor-pointer rounded-full border-0 bg-gray-300 transition checked:bg-soft-black"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-soft-black">显示 POS 状态</p>
                      <p className="text-xs text-gray-500">在地图上展示可用/维护中的 POS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.show_pos_status}
                      onChange={(e) =>
                        setSettings({ ...settings, show_pos_status: e.target.checked })
                      }
                      className="h-5 w-10 cursor-pointer rounded-full border-0 bg-gray-300 transition checked:bg-soft-black"
                    />
                  </label>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-soft-black">自动刷新频率</p>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80">
                    <select
                      value={settings.auto_refresh_interval}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_refresh_interval: parseInt(e.target.value, 10)
                        })
                      }
                      className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-soft-black outline-none"
                    >
                      {autoRefreshOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-cream p-6 shadow-soft lg:mt-auto">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white px-3 py-2 text-soft-black">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-soft-black">提醒与推送</h2>
                  <p className="text-sm text-gray-500">关注收藏更新与附近新增推荐</p>
                </div>
              </div>
              <label className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-soft-black">通知推送</p>
                  <p className="text-xs text-gray-500">收藏的 POS 有更新时通过通知告知</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enable_notifications}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_notifications: e.target.checked })
                  }
                  className="h-5 w-10 cursor-pointer rounded-full border-0 bg-gray-300 transition checked:bg-soft-black"
                />
              </label>
            </section>
          </div>
        </div>
      </div>

      {showDeleteModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-soft-black">确定删除账户？</h3>
              <p className="mt-2 text-sm text-gray-500">
                删除账户后，您添加的 POS、收藏、历史记录等所有数据都将被清空，此操作不可恢复。
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-soft-black"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default Settings
