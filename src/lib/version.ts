// 版本信息配置
export interface VersionInfo {
  version: string
  updateTime: string
  updateContent: string[]
}

// 当前版本信息
export const currentVersion: VersionInfo = {
  version: '1.2.0',
  updateTime: '2024-01-20',
  updateContent: [
    '🎉 新增版本更新提示功能',
    '🔧 修复了POS机添加时的权限问题',
    '📍 优化了位置获取的超时处理',
    '💾 实现了Supabase数据库同步功能',
    '🗺️ 改进了地图显示和交互体验'
  ]
}

// 版本存储键名
export const VERSION_STORAGE_KEY = 'payments_maps_last_seen_version'

// 检查是否需要显示版本更新提示
export const shouldShowVersionUpdate = (): boolean => {
  const lastSeenVersion = localStorage.getItem(VERSION_STORAGE_KEY)
  return lastSeenVersion !== currentVersion.version
}

// 标记当前版本已查看
export const markVersionAsSeen = (): void => {
  localStorage.setItem(VERSION_STORAGE_KEY, currentVersion.version)
}

// 获取版本历史（可扩展功能）
export const getVersionHistory = (): VersionInfo[] => {
  return [
    {
      version: '1.1.0',
      updateTime: '2024-01-15',
      updateContent: [
        '🗺️ 新增地图功能',
        '📱 优化移动端体验',
        '🔍 添加搜索功能'
      ]
    },
    {
      version: '1.0.0',
      updateTime: '2024-01-10',
      updateContent: [
        '🚀 项目正式发布',
        '💳 基础POS机管理功能',
        '👤 用户认证系统'
      ]
    }
  ]
}