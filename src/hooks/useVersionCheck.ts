import { useState, useEffect } from 'react'
import { shouldShowVersionUpdate, currentVersion, type VersionInfo } from '@/lib/version'

export interface UseVersionCheckReturn {
  showVersionModal: boolean
  versionInfo: VersionInfo
  closeVersionModal: () => void
  checkVersion: () => void
}

/**
 * 版本检查Hook
 * 用于管理版本更新提示的显示逻辑
 */
export const useVersionCheck = (): UseVersionCheckReturn => {
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionInfo] = useState(currentVersion)

  // 检查版本更新
  const checkVersion = () => {
    if (shouldShowVersionUpdate()) {
      // 延迟显示弹窗，确保应用完全加载
      setTimeout(() => {
        setShowVersionModal(true)
      }, 1000)
    }
  }

  // 关闭版本弹窗
  const closeVersionModal = () => {
    setShowVersionModal(false)
  }

  // 组件挂载时自动检查版本
  useEffect(() => {
    checkVersion()
  }, [])

  return {
    showVersionModal,
    versionInfo,
    closeVersionModal,
    checkVersion
  }
}

export default useVersionCheck