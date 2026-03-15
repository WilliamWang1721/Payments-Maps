import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Edit, Trash2, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getErrorDetails, notify } from '@/lib/notify'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { getPOSStatusDotClass, getPOSStatusLabel } from '@/lib/posStatus'
import FullScreenLoading from '@/components/ui/FullScreenLoading'
import type { POSMachine } from '@/types'
import { useUserPOSStore } from '@/stores/useUserPOSStore'
import { useAsyncAction } from '@/hooks/useAsyncAction'

const MyPOS: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const posMachines = useUserPOSStore((state) => state.myPOSMachines)
  const loading = useUserPOSStore((state) => state.myPOSLoading)
  const loaded = useUserPOSStore((state) => state.myPOSLoaded)
  const myPOSError = useUserPOSStore((state) => state.myPOSError)
  const loadMyPOSMachines = useUserPOSStore((state) => state.loadMyPOSMachines)
  const removeMyPOSMachine = useUserPOSStore((state) => state.removeMyPOSMachine)
  const resetUserPOSState = useUserPOSStore((state) => state.reset)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPOS, setSelectedPOS] = useState<POSMachine | null>(null)
  const { loading: deleting, run: runDeletePOS } = useAsyncAction()

  const fetchMyPOS = useCallback(async () => {
    if (!user) return

    try {
      await loadMyPOSMachines(user.id)
    } catch (error) {
      console.error('加载我的POS机失败:', error)
      notify.critical('加载失败，请重试', {
        title: '加载我的 POS 机失败',
        details: getErrorDetails(error),
      })
    }
  }, [loadMyPOSMachines, user])

  useEffect(() => {
    if (user) {
      void fetchMyPOS()
    } else {
      resetUserPOSState()
      navigate('/login')
    }
  }, [fetchMyPOS, navigate, resetUserPOSState, user])

  useBodyScrollLock(showDeleteModal, { includeHtml: true })

  const handleDelete = async () => {
    if (!selectedPOS) return

    const removed = await runDeletePOS(() => removeMyPOSMachine(selectedPOS.id), {
      logLabel: '删除POS机失败',
      feedback: 'critical',
      errorMessage: '删除失败，请重试',
      errorTitle: '删除 POS 机失败',
    })
    if (removed === null) return

    notify.success('POS机已删除')
    setShowDeleteModal(false)
    setSelectedPOS(null)
  }

  if (loading || !loaded) {
    return <FullScreenLoading message="加载中..." />
  }

  const hasInitialLoadError = Boolean(myPOSError) && posMachines.length === 0
  const formatCreatedDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '未知日期'
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">我的POS机</h1>
            </div>
            <button
              onClick={() => navigate('/app/add-pos')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>添加POS机</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasInitialLoadError ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">POS 列表加载失败</h3>
              <p className="text-gray-600 mb-6">{myPOSError}</p>
              <button
                onClick={() => void fetchMyPOS()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          </div>
        ) : posMachines.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有添加POS机</h3>
              <p className="text-gray-600 mb-6">开始添加您的第一台POS机吧</p>
              <button
                onClick={() => navigate('/app/add-pos')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加POS机
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posMachines.map((pos) => (
              <div key={pos.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Status and Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getPOSStatusDotClass(pos.status)}`}></div>
                      <span className="text-sm text-gray-600">{getPOSStatusLabel(pos.status)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/app/edit-pos/${pos.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPOS(pos)
                          setShowDeleteModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* POS Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {pos.merchant_name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      {pos.address}
                    </p>
                    {pos.basic_info?.model && (
                      <p className="text-gray-600 text-sm">
                        型号: {pos.basic_info.model}
                      </p>
                    )}
                  </div>

                  {/* Basic Info */}
                  {pos.basic_info?.acquiring_institution && (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <span>收单机构: {pos.basic_info.acquiring_institution}</span>
                    </div>
                  )}

                  {/* Created Time */}
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Clock className="h-4 w-4 mr-1" />
                    添加于 {formatCreatedDate(pos.created_at)}
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => navigate(`/app/pos/${pos.id}`)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal &&
        selectedPOS &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除</h3>
              <p className="text-gray-600 mb-6">
                确定要删除 "{selectedPOS.merchant_name}" 这台POS机吗？此操作无法撤销。
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedPOS(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
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

export default MyPOS
