import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Bell,
  MapPin,
  Shield,
  Trash2,
  Save,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  FileDown,
  History,
  Undo2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from 'sonner'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedInput from '@/components/ui/AnimatedInput'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'

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

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t, i18n } = useTranslation()
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const initialPrivacyPreferences = {
    locationHistory: true,
    usageAnalytics: true,
    personalization: true,
    marketing: false,
    dataSharing: false,
  }
  type PrivacyPreferenceKey = keyof typeof initialPrivacyPreferences
  type ConsentHistoryEntry = {
    key: PrivacyPreferenceKey | 'all'
    action: 'granted' | 'revoked'
    timestamp: string
  }
  const [privacyPreferences, setPrivacyPreferences] = useState(initialPrivacyPreferences)
  const [dataRetention, setDataRetention] = useState<'3' | '6' | '12' | '24'>('12')
  const [privacyLastUpdated, setPrivacyLastUpdated] = useState(new Date())
  const [downloadingPrivacyReport, setDownloadingPrivacyReport] = useState(false)
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryEntry[]>([
    {
      key: 'usageAnalytics',
      action: 'granted',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      key: 'locationHistory',
      action: 'granted',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
  ])
  const privacyLabelMap: Record<PrivacyPreferenceKey, string> = {
    locationHistory: 'settings.privacyLocationHistory',
    usageAnalytics: 'settings.privacyUsageAnalytics',
    personalization: 'settings.privacyPersonalization',
    marketing: 'settings.privacyMarketing',
    dataSharing: 'settings.privacyDataSharing',
  }

  useEffect(() => {
    if (user) {
      loadSettings()
    } else {
      navigate('/login')
    }
  }, [user, navigate])

  const loadSettings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('加载设置失败:', error)
        toast.error('加载设置失败，请重试')
        return
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      toast.error('加载设置失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          ...settings,
          user_id: user.id,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('保存设置失败:', error)
        toast.error('保存失败，请重试')
        return
      }

      toast.success('设置已保存')
    } catch (error) {
      console.error('保存设置失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('请填写新密码')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (newPassword.length < 6) {
      toast.error('密码长度至少6位')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        console.error('修改密码失败:', error)
        toast.error('修改密码失败，请重试')
        return
      }

      toast.success('密码修改成功')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
    } catch (error) {
      console.error('修改密码失败:', error)
      toast.error('修改密码失败，请重试')
    } finally {
      setChangingPassword(false)
    }
  }

  const deleteAccount = async () => {
    if (!user) return

    setDeleting(true)
    try {
      // 删除用户相关数据
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.error('删除账户失败:', deleteError)
        toast.error('删除账户失败，请联系客服')
        return
      }

      toast.success('账户已删除')
      logout()
      navigate('/login')
    } catch (error) {
      console.error('删除账户失败:', error)
      toast.error('删除账户失败，请联系客服')
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
      toast.error('退出登录失败，请重试')
    }
  }

  const appendConsentHistory = (entry: ConsentHistoryEntry) => {
    setConsentHistory((prev) => [entry, ...prev].slice(0, 10))
  }

  const handlePrivacyToggle = (key: PrivacyPreferenceKey) => {
    setPrivacyPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      const action: ConsentHistoryEntry['action'] = updated[key] ? 'granted' : 'revoked'
      appendConsentHistory({ key, action, timestamp: new Date().toISOString() })
      setPrivacyLastUpdated(new Date())
      toast.success(t('settings.privacyPreferenceUpdated'))
      return updated
    })
  }

  const handleRetentionChange = (value: '3' | '6' | '12' | '24') => {
    setDataRetention(value)
    setPrivacyLastUpdated(new Date())
    toast.success(t('settings.privacyPreferenceUpdated'))
  }

  const handleDownloadPrivacyReport = async () => {
    if (downloadingPrivacyReport) return
    setDownloadingPrivacyReport(true)
    toast.info(t('settings.privacyDownloadPreparing'))
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setDownloadingPrivacyReport(false)
    toast.success(t('settings.privacyDownloadReady'))
  }

  const handleRevokeAllConsents = () => {
    setPrivacyPreferences({
      locationHistory: false,
      usageAnalytics: false,
      personalization: false,
      marketing: false,
      dataSharing: false,
    })
    appendConsentHistory({ key: 'all', action: 'revoked', timestamp: new Date().toISOString() })
    setPrivacyLastUpdated(new Date())
    toast.success(t('settings.privacyRevokeSuccess'))
  }

  const formatDateTime = (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <AnimatedButton
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </AnimatedButton>
              <h1 className="text-xl font-semibold text-gray-900">{t('settings.title')}</h1>
            </div>
            <AnimatedButton
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? t('settings.loading') : t('settings.saveSettings')}</span>
            </AnimatedButton>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <User className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.accountInfo')}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.email')}</label>
                  <AnimatedInput
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.userId')}</label>
                  <AnimatedInput
                    type="text"
                    value={user?.id || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.passwordChange')}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.newPassword')}</label>
                  <div className="relative">
                    <AnimatedInput
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="请输入新密码（至少6位）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <AnimatedButton
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </AnimatedButton>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                  <AnimatedInput
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <AnimatedButton
                  onClick={changePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {changingPassword ? t('settings.changing') : t('settings.changePassword')}
                </AnimatedButton>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Bell className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">通知设置</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('settings.enableNotifications')}</label>
                    <p className="text-sm text-gray-500">{t('settings.notificationDescription')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_notifications}
                      onChange={(e) => setSettings({ ...settings, enable_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Center */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.privacyCenter')}</h2>
                  </div>
                  <p className="text-sm text-gray-500">{t('settings.privacyCenterDescription')}</p>
                </div>
                <div className="text-xs text-gray-500 flex items-center space-x-2">
                  <History className="h-4 w-4" />
                  <span>{t('settings.privacyLastUpdated', { date: formatDateTime(privacyLastUpdated) })}</span>
                </div>
              </div>

              <div className="space-y-6">
                {(
                  [
                    'locationHistory',
                    'usageAnalytics',
                    'personalization',
                    'marketing',
                    'dataSharing',
                  ] as PrivacyPreferenceKey[]
                ).map((key) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">{t(privacyLabelMap[key])}</p>
                      <p className="text-sm text-gray-500">{t(`${privacyLabelMap[key]}Description`)}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer self-end sm:self-center">
                      <input
                        type="checkbox"
                        checked={privacyPreferences[key]}
                        onChange={() => handlePrivacyToggle(key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{t('settings.privacyRetentionTitle')}</p>
                  <p className="text-sm text-gray-500">{t('settings.privacyRetentionDescription')}</p>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.privacyRetentionPeriod')}</label>
                    <select
                      value={dataRetention}
                      onChange={(event) => handleRetentionChange(event.target.value as '3' | '6' | '12' | '24')}
                      className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="3">{t('settings.privacyRetentionOption3')}</option>
                      <option value="6">{t('settings.privacyRetentionOption6')}</option>
                      <option value="12">{t('settings.privacyRetentionOption12')}</option>
                      <option value="24">{t('settings.privacyRetentionOption24')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatedButton
                    onClick={handleDownloadPrivacyReport}
                    disabled={downloadingPrivacyReport}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>
                      {downloadingPrivacyReport
                        ? t('settings.privacyDownloadPreparing')
                        : t('settings.privacyDownloadReport')}
                    </span>
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={handleRevokeAllConsents}
                    className="w-full flex items-center justify-center space-x-2 bg-rose-50 text-rose-600 px-4 py-3 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    <Undo2 className="h-4 w-4" />
                    <span>{t('settings.privacyRevokeAll')}</span>
                  </AnimatedButton>
                </div>

                <div className="grid gap-4 md:grid-cols-2 text-xs text-gray-500">
                  <p>{t('settings.privacyDownloadReportDescription')}</p>
                  <p>{t('settings.privacyRevokeAllDescription')}</p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-900">{t('settings.privacyConsentHistory')}</p>
                  {consentHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('settings.privacyConsentHistoryEmpty')}</p>
                  ) : (
                    <div className="space-y-3">
                      {consentHistory.map((entry) => {
                        const label =
                          entry.key === 'all'
                            ? t('settings.privacyAllConsents')
                            : t(privacyLabelMap[entry.key])
                        const isGranted = entry.action === 'granted'
                        return (
                          <div
                            key={`${entry.key}-${entry.timestamp}`}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{label}</p>
                              <p className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</p>
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                isGranted ? 'text-green-600' : 'text-rose-600'
                              }`}
                            >
                              {isGranted
                                ? t('settings.privacyConsentGranted')
                                : t('settings.privacyConsentRevoked')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Map Settings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <MapPin className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">地图设置</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">默认搜索半径（米）</label>
                  <select
                    value={settings.default_search_radius}
                    onChange={(e) => setSettings({ ...settings, default_search_radius: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={500}>500米</option>
                    <option value={1000}>1公里</option>
                    <option value={2000}>2公里</option>
                    <option value={5000}>5公里</option>
                    <option value={10000}>10公里</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">启用位置跟踪</label>
                    <p className="text-sm text-gray-500">自动获取您的位置以提供更好的搜索结果</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_location_tracking}
                      onChange={(e) => setSettings({ ...settings, enable_location_tracking: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">显示POS机状态</label>
                    <p className="text-sm text-gray-500">在地图上显示POS机运行状态</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.show_pos_status}
                      onChange={(e) => setSettings({ ...settings, show_pos_status: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">自动刷新间隔（秒）</label>
                  <select
                    value={settings.auto_refresh_interval}
                    onChange={(e) => setSettings({ ...settings, auto_refresh_interval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>关闭自动刷新</option>
                    <option value={15}>15秒</option>
                    <option value={30}>30秒</option>
                    <option value={60}>1分钟</option>
                    <option value={300}>5分钟</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Language and Theme */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.interface')}</h2>
              <div className="space-y-6">
                <div>
                  <LanguageSwitcher className="w-full" showLabel={true} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.theme')}</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="light">{t('settings.lightMode')}</option>
                    <option value="dark">{t('settings.darkMode')}</option>
                    <option value="auto">{t('settings.autoMode')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 引导设置 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">引导设置</h2>
              <div className="space-y-4">
                <AnimatedButton
                  onClick={() => {
                    resetTour()
                    toast.success('新手引导已重置，返回地图页面将重新开始')
                    setTimeout(() => navigate('/app/map'), 1000)
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>重新开始新手引导</span>
                </AnimatedButton>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">账户操作</h2>
              <div className="space-y-4">
                <AnimatedButton
                  onClick={handleSignOut}
                  className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  退出登录
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>删除账户</span>
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除账户</h3>
            <p className="text-gray-600 mb-6">
              删除账户将永久删除您的所有数据，包括收藏、历史记录、添加的POS机等。此操作无法撤销。
            </p>
            <div className="flex space-x-4">
              <AnimatedButton
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                取消
              </AnimatedButton>
              <AnimatedButton
                onClick={deleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '删除中...' : '确认删除'}
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings