import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Edit, Heart, ExternalLink, MessageCircle, CreditCard, Smartphone, Settings, FileText, Trash2, Shield, Clock, Building, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { locationUtils } from '@/lib/amap'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedCard from '@/components/ui/AnimatedCard'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import AnimatedModal from '@/components/ui/AnimatedModal'
import Input from '@/components/ui/Input'
import AnimatedInput from '@/components/ui/AnimatedInput'
import ContactlessDisplay from '@/components/ui/ContactlessDisplay'
import CardNetworkIcon from '@/components/ui/CardNetworkIcon'
import PaymentFeaturesDisplay from '@/components/PaymentFeaturesDisplay'
import CurrencyConverter from '@/components/CurrencyConverter'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import { getVerificationModeLabel, getResultLabel, getPaymentMethodLabel } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { POSMachine } from '@/lib/supabase'
import { FeesConfiguration, feeUtils } from '@/types/fees'
import { checkAndUpdatePOSStatus, updatePOSStatus, calculatePOSSuccessRate, POSStatus, refreshMapData } from '@/utils/posStatusUtils'
import { exportToJSON, exportToHTML, exportToPDF, getStyleDisplayName, getFormatDisplayName, type CardStyle, type ExportFormat } from '@/utils/exportUtils'
import { useIssueReportStore } from '@/stores/useIssueReportStore'
import { getErrorDetails, notify } from '@/lib/notify'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  user_id: string
  users?: {
    display_name: string
    avatar_url?: string
  }
}

interface ExternalLinkType {
  id: string
  title: string
  url: string
  description?: string
  created_at: string
}

interface Attempt {
  id: string
  created_at: string
  result: 'success' | 'failure' | 'unknown'
  card_name?: string
  payment_method?: string
  notes?: string
  created_by?: string
}

const POSDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posMachines, deletePOSMachine } = useMapStore()
  const permissions = usePermissions()
  const { reports, addReport, resolveReport } = useIssueReportStore()
  
  const [pos, setPOS] = useState<POSMachine | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [externalLinks, setExternalLinks] = useState<ExternalLinkType[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoritesUnavailable, setFavoritesUnavailable] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAttemptModal, setShowAttemptModal] = useState(false)
  const [newAttempt, setNewAttempt] = useState({ result: 'success' as 'success' | 'failure' | 'unknown', card_name: '', payment_method: '', notes: '' })
  const [submittingAttempt, setSubmittingAttempt] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<POSStatus>('active')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [successRate, setSuccessRate] = useState<number | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedCardStyle, setSelectedCardStyle] = useState<CardStyle>('minimal')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [exporting, setExporting] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportForm, setReportForm] = useState({
    issueType: '',
    description: '',
    contact: '',
  })

  useEffect(() => {
    if (id) {
      loadPOSDetail()
      loadReviews()
      loadExternalLinks()
      loadAttempts()
      loadSuccessRate()
      if (user) {
        checkFavoriteStatus()
        recordVisitHistory()
      }
    }
  }, [id, user])

  const loadPOSDetail = async () => {
    try {
      // 从useMapStore中查找POS机数据
      const foundPOS = posMachines.find(pos => pos.id === id)
      
      if (foundPOS) {
        setPOS(foundPOS as POSMachine)
      } else {
        // 如果没找到，从数据库查询
        const { data: posFromDb, error } = await supabase
          .from('pos_machines')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error || !posFromDb) {
          console.error('查询POS机失败:', error)
          notify.critical('未找到对应的POS机', {
            title: '加载 POS 详情失败',
            details: getErrorDetails(error),
          })
          navigate(-1)
          return
        }
        
        setPOS(posFromDb as POSMachine)
      }
    } catch (error) {
      console.error('加载POS机详情失败:', error)
      notify.critical('加载失败，请重试', {
        title: '加载 POS 详情失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReport = () => {
    if (!pos) return
    if (!reportForm.issueType.trim() || !reportForm.description.trim()) {
      notify.error('请补充申报类型与问题描述')
      return
    }
    addReport({
      itemType: 'pos',
      itemId: pos.id,
      itemLabel: pos.merchant_name,
      issueType: reportForm.issueType.trim(),
      description: reportForm.description.trim(),
      contact: reportForm.contact.trim() || undefined,
      reporter: {
        id: user?.id,
        name: user?.user_metadata?.display_name || user?.email || '匿名用户',
      },
    })
    setReportForm({ issueType: '', description: '', contact: '' })
    setShowReportModal(false)
    notify.success('申报已提交')
  }

  const loadReviews = async () => {
    if (!id) return
    
    try {
      // 从Supabase数据库查询真实评论数据
      const { data: reviewsData, error } = await supabase
        .from('comments')
        .select(`
          id,
          rating,
          content,
          created_at,
          user_id
        `)
        .eq('pos_id', id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('加载评价失败:', error)
        return
      }
      
      // 转换数据格式
      const formattedReviews: Review[] = (reviewsData || []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.content,
        created_at: review.created_at,
        user_id: review.user_id,
        users: {
          display_name: '匿名用户',
          avatar_url: undefined
        }
      }))
      
      setReviews(formattedReviews)
    } catch (error) {
      console.error('加载评价失败:', error)
    }
  }

  const loadExternalLinks = async () => {
    try {
      // 从POS机数据中获取自定义链接
      if (pos?.custom_links && pos.custom_links.length > 0) {
        const links: ExternalLinkType[] = pos.custom_links.map((link, index) => ({
          id: `custom-${index}`,
          title: link.title,
          url: link.url,
          description: link.platform ? `${link.platform} 链接` : '',
          created_at: new Date().toISOString()
        }))
        setExternalLinks(links)
      } else {
        // 从数据库查询外部链接
        const { data: externalLinksData, error: linksError } = await supabase
          .from('external_links')
          .select('*')
          .eq('pos_machine_id', id)
          .order('created_at', { ascending: false })
        
        if (linksError) {
          console.error('加载外部链接失败:', linksError)
          setExternalLinks([])
        } else {
          const links: ExternalLinkType[] = (externalLinksData || []).map(link => ({
            id: link.id,
            title: link.title,
            url: link.url,
            description: link.description || '',
            created_at: link.created_at
          }))
          setExternalLinks(links)
        }
      }
    } catch (error) {
      console.error('加载外部链接失败:', error)
    }
  }

  const loadAttempts = async () => {
    if (!id) return
    
    try {
      const { data: attemptsData, error } = await supabase
        .from('pos_attempts')
        .select('*')
        .eq('pos_id', id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('加载尝试记录失败:', error)
        return
      }
      
      setAttempts(attemptsData || [])
    } catch (error) {
      console.error('加载尝试记录失败:', error)
    }
  }

  const checkFavoriteStatus = async () => {
    if (!user || !id || favoritesUnavailable) return
    
    try {
      // 从Supabase数据库查询用户收藏状态
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('pos_machine_id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST205' || error.code === '406') {
          console.warn('收藏功能未启用或表不存在，已忽略:', error.message)
          setFavoritesUnavailable(true)
          return
        }
        if (error.code !== 'PGRST116') {
          // PGRST116 表示没有找到记录，这是正常的
          console.error('查询收藏状态失败:', error)
          return
        }
      }
      
      setIsFavorite(!!data)
    } catch (error) {
      console.error('查询收藏状态失败:', error)
    }
  }

  const recordVisitHistory = async () => {
    if (!user || !id) return
    
    try {
      // 调用upsert函数记录访问历史
      const { error } = await supabase
        .rpc('upsert_user_history', {
          p_user_id: user.id,
          p_pos_machine_id: id
        })
      
      if (error) {
        console.error('记录访问历史失败:', error)
      }
    } catch (error) {
      console.error('记录访问历史失败:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!id || favoritesUnavailable) {
      notify.error('收藏功能当前不可用')
      return
    }

    try {
      if (isFavorite) {
        // 取消收藏 - 从数据库删除记录
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('pos_machine_id', id)
        
        if (error) {
          if (error.code === 'PGRST205' || error.code === '406') {
            setFavoritesUnavailable(true)
            notify.error('收藏功能当前不可用')
            return
          }
          console.error('取消收藏失败:', error)
          notify.error('取消收藏失败，请重试')
          return
        }
        
        setIsFavorite(false)
        notify.success('已取消收藏')
      } else {
        // 添加收藏 - 向数据库插入记录
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            pos_machine_id: id
          })
        
        if (error) {
          if (error.code === 'PGRST205' || error.code === '406') {
            setFavoritesUnavailable(true)
            notify.error('收藏功能当前不可用')
            return
          }
          console.error('添加收藏失败:', error)
          notify.error('添加收藏失败，请重试')
          return
        }
        
        setIsFavorite(true)
        notify.success('已添加到收藏')
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      notify.error('操作失败，请重试')
    }
  }

  const submitReview = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!id) return

    if (!newReview.comment.trim()) {
      notify.error('请填写评价内容')
      return
    }

    setSubmittingReview(true)
    try {
      // 保存评论到Supabase数据库
      const { data, error } = await supabase
        .from('comments')
        .insert({
          pos_id: id,
          user_id: user.id,
          rating: newReview.rating,
          content: newReview.comment.trim()
        })
        .select(`
          id,
          rating,
          content,
          created_at,
          user_id
        `)
        .single()
      
      if (error) {
        console.error('提交评价失败:', error)
        notify.error('提交失败，请重试')
        return
      }
      
      // 格式化新评论数据并添加到本地列表
      const newReviewData: Review = {
        id: data.id,
        rating: data.rating,
        comment: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        users: {
          display_name: String(user.user_metadata?.full_name || user.email || '匿名用户'),
          avatar_url: user.user_metadata?.avatar_url
        }
      }
      
      setReviews(prev => [newReviewData, ...prev])
      
      notify.success('评论提交成功')
      setShowReviewModal(false)
      setNewReview({ rating: 5, comment: '' })
    } catch (error) {
      console.error('提交评价失败:', error)
      notify.error('提交失败，请重试')
    } finally {
      setSubmittingReview(false)
    }
  }

  const submitAttempt = async () => {
    // 早期验证，避免不必要的状态设置
    if (!user) {
      console.error('用户未登录')
      notify.error('请先登录')
      navigate('/login')
      return
    }

    if (!id) {
      console.error('POS机ID不存在')
      notify.error('POS机信息错误')
      return
    }

    // 验证必填字段
    if (!newAttempt.result) {
      notify.error('请选择尝试结果')
      return
    }

    setSubmittingAttempt(true)
    try {
      console.log('开始提交尝试记录:', {
        pos_id: id,
        created_by: user.id,
        result: newAttempt.result,
        card_name: newAttempt.card_name.trim() || null,
        payment_method: newAttempt.payment_method.trim() || null,
        notes: newAttempt.notes.trim() || null
      })

      // 检查用户认证状态
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('用户会话无效:', sessionError)
        notify.critical('登录已过期，请重新登录', {
          title: '需要重新登录',
          details: getErrorDetails(sessionError),
        })
        navigate('/login')
        return
      }

      // 获取下一个 attempt_number
      const { data: latestAttempt, error: latestAttemptError } = await supabase
        .from('pos_attempts')
        .select('attempt_number')
        .eq('pos_id', id)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestAttemptError && latestAttemptError.code !== 'PGRST116') {
        console.error('获取最新尝试编号失败:', latestAttemptError)
      }
      const nextAttemptNumber = latestAttempt?.attempt_number ? latestAttempt.attempt_number + 1 : 1

      // 保存尝试记录到Supabase数据库
      const { data, error } = await supabase
        .from('pos_attempts')
        .insert({
          pos_id: id,
          user_id: user.id,
          attempt_number: nextAttemptNumber,
          result: newAttempt.result,
          card_name: newAttempt.card_name.trim() || null,
          payment_method: newAttempt.payment_method.trim() || null,
          notes: newAttempt.notes.trim() || null
        })
        .select()
        .single()
      
      if (error) {
        console.error('提交尝试记录失败:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // 根据错误类型提供更具体的错误信息
        if (error.code === '42501') {
          notify.error('权限不足，请检查登录状态')
        } else if (error.code === '23505') {
          notify.error('记录已存在')
        } else if (error.message?.includes('RLS')) {
          notify.error('数据访问权限错误，请重新登录')
        } else {
          notify.error(`提交失败: ${error.message || '未知错误'}`)
        }
        return
      }
      
      // 添加到本地列表
      const newAttemptData: Attempt = {
        id: data.id,
        created_at: data.created_at,
        result: data.result,
        card_name: data.card_name,
        payment_method: data.payment_method,
        notes: data.notes,
        created_by: data.created_by
      }
      
      setAttempts(prev => [newAttemptData, ...prev])
      
      notify.success('尝试记录提交成功')
      
      // 确保状态重置在同一个事件循环中完成
      setNewAttempt({ result: 'success', card_name: '', payment_method: '', notes: '' })
      
      // 使用setTimeout确保模态框能正确关闭
      setTimeout(() => {
        setShowAttemptModal(false)
      }, 0)
      
      // 自动检查并更新POS状态
      try {
        const updated = await checkAndUpdatePOSStatus(id!)
        if (updated && pos) {
          // 重新加载POS详情以获取最新状态
          loadPOSDetail()
          // 计算并显示成功率
          const rate = await calculatePOSSuccessRate(id!)
          setSuccessRate(rate.successRate)
          // 刷新地图和列表数据
          await refreshMapData()
        }
      } catch (error) {
        console.error('自动状态检查失败:', error)
      }
    } catch (error) {
      console.error('提交尝试记录失败:', error)
      notify.error('提交失败，请重试')
    } finally {
      setSubmittingAttempt(false)
    }
  }

  const deleteAttempt = async (attemptId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      // 从Supabase数据库删除尝试记录
      const { error } = await supabase
        .from('pos_attempts')
        .delete()
        .eq('id', attemptId)
        .eq('user_id', user.id) // 确保只能删除自己的记录
      
      if (error) {
        console.error('删除尝试记录失败:', error)
        notify.error('删除失败，请重试')
        return
      }
      
      // 从本地列表中移除
      setAttempts(prev => prev.filter(attempt => attempt.id !== attemptId))
      
      notify.success('尝试记录删除成功')
    } catch (error) {
      console.error('删除尝试记录失败:', error)
      notify.error('删除失败，请重试')
    }
  }

  const handleDeletePOS = async () => {
    if (!id || !pos) return

    setDeleting(true)
    try {
      await deletePOSMachine(id)
      notify.success('POS机删除成功')
      navigate('/')
    } catch (error) {
      console.error('删除POS机失败:', error)
      notify.error('删除失败，请重试')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!id || !pos) return

    setUpdatingStatus(true)
    try {
      const success = await updatePOSStatus(id, newStatus)
      if (success) {
        notify.success('POS状态更新成功')
        // 重新加载POS详情以获取最新状态
        loadPOSDetail()
        // 刷新地图和列表数据
        await refreshMapData()
        setShowStatusModal(false)
      } else {
        notify.error('状态更新失败，请重试')
      }
    } catch (error) {
      console.error('更新POS状态失败:', error)
      notify.error('状态更新失败，请重试')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const loadSuccessRate = async () => {
    if (!id) return
    try {
      const rate = await calculatePOSSuccessRate(id)
      setSuccessRate(rate.successRate)
    } catch (error) {
      console.error('计算成功率失败:', error)
    }
  }

  const handleExport = async () => {
    if (!pos) return
    
    setExporting(true)
    try {
      // 准备导出数据，包含完整的POS机信息
      const exportData = {
        ...pos,
        reviews,
        externalLinks,
        attempts,
        successRate,
        exportedAt: new Date().toISOString(),
        exportedBy: user?.id
      }
      
      if (selectedFormat === 'json') {
        await exportToJSON(exportData, `${pos.merchant_name}_POS记录`)
        notify.success('JSON文件导出成功')
      } else if (selectedFormat === 'html') {
        await exportToHTML(exportData, `${pos.merchant_name}_卡片`, selectedCardStyle)
        notify.success('HTML卡片导出成功')
      } else if (selectedFormat === 'pdf') {
        await exportToPDF(exportData, `${pos.merchant_name}_卡片`, selectedCardStyle)
        notify.success('PDF卡片导出成功')
      }
      
      setShowExportModal(false)
    } catch (error) {
      console.error('导出失败:', error)
      notify.error('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-5 h-5 ${
            i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={interactive && onRatingChange ? () => onRatingChange(i) : undefined}
        />
      )
    }
    return stars
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loading size="lg" text="正在加载详情..." />
      </div>
    )
  }

  if (!pos) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-sm border p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">POS机不存在</h3>
          <AnimatedButton onClick={() => navigate(-1)}>返回</AnimatedButton>
        </div>
      </div>
    )
  }

  const posReports = reports.filter((report) => report.itemType === 'pos' && report.itemId === pos.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div
        className="bg-white shadow-sm border-b pt-safe-top"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{pos.merchant_name}</h1>
                {pos.address && (
                  <p className="text-sm text-gray-500 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {pos.address}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFavorite}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="收藏"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="申报问题"
              >
                <FileText className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="导出记录"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              {permissions.canEditItem(pos.created_by) && (
                <button
                  onClick={() => navigate(`/app/edit-pos/${pos.id}`)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="编辑POS机"
                >
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {permissions.canDeleteItem(pos.created_by) && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除POS机"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* POS机基本信息卡片 - 重新设计 */}
        <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                  {pos.merchant_name}
                </CardTitle>
                <CardDescription className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  {pos.address}
                </CardDescription>
              </div>
              {pos.review_count && pos.review_count > 0 && (
                <div className="text-right">
                  <span className="text-sm text-gray-600">
                    {pos.review_count}条评价
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">POS机型号</label>
                <p className="text-sm text-gray-900">
                  {pos.basic_info?.model || <span className="text-gray-500">待勘察</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">收单机构</label>
                <p className="text-sm text-gray-900">
                  {pos.basic_info?.acquiring_institution || <span className="text-gray-500">待勘察</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">收银位置</label>
                <p className="text-sm text-gray-900">
                  {pos.basic_info?.checkout_location || <span className="text-gray-500">待勘察</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">设备状态</label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      pos.status === 'active' ? 'bg-green-500' :
                      pos.status === 'inactive' ? 'bg-yellow-500' :
                      pos.status === 'maintenance' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      pos.status === 'active' ? 'text-green-700' :
                      pos.status === 'inactive' ? 'text-yellow-700' :
                      pos.status === 'maintenance' ? 'text-orange-700' :
                      'text-red-700'
                    }`}>
                      {pos.status === 'active' ? '正常运行' :
                       pos.status === 'inactive' ? '暂时不可用' :
                       pos.status === 'maintenance' ? '维修中' :
                       '已停用'}
                    </span>
                  </div>
                  {permissions.canEditItem(pos.created_by) && (
                    <AnimatedButton
                      onClick={() => {
                        setNewStatus(pos.status || 'active')
                        setShowStatusModal(true)
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-6"
                    >
                      修改
                    </AnimatedButton>
                  )}
                </div>
                {successRate !== null && (
                  <div className="text-xs text-gray-500 mt-1">
                    成功率: {(successRate * 100).toFixed(1)}%
                    {successRate < 0.5 && (
                      <span className="text-orange-600 ml-1">(低于50%)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {(pos.latitude && pos.longitude) || pos.created_at ? (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pos.latitude && pos.longitude && (
                    <div className="text-sm text-gray-500">
                      坐标: {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
                    </div>
                  )}
                  {pos.created_at && (
                    <div className="text-sm text-gray-500">
                      添加时间: {new Date(pos.created_at).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </AnimatedCard>

        {permissions.isAdmin && (
          <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">申报记录</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                管理员可在此处理 POS 机相关申报
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {posReports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{report.issueType}</h4>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      </div>
                      <span className={`text-xs font-semibold ${report.status === 'open' ? 'text-orange-500' : 'text-green-600'}`}>
                        {report.status === 'open' ? '待处理' : '已处理'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 mt-3">
                      <span>{report.reporter?.name || '匿名用户'}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                    {report.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => resolveReport(report.id)}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-soft-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-900 transition-colors"
                      >
                        标记已处理
                      </button>
                    )}
                  </div>
                ))}
              {posReports.length === 0 && (
                <div className="text-sm text-gray-400">暂无申报记录</div>
              )}
            </CardContent>
          </AnimatedCard>
        )}

        {/* 支付信息 */}
        {pos.basic_info && Object.keys(pos.basic_info).length > 0 && (
          <>
            {/* 卡组织支持 - 重新设计为更显著的展示 */}
            <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <CreditCard className="w-6 h-6 mr-3 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">支持的卡组织</h3>
                </div>
                {pos.basic_info.supported_card_networks && pos.basic_info.supported_card_networks.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {pos.basic_info.supported_card_networks.map((network) => (
                      <div
                        key={network}
                        className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="w-16 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                          <CardNetworkIcon network={network} className="w-12 h-8" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 text-center leading-tight">
                          {getCardNetworkLabel(network)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">暂无卡组织信息</p>
                      <p className="text-gray-400 text-xs mt-1">待勘察</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>

            {/* Contactless 支持和验证模式 - 并排显示 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contactless 支持 */}
              <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Smartphone className="w-6 h-6 mr-3 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Contactless 支持</h3>
                  </div>
                  <ContactlessDisplay
                    supports_contactless={pos.basic_info.supports_contactless}
                    supports_apple_pay={pos.basic_info.supports_apple_pay}
                    supports_google_pay={pos.basic_info.supports_google_pay}
                    supports_hce_simulation={pos.basic_info.supports_hce_simulation}
                  />
                </CardContent>
              </AnimatedCard>

              {/* 验证模式 */}
              <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Shield className="w-6 h-6 mr-3 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">验证模式详情</h3>
                  </div>
                  
                  {/* 验证模式概览 */}
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">小额免密</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pos.verification_modes?.small_amount_no_pin_unsupported
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : pos.verification_modes?.small_amount_no_pin_uncertain
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : pos.verification_modes?.small_amount_no_pin && pos.verification_modes.small_amount_no_pin.length > 0
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {pos.verification_modes?.small_amount_no_pin_unsupported 
                          ? '✗ 不支持' 
                          : pos.verification_modes?.small_amount_no_pin_uncertain
                          ? '? 未确定'
                          : pos.verification_modes?.small_amount_no_pin && pos.verification_modes.small_amount_no_pin.length > 0
                          ? '✓ 支持'
                          : '? 未确定'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">PIN验证</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pos.verification_modes?.requires_password_unsupported
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : pos.verification_modes?.requires_password_uncertain
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : pos.verification_modes?.requires_password && pos.verification_modes.requires_password.length > 0
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {pos.verification_modes?.requires_password_unsupported 
                          ? '✗ 不支持' 
                          : pos.verification_modes?.requires_password_uncertain
                          ? '? 未确定'
                          : pos.verification_modes?.requires_password && pos.verification_modes.requires_password.length > 0
                          ? '✓ 支持'
                          : '? 未确定'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">签名验证</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pos.verification_modes?.requires_signature_unsupported
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : pos.verification_modes?.requires_signature_uncertain
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : pos.verification_modes?.requires_signature && pos.verification_modes.requires_signature.length > 0
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {pos.verification_modes?.requires_signature_unsupported 
                          ? '✗ 不支持' 
                          : pos.verification_modes?.requires_signature_uncertain
                          ? '? 未确定'
                          : pos.verification_modes?.requires_signature && pos.verification_modes.requires_signature.length > 0
                          ? '✓ 支持'
                          : '? 未确定'}
                      </span>
                    </div>
                  </div>

                  {/* 详细信息 */}
                  {((pos.verification_modes?.small_amount_no_pin && pos.verification_modes.small_amount_no_pin.length > 0) || 
                    (pos.verification_modes?.requires_password && pos.verification_modes.requires_password.length > 0) || 
                    (pos.verification_modes?.requires_signature && pos.verification_modes.requires_signature.length > 0) || 
                    pos.basic_info?.min_amount_no_pin) && (
                    <div className="space-y-3">
                      {/* 小额免密详情 */}
                      {(pos.verification_modes?.small_amount_no_pin && pos.verification_modes.small_amount_no_pin.length > 0) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            小额免密详情
                          </h4>
                          <div className="text-sm text-gray-700">
                            支持小额免密支付
                            {pos.basic_info?.min_amount_no_pin && (
                              <span className="ml-2 text-blue-700 font-medium">
                                (最低免密金额: ¥{pos.basic_info.min_amount_no_pin})
                              </span>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pos.verification_modes.small_amount_no_pin.map((network, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {network}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PIN验证详情 */}
                      {(pos.verification_modes?.requires_password && pos.verification_modes.requires_password.length > 0) && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                            PIN验证详情
                          </h4>
                          <div className="text-sm text-gray-700">
                            支持PIN密码验证
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pos.verification_modes.requires_password.map((network, index) => (
                                <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                  {network}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 签名验证详情 */}
                      {(pos.verification_modes?.requires_signature && pos.verification_modes.requires_signature.length > 0) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            签名验证详情
                          </h4>
                          <div className="text-sm text-gray-700">
                            支持签名验证
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pos.verification_modes.requires_signature.map((network, index) => (
                                <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                  {network}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 不支持状态显示 */}
                      {pos.verification_modes?.small_amount_no_pin_unsupported && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            小额免密
                          </h4>
                          <div className="text-sm text-gray-700">不支持小额免密支付</div>
                        </div>
                      )}

                      {pos.verification_modes?.requires_password_unsupported && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            PIN验证
                          </h4>
                          <div className="text-sm text-gray-700">不支持PIN密码验证</div>
                        </div>
                      )}

                      {pos.verification_modes?.requires_signature_unsupported && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            签名验证
                          </h4>
                          <div className="text-sm text-gray-700">不支持签名验证</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!((pos.verification_modes?.small_amount_no_pin && pos.verification_modes.small_amount_no_pin.length > 0) || 
                     (pos.verification_modes?.requires_password && pos.verification_modes.requires_password.length > 0) || 
                     (pos.verification_modes?.requires_signature && pos.verification_modes.requires_signature.length > 0) || 
                     pos.verification_modes?.small_amount_no_pin_unsupported || 
                     pos.verification_modes?.requires_password_unsupported || 
                     pos.verification_modes?.requires_signature_unsupported || 
                     pos.verification_modes?.small_amount_no_pin_uncertain || 
                     pos.verification_modes?.requires_password_uncertain || 
                     pos.verification_modes?.requires_signature_uncertain) && (
                    <p className="text-gray-500 text-sm">待勘察</p>
                  )}
                </CardContent>
              </AnimatedCard>
            </div>

            {/* 商家信息和设备支持 - 并排显示 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 商家信息 */}
              <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Building className="w-6 h-6 mr-3 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">商家信息</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        商户交易名称
                      </label>
                      <p className="text-base text-gray-900 font-medium">
                        {pos.merchant_info?.transaction_name || <span className="text-gray-500">待勘察</span>}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        商户交易类型
                      </label>
                      <p className="text-base text-gray-900 font-medium">
                        {pos.merchant_info?.transaction_type || <span className="text-gray-500">待勘察</span>}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* 设备支持 */}
              <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Settings className="w-6 h-6 mr-3 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">设备支持</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          POS机型号
                        </label>
                        <p className="text-base text-gray-900 font-medium">
                          {pos.basic_info.model || <span className="text-gray-500">待勘察</span>}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          收单机构
                        </label>
                        <p className="text-base text-gray-900 font-medium">
                          {pos.basic_info.acquiring_institution || <span className="text-gray-500">待勘察</span>}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          收银位置
                        </label>
                        <p className="text-base text-gray-900 font-medium">
                          {pos.basic_info.checkout_location || <span className="text-gray-500">待勘察</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* 收单模式支持 - 独立板块 */}
            <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Settings className="w-6 h-6 mr-3 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">收单模式支持</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">DCC</div>
                      <div className="text-sm text-gray-600">Dynamic Currency Conversion</div>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        pos.basic_info.supports_dcc ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm font-medium ${
                        pos.basic_info.supports_dcc ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {pos.basic_info.supports_dcc ? '支持' : '不支持'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">EDC</div>
                      <div className="text-sm text-gray-600">Electronic Data Capture</div>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        pos.basic_info.supports_edc ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm font-medium ${
                        pos.basic_info.supports_edc ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {pos.basic_info.supports_edc ? '支持' : '不支持'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>



            {/* 备注信息 - 如果有内容则显示 */}
            {pos.remarks && (
              <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="w-6 h-6 mr-3 text-slate-600" />
                    <h3 className="text-lg font-semibold text-gray-900">备注信息</h3>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-100">
                    <p className="text-base text-gray-900 leading-relaxed">
                      {pos.remarks}
                    </p>
                  </div>
                </CardContent>
              </AnimatedCard>
            )}

            {/* 付款手续费 */}
            {pos.fees && (
              <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">付款手续费</h3>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(pos.fees).map(([network, fee]) => {
                      if (!fee.enabled) return null
                      
                      const displayInfo = feeUtils.getFeeDisplayInfo(fee)
                      
                      return (
                        <div key={network} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {network === 'unionpay' ? '银联' : 
                                 network === 'visa' ? 'VISA' :
                                 network === 'mastercard' ? 'MC' :
                                 network === 'amex_cn' ? 'AMEX CN' :
                                 network === 'amex' ? 'AMEX GL' :
                                 network === 'mastercard_cn' ? 'MC CN' :
                                 network === 'jcb' ? 'JCB' :
                                 network === 'discover' ? 'DISC' :
                                 network === 'diners' ? 'DINERS' : network.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {getCardNetworkLabel(network)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {fee.type === 'percentage' ? '百分比费率' : '固定金额'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {displayInfo.formattedValue}
                            </div>
                            {fee.type === 'percentage' && (
                              <div className="text-xs text-gray-500">
                                示例: ¥100 → ¥{feeUtils.calculateFeeAmount(fee, 100).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {Object.values(pos.fees).filter(fee => fee.enabled).length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-gray-500">暂无手续费配置</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </AnimatedCard>
            )}
          </>
        )}

        {/* 自定义字段 */}
        {pos.extended_fields && Object.keys(pos.extended_fields).length > 0 && (
          <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Settings className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-lg font-semibold">其他信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(pos.extended_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200/50">
                    <span className="text-gray-700 font-medium">{key}:</span>
                    <span className="font-semibold text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        )}

        {/* 尝试信息 */}
        <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                尝试信息
              </CardTitle>
              {permissions.canAdd && (
                <AnimatedButton
                  onClick={() => setShowAttemptModal(true)}
                  size="sm"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  记录尝试
                </AnimatedButton>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {attempts.length > 0 ? (
              <div className="space-y-4">
                {/* 成功率统计 */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {attempts.length}
                      </div>
                      <div className="text-sm text-gray-600">总尝试</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {attempts.filter(a => a.result === 'success').length}
                      </div>
                      <div className="text-sm text-gray-600">成功</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {attempts.filter(a => a.result === 'failure').length}
                      </div>
                      <div className="text-sm text-gray-600">失败</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {attempts.length > 0 ? Math.round((attempts.filter(a => a.result === 'success').length / attempts.length) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">成功率</div>
                    </div>
                  </div>
                </div>
                
                {/* 尝试记录列表 */}
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">
                        {new Date(attempt.created_at).toLocaleDateString('zh-CN')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          attempt.result === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : attempt.result === 'failure'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getResultLabel(attempt.result)}
                        </span>
                        {user && attempt.created_by === user.id && (
                          <AnimatedButton
                            onClick={() => deleteAttempt(attempt.id)}
                            variant="ghost"
                            size="sm"
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </AnimatedButton>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">卡片名称：</span>
                        <span className="text-gray-900">{attempt.card_name || '未记录'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">支付方式：</span>
                        <span className="text-gray-900">{getPaymentMethodLabel(attempt.payment_method) || '未记录'}</span>
                      </div>
                    </div>
                    
                    {attempt.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-gray-600 text-sm">备注：</span>
                        <p className="text-gray-900 text-sm mt-1">{attempt.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">暂无尝试记录</p>
            )}
          </CardContent>
        </AnimatedCard>

        {/* 外部链接 */}
        {externalLinks.length > 0 && (
          <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="w-5 h-5 mr-2" />
                外部链接
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {externalLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      {link.title}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        )}

        {/* 评价列表 */}
        <AnimatedCard className="bg-white rounded-lg shadow-sm border" variant="elevated" hoverable>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                用户评价
              </CardTitle>
              {permissions.canAdd && (
                <AnimatedButton
                  onClick={() => setShowReviewModal(true)}
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  写评价
                </AnimatedButton>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">暂无评价</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-gray-900">
                          {review.users?.display_name || '匿名用户'}
                        </span>
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* 评论模态框 */}
      <AnimatedModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="添加评价"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 border rounded-lg">
            <p className="text-gray-700">
              为 "{pos?.merchant_name}" 添加您的使用体验
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评分
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= newReview.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评价内容
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="分享您的使用体验..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4 border-t">
            <AnimatedButton
              onClick={() => setShowReviewModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </AnimatedButton>
            <AnimatedButton
              onClick={submitReview}
              loading={submittingReview}
              disabled={!newReview.rating || !newReview.comment.trim()}
              className="flex-1"
            >
              提交评价
            </AnimatedButton>
          </div>
        </div>
      </AnimatedModal>

      {/* 尝试记录模态框 */}
      <AnimatedModal
        isOpen={showAttemptModal}
        onClose={() => setShowAttemptModal(false)}
        title="记录尝试信息"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                尝试结果 *
              </label>
              <select
                value={newAttempt.result}
                onChange={(e) => setNewAttempt({ ...newAttempt, result: e.target.value as 'success' | 'failure' | 'unknown' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation webkit-tap-highlight-none webkit-appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  fontSize: '16px'
                }}
              >
                <option value="success">成功</option>
                <option value="failure">失败</option>
                <option value="unknown">未知</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                卡片名称
              </label>
              <input
                type="text"
                value={newAttempt.card_name}
                onChange={(e) => setNewAttempt({ ...newAttempt, card_name: e.target.value })}
                placeholder="例如：招商银行信用卡"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation webkit-tap-highlight-none webkit-appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支付方式
              </label>
              <select
                value={newAttempt.payment_method}
                onChange={(e) => setNewAttempt({ ...newAttempt, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation webkit-tap-highlight-none webkit-appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  fontSize: '16px'
                }}
              >
                <option value="">请选择支付方式</option>
                <option value="Apple Pay">Apple Pay</option>
                <option value="Google Pay">Google Pay</option>
                <option value="Samsung Pay">Samsung Pay</option>
                <option value="非接触式">非接触式</option>
                <option value="插卡">插卡</option>
                <option value="刷卡">刷卡</option>
                <option value="其他">其他</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注
              </label>
              <textarea
                value={newAttempt.notes}
                onChange={(e) => setNewAttempt({ ...newAttempt, notes: e.target.value })}
                placeholder="记录详细的尝试过程或遇到的问题..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none touch-manipulation webkit-tap-highlight-none webkit-appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  fontSize: '16px',
                  WebkitOverflowScrolling: 'touch'
                }}
              />
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4 border-t">
            <AnimatedButton
              onClick={() => setShowAttemptModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </AnimatedButton>
            <AnimatedButton
              onClick={submitAttempt}
              loading={submittingAttempt}
              className="flex-1"
            >
              提交记录
            </AnimatedButton>
          </div>
        </div>
      </AnimatedModal>

      {/* 状态修改模态框 */}
      <AnimatedModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="修改POS状态"
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 border rounded-lg">
            <p className="text-gray-700">
              修改 "{pos?.merchant_name}" 的设备状态
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                设备状态
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as POSStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation webkit-tap-highlight-none webkit-appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  fontSize: '16px'
                }}
              >
                <option value="active">正常运行</option>
                <option value="inactive">暂时不可用</option>
                <option value="maintenance">维修中</option>
                <option value="disabled">已停用</option>
              </select>
            </div>
            
            {successRate !== null && successRate < 0.5 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-orange-700 font-medium">
                    注意：当前成功率为 {(successRate * 100).toFixed(1)}%，低于50%
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-3 pt-4 border-t">
            <AnimatedButton
              onClick={() => setShowStatusModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </AnimatedButton>
            <AnimatedButton
              onClick={handleStatusUpdate}
              loading={updatingStatus}
              className="flex-1"
            >
              确认修改
            </AnimatedButton>
          </div>
        </div>
      </AnimatedModal>

      {/* 导出模态框 */}
      <AnimatedModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出POS记录"
        size="md"
        footer={
          <div className="flex space-x-3">
            <AnimatedButton
              onClick={() => setShowExportModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </AnimatedButton>
            <AnimatedButton
              onClick={handleExport}
              loading={exporting}
              className="flex-1"
            >
              {exporting ? '导出中...' : '开始导出'}
            </AnimatedButton>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-gray-50">
            <p className="text-gray-700 text-sm">
              导出 "{pos?.merchant_name}" 的完整记录数据
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出格式
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="json">JSON文件（用于导入）</option>
                <option value="html">HTML卡片</option>
                <option value="pdf">PDF卡片</option>
              </select>
            </div>
            
            {(selectedFormat === 'html' || selectedFormat === 'pdf') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    卡片风格
                  </label>
                  <select
                    value={selectedCardStyle}
                    onChange={(e) => setSelectedCardStyle(e.target.value as CardStyle)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="minimal">简约风格</option>
                    <option value="detailed">详细风格</option>
                    <option value="business">商务风格</option>
                    <option value="modern">现代风格</option>
                  </select>
                </div>
                
                {/* 卡片预览 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预览效果
                  </label>
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                    <div className="transform scale-50 origin-top-left w-[200%] h-auto">
                      <div 
                        className="bg-white rounded-lg shadow-sm border overflow-hidden"
                        style={{
                          width: '400px',
                          fontSize: '12px'
                        }}
                      >
                        {/* 预览卡片头部 */}
                        <div 
                          className="text-white p-4 text-center"
                          style={{
                            background: selectedCardStyle === 'minimal' ? '#374151' :
                                      selectedCardStyle === 'business' ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' :
                                      selectedCardStyle === 'modern' ? 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)' :
                                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderBottom: selectedCardStyle === 'business' ? '3px solid #d97706' : 'none'
                          }}
                        >
                          <h3 className="font-bold text-sm">{pos?.merchant_name || '商户名称'}</h3>
                          <p className="text-xs opacity-90">📍 {pos?.address || '商户地址'}</p>
                        </div>
                        
                        {/* 预览卡片内容 */}
                        <div className="p-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-600 border-b pb-1">
                            🏪 基本信息
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div 
                              className="p-2 rounded border-l-2"
                              style={{
                                background: selectedCardStyle === 'minimal' ? 'white' :
                                          selectedCardStyle === 'business' ? '#f8fafc' :
                                          selectedCardStyle === 'modern' ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' :
                                          'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                borderLeftColor: selectedCardStyle === 'minimal' ? '#6b7280' :
                                               selectedCardStyle === 'business' ? '#d97706' :
                                               selectedCardStyle === 'modern' ? '#8b5cf6' :
                                               '#3b82f6',
                                border: selectedCardStyle === 'minimal' ? '1px solid #e5e7eb' : 'none'
                              }}
                            >
                              <div className="text-gray-500 text-xs">POS机型号</div>
                              <div className="font-medium">{pos?.basic_info?.model || '待勘察'}</div>
                            </div>
                            <div 
                              className="p-2 rounded border-l-2"
                              style={{
                                background: selectedCardStyle === 'minimal' ? 'white' :
                                          selectedCardStyle === 'business' ? '#f8fafc' :
                                          selectedCardStyle === 'modern' ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' :
                                          'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                borderLeftColor: selectedCardStyle === 'minimal' ? '#6b7280' :
                                               selectedCardStyle === 'business' ? '#d97706' :
                                               selectedCardStyle === 'modern' ? '#8b5cf6' :
                                               '#3b82f6',
                                border: selectedCardStyle === 'minimal' ? '1px solid #e5e7eb' : 'none'
                              }}
                            >
                              <div className="text-gray-500 text-xs">设备状态</div>
                              <div className="font-medium">
                                <span 
                                  className="px-2 py-1 rounded text-white text-xs"
                                  style={{
                                    backgroundColor: pos?.status === 'active' ? '#10b981' :
                                                   pos?.status === 'inactive' ? '#f59e0b' :
                                                   pos?.status === 'maintenance' ? '#f97316' : '#ef4444'
                                  }}
                                >
                                  {pos?.status === 'active' ? '正常运行' :
                                   pos?.status === 'inactive' ? '暂时不可用' :
                                   pos?.status === 'maintenance' ? '维修中' : '已停用'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 预览卡片底部 */}
                        <div className="bg-gray-50 p-2 text-center border-t">
                          <p className="text-xs text-gray-500">Payments Maps 导出</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <div className="text-sm text-blue-700">
                  {selectedFormat === 'json' ? (
                    <span>JSON格式包含完整的POS机数据，可用于后续导入到其他系统</span>
                  ) : (
                    <span>卡片格式适合分享和打印，包含POS机的关键信息和统计数据</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="POS机问题申报"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="px-6 py-2 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              className="px-6 py-2 rounded-xl font-semibold text-white bg-soft-black hover:bg-gray-900 transition-colors"
            >
              提交申报
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-3 text-sm text-yellow-800">
            请描述 POS 机的问题，管理员会尽快处理。
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">问题类型</label>
            <input
              value={reportForm.issueType}
              onChange={(event) => setReportForm((prev) => ({ ...prev, issueType: event.target.value }))}
              placeholder="例如 设备不可用 / 成功率异常 / 信息缺失"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">问题描述</label>
            <textarea
              value={reportForm.description}
              onChange={(event) => setReportForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="补充问题细节，便于管理员排查"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">联系方式（可选）</label>
            <input
              value={reportForm.contact}
              onChange={(event) => setReportForm((prev) => ({ ...prev, contact: event.target.value }))}
              placeholder="邮箱或手机号，方便回访"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
            />
          </div>
        </div>
      </AnimatedModal>

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg overflow-hidden">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-600 mb-6">
                确定要删除这个POS机吗？此操作无法撤销。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeletePOS}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POSDetail
