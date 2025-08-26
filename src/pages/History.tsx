import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Clock, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase, type POSMachine } from '@/lib/supabase'
import { toast } from 'sonner'

interface HistoryWithPOS {
  id: string
  user_id: string
  pos_id: string
  visited_at: string
  created_at: string
  pos_machines: {
    id: string
    merchant_name: string
    address: string
    latitude: number
    longitude: number
    basic_info: any
    status: string
    created_at: string
  } | null
}

const History: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [history, setHistory] = useState<HistoryWithPOS[]>([])
  const [loading, setLoading] = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (user) {
      loadHistory()
    } else {
      navigate('/login')
    }
  }, [user, navigate])

  const loadHistory = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_history')
        .select(`
          id,
          user_id,
          pos_id,
          visited_at,
          created_at,
          pos_machines (
            id,
            merchant_name,
            address,
            latitude,
            longitude,
            basic_info,
            status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(100) // 限制显示最近100条记录

      if (error) {
        console.error('加载浏览历史失败:', error)
        toast.error('加载失败，请重试')
        return
      }

      // 处理数据结构，pos_machines可能是数组
      const processedData = (data || []).map(item => ({
        ...item,
        pos_machines: Array.isArray(item.pos_machines) ? item.pos_machines[0] : item.pos_machines
      }))
      setHistory(processedData as HistoryWithPOS[])
    } catch (error) {
      console.error('加载浏览历史失败:', error)
      toast.error('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const clearAllHistory = async () => {
    if (!user) return

    setClearing(true)
    try {
      const { error } = await supabase
        .from('user_history')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('清空历史记录失败:', error)
        toast.error('清空失败，请重试')
        return
      }

      toast.success('历史记录已清空')
      setHistory([])
      setShowClearModal(false)
    } catch (error) {
      console.error('清空历史记录失败:', error)
      toast.error('清空失败，请重试')
    } finally {
      setClearing(false)
    }
  }

  const removeHistoryItem = async (historyId: string, posName: string) => {
    try {
      const { error } = await supabase
        .from('user_history')
        .delete()
        .eq('id', historyId)

      if (error) {
        console.error('删除历史记录失败:', error)
        toast.error('删除失败，请重试')
        return
      }

      toast.success(`已删除 "${posName}" 的访问记录`)
      loadHistory() // 重新加载列表
    } catch (error) {
      console.error('删除历史记录失败:', error)
      toast.error('删除失败，请重试')
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

  const formatVisitTime = (visitedAt: string) => {
    const date = new Date(visitedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays}天前`
    } else if (diffHours > 0) {
      return `${diffHours}小时前`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分钟前`
    } else {
      return '刚刚'
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
              <h1 className="text-xl font-semibold text-gray-900">浏览历史</h1>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setShowClearModal(true)}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>清空历史</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有浏览历史</h3>
              <p className="text-gray-600 mb-6">访问POS机详情页后会自动记录浏览历史</p>
              <button
                onClick={() => navigate('/map')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                去发现POS机
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((historyItem) => {
              const pos = historyItem.pos_machines
              return (
                <div key={historyItem.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Status */}
                        <div className="flex items-center space-x-2 mb-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(pos.status || 'active')}`}></div>
                          <span className="text-sm text-gray-600">{getStatusText(pos.status || 'active')}</span>
                        </div>

                        {/* POS Info */}
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {pos.merchant_name}
                          </h3>
                          <p className="text-gray-600 text-sm mb-1">
                            <MapPin className="h-4 w-4 inline mr-1" />
                            {pos.address}
                          </p>
                          {pos.basic_info?.model && (
                            <p className="text-gray-600 text-sm">
                              型号: {pos.basic_info.model}
                            </p>
                          )}
                        </div>

                        {/* Basic Info and Visit Time */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {pos.basic_info?.acquiring_institution && (
                              <span className="text-sm text-gray-600">
                                收单机构：{pos.basic_info.acquiring_institution}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatVisitTime(historyItem.visited_at)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => removeHistoryItem(historyItem.id, pos.merchant_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/pos/${pos.id}`)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Clear All History Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认清空历史</h3>
            <p className="text-gray-600 mb-6">
              确定要清空所有浏览历史吗？此操作无法撤销。
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={clearing}
              >
                取消
              </button>
              <button
                onClick={clearAllHistory}
                disabled={clearing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {clearing ? '清空中...' : '确认清空'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History