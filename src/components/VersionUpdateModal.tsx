import { useState } from 'react'
import { X, Sparkles, Calendar, List } from 'lucide-react'
import { currentVersion, markVersionAsSeen, type VersionInfo } from '@/lib/version'
import Button from '@/components/ui/Button'

interface VersionUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  versionInfo?: VersionInfo
}

const VersionUpdateModal = ({ 
  isOpen, 
  onClose, 
  versionInfo = currentVersion 
}: VersionUpdateModalProps) => {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    markVersionAsSeen()
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 200)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="version-update-modal fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          modal-content safari-z-fix relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all duration-200
          ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 头部 */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                版本更新
              </h2>
              <p className="text-sm text-gray-500">
                发现新功能和改进
              </p>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold text-gray-900">
                v{versionInfo.version}
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {versionInfo.updateTime}
              </div>
            </div>
          </div>
        </div>

        {/* 更新内容 */}
        <div className="px-6 pb-6">
          <div className="flex items-center mb-3">
            <List className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="font-semibold text-gray-900">更新内容</h3>
          </div>
          
          <div className="space-y-2">
            {versionInfo.updateContent.map((item, index) => (
              <div 
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6">
          <Button 
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            我知道了
          </Button>
        </div>

        {/* 装饰性元素 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl" />
      </div>
    </div>
  )
}

export default VersionUpdateModal