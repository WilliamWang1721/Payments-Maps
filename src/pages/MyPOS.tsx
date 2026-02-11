import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Clock, Edit, Trash2, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase, type POSMachine } from '@/lib/supabase'
import { getErrorDetails, notify } from '@/lib/notify'

const MyPOS: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [posMachines, setPOSMachines] = useState<POSMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPOS, setSelectedPOS] = useState<POSMachine | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      loadMyPOSMachines()
    } else {
      navigate('/login')
    }
  }, [user, navigate])

  useEffect(() => {
    if (typeof document === 'undefined' || !showDeleteModal) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [showDeleteModal])

  const loadMyPOSMachines = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('pos_machines')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('加载我的POS机失败:', error)
        notify.critical('加载失败，请重试', {
          title: '加载我的 POS 机失败',
          details: getErrorDetails(error),
        })
        return
      }

      setPOSMachines(data || [])
    } catch (error) {
      console.error('加载我的POS机失败:', error)
      notify.critical('加载失败，请重试', {
        title: '加载我的 POS 机失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPOS) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('pos_machines')
        .delete()
        .eq('id', selectedPOS.id)

      if (error) {
        console.error('删除POS机失败:', error)
        notify.error('删除失败，请重试')
        return
      }

      notify.success('POS机已删除')
      setShowDeleteModal(false)
      setSelectedPOS(null)
      loadMyPOSMachines() // 重新加载列表
    } catch (error) {
      console.error('删除POS机失败:', error)
      notify.error('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      case 'maintenance':
        return 'bg-orange-500'
      case 'disabled':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '正常运行'
      case 'inactive':
        return '暂时不可用'
      case 'maintenance':
        return '维修中'
      case 'disabled':
        return '已停用'
      default:
        return '未知状态'
    }
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
        {posMachines.length === 0 ? (
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
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(pos.status || 'active')}`}></div>
                      <span className="text-sm text-gray-600">{getStatusText(pos.status || 'active')}</span>
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
                    添加于 {new Date(pos.created_at).toLocaleDateString('zh-CN')}
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
