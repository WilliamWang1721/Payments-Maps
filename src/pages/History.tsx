import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/ui/Loading'

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: '正常运行',
          badge: 'bg-green-50 text-green-700 border-green-100',
          dot: 'bg-green-500'
        }
      case 'inactive':
        return {
          label: '暂时不可用',
          badge: 'bg-gray-50 text-gray-700 border-gray-100',
          dot: 'bg-gray-500'
        }
      case 'maintenance':
        return {
          label: '维修中',
          badge: 'bg-orange-50 text-orange-700 border-orange-100',
          dot: 'bg-orange-500'
        }
      case 'disabled':
        return {
          label: '已停用',
          badge: 'bg-red-50 text-red-700 border-red-100',
          dot: 'bg-red-500'
        }
      default:
        return {
          label: '未知状态',
          badge: 'bg-blue-50 text-blue-700 border-blue-100',
          dot: 'bg-blue-500'
        }
    }
  }

  const formatVisitTime = (visitedAt: string) => {
    const date = new Date(visitedAt)
    if (Number.isNaN(date.getTime())) return '未知时间'

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

  const formatAbsoluteTime = (visitedAt: string) => {
    const date = new Date(visitedAt)
    if (Number.isNaN(date.getTime())) return '未知时间'

    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-white rounded-2xl shadow-soft border border-white/60 px-6 py-5 flex items-center gap-3">
          <Loading text="正在加载浏览历史..." />
        </div>
      </div>
    )
  }

  const validHistory = history.filter((item) => item.pos_machines)
  const uniquePOSCount = new Set(history.map((item) => item.pos_id)).size
  const latestVisitedText = history[0]?.visited_at ? formatAbsoluteTime(history[0].visited_at) : '暂无记录'

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white rounded-[32px] shadow-soft border border-white/60 overflow-hidden animate-fade-in-up">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center shadow-soft">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">History</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-soft-black">浏览历史</h1>
              <p className="text-sm text-gray-500">按最新访问排序，帮助你快速回到刚刚查看的地点。</p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-accent-yellow/50 hover:text-accent-yellow hover:shadow-soft transition-all bg-white"
            >
              <Trash2 className="w-4 h-4" />
              清空历史
            </button>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-8 pt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-cream border border-white shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-accent-yellow">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">总浏览次数</p>
                <p className="text-xl font-bold text-soft-black">{history.length}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center shadow-soft">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">独立地点</p>
                <p className="text-xl font-bold text-soft-black">{uniquePOSCount}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-accent-yellow/10 via-accent-purple/10 to-accent-salmon/10 border border-white shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-accent-purple flex items-center justify-center shadow-soft">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">最近一次</p>
                <p className="text-sm font-semibold text-soft-black leading-tight">{latestVisitedText}</p>
              </div>
            </div>
          </div>

          {validHistory.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-blue-200 bg-cream px-8 py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center text-accent-yellow mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-soft-black">还没有浏览历史</h3>
                <p className="text-sm text-gray-500">访问 POS 机详情页后会自动记录浏览足迹。</p>
              </div>
              <button
                onClick={() => navigate('/app/map')}
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-soft-black text-white hover:bg-accent-yellow transition-all shadow-soft text-sm font-semibold"
              >
                去发现 POS 机
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {validHistory.map((historyItem, index) => {
                const pos = historyItem.pos_machines
                if (!pos) return null
                const statusMeta = getStatusStyle(pos.status || 'active')

                return (
                  <article
                    key={historyItem.id}
                    className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-soft transition-all p-5 sm:p-6 group animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" aria-hidden="true" />
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-cream text-accent-yellow flex items-center justify-center shadow-inner">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          {formatVisitTime(historyItem.visited_at)}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-soft-black leading-tight">
                              {pos.merchant_name}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.badge}`}>
                              <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                              {statusMeta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 sm:ml-auto">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">{formatAbsoluteTime(historyItem.visited_at)}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          {pos.address}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {pos.basic_info?.acquiring_institution && (
                            <span className="px-3 py-1 rounded-full bg-cream border border-white text-xs font-medium text-soft-black shadow-sm">
                              收单：{pos.basic_info.acquiring_institution}
                            </span>
                          )}
                          {pos.basic_info?.model && (
                            <span className="px-3 py-1 rounded-full bg-white border border-gray-100 text-xs text-gray-600 shadow-inner">
                              型号：{pos.basic_info.model}
                            </span>
                          )}
                          {pos.basic_info?.checkout_location && (
                            <span className="px-3 py-1 rounded-full bg-white border border-gray-100 text-xs text-gray-600">
                              {pos.basic_info.checkout_location}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <button
                          onClick={() => removeHistoryItem(historyItem.id, pos.merchant_name)}
                          className="h-11 w-11 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/app/pos/${pos.id}`)}
                          className="px-4 py-2.5 rounded-xl bg-soft-black text-white hover:bg-accent-yellow transition-all shadow-soft text-sm font-semibold"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-soft border border-white/60 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-soft-black">确认清空历史</h3>
                <p className="text-sm text-gray-500 mt-1">此操作无法撤销，将删除你的所有浏览足迹。</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={clearing}
              >
                保留记录
              </button>
              <button
                onClick={clearAllHistory}
                disabled={clearing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-soft disabled:opacity-60 text-sm font-semibold"
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
