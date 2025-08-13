import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Edit, Heart, ExternalLink, MessageCircle, CreditCard, Smartphone, Settings, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import { usePermissions } from '@/hooks/usePermissions'

interface POSMachine {
  id: string
  merchant_name: string
  address: string
  latitude: number
  longitude: number
  basic_info: {
    model?: string
    acquiring_institution?: string
    supports_foreign_cards?: boolean
    supports_apple_pay?: boolean
    supports_google_pay?: boolean
    supports_contactless?: boolean
    min_amount_no_pin?: number
    supported_card_networks?: string[]
    checkout_location?: '自助收银' | '人工收银'
  }
  extended_fields: Record<string, any>
  average_rating?: number
  review_count?: number
  created_at: string
  updated_at: string
  created_by: string
  remarks?: string
  custom_links?: Array<{ title: string; url: string; platform: string }>
}

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

const POSDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posMachines, deletePOSMachine } = useMapStore()
  const permissions = usePermissions()
  
  const [pos, setPOS] = useState<POSMachine | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [externalLinks, setExternalLinks] = useState<ExternalLinkType[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadPOSDetail()
      loadReviews()
      loadExternalLinks()
      if (user) {
        checkFavoriteStatus()
      }
    }
  }, [id, user])

  const loadPOSDetail = async () => {
    try {
      // 从useMapStore中查找POS机数据，移除数据库依赖
      const foundPOS = posMachines.find(pos => pos.id === id)
      
      if (foundPOS) {
        setPOS(foundPOS as POSMachine)
      } else {
        // 如果没找到，使用模拟数据
        const mockPOS: POSMachine = {
          id: id || '1',
          merchant_name: '星巴克咖啡',
          address: '北京市朝阳区建国门外大街1号',
          latitude: 39.9042,
          longitude: 116.4074,
          basic_info: {
            supports_apple_pay: true,
            supports_google_pay: true,
            supports_foreign_cards: true,
            supports_contactless: true
          },
          extended_fields: {},
          average_rating: 4.5,
          review_count: 23,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'mock-user-id'
        }
        setPOS(mockPOS)
      }
    } catch (error) {
      console.error('加载POS机详情失败:', error)
      toast.error('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    if (!id) return
    
    try {
      // 从Supabase数据库查询真实评价数据
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id,
          users (
            id,
            username,
            avatar_url
          )
        `)
        .eq('pos_machine_id', id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('加载评价失败:', error)
        return
      }
      
      // 转换数据格式
      const formattedReviews: Review[] = (reviewsData || []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        user_id: review.user_id,
        users: {
          display_name: (review.users as any)?.username || '匿名用户',
          avatar_url: (review.users as any)?.avatar_url
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

  const checkFavoriteStatus = async () => {
    if (!user || !id) return
    
    try {
      // 从Supabase数据库查询用户收藏状态
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('pos_machine_id', id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 表示没有找到记录，这是正常的
        console.error('查询收藏状态失败:', error)
        return
      }
      
      setIsFavorite(!!data)
    } catch (error) {
      console.error('查询收藏状态失败:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!id) return

    try {
      if (isFavorite) {
        // 取消收藏 - 从数据库删除记录
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('pos_machine_id', id)
        
        if (error) {
          console.error('取消收藏失败:', error)
          toast.error('取消收藏失败，请重试')
          return
        }
        
        setIsFavorite(false)
        toast.success('已取消收藏')
      } else {
        // 添加收藏 - 向数据库插入记录
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            pos_machine_id: id
          })
        
        if (error) {
          console.error('添加收藏失败:', error)
          toast.error('添加收藏失败，请重试')
          return
        }
        
        setIsFavorite(true)
        toast.success('已添加到收藏')
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      toast.error('操作失败，请重试')
    }
  }

  const submitReview = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!id) return

    if (!newReview.comment.trim()) {
      toast.error('请填写评价内容')
      return
    }

    setSubmittingReview(true)
    try {
      // 保存评价到Supabase数据库
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          pos_machine_id: id,
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment.trim()
        })
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id,
          users (
            id,
            username,
            avatar_url
          )
        `)
        .single()
      
      if (error) {
        console.error('提交评价失败:', error)
        toast.error('提交失败，请重试')
        return
      }
      
      // 格式化新评价数据并添加到本地列表
      const newReviewData: Review = {
        id: data.id,
        rating: data.rating,
        comment: data.comment,
        created_at: data.created_at,
        user_id: data.user_id,
        users: {
          display_name: (data.users as any)?.username || '匿名用户',
          avatar_url: (data.users as any)?.avatar_url
        }
      }
      
      setReviews(prev => [newReviewData, ...prev])
      
      toast.success('评价提交成功')
      setShowReviewModal(false)
      setNewReview({ rating: 5, comment: '' })
    } catch (error) {
      console.error('提交评价失败:', error)
      toast.error('提交失败，请重试')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleDeletePOS = async () => {
    if (!id || !pos) return

    setDeleting(true)
    try {
      await deletePOSMachine(id)
      toast.success('POS机删除成功')
      navigate('/')
    } catch (error) {
      console.error('删除POS机失败:', error)
      toast.error('删除失败，请重试')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
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
      <div className="h-full flex items-center justify-center">
        <Loading size="lg" text="正在加载详情..." />
      </div>
    )
  }

  if (!pos) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">POS机不存在</h3>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 shadow-sm border-b">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex space-x-2">
            <Button
              onClick={toggleFavorite}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
            </Button>
            
            {permissions.canEditItem(pos.created_by) && (
              <Button
                onClick={() => navigate(`/edit-pos/${pos.id}`)}
                variant="ghost"
                size="sm"
                className="p-2"
                title="编辑POS机"
              >
                <Edit className="w-5 h-5" />
              </Button>
            )}
            
            {permissions.canDeleteItem(pos.created_by) && (
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="ghost"
                size="sm"
                className="p-2 text-red-600 hover:text-red-700"
                title="删除POS机"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{pos.merchant_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <span className="text-gray-600">{pos.address}</span>
            </div>
            
            {pos.average_rating && (
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {renderStars(Math.round(pos.average_rating))}
                </div>
                <span className="text-gray-600">
                  {pos.average_rating.toFixed(1)} ({pos.review_count || 0}条评价)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 支付信息 - 左右并行布局 */}
        {pos.basic_info && Object.keys(pos.basic_info).length > 0 && (
          <>
            {/* 卡组织支持和Contactless支持并行布局 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 卡组织支持 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span>卡组织支持</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pos.basic_info.supported_card_networks && pos.basic_info.supported_card_networks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pos.basic_info.supported_card_networks.map((network) => (
                        <span
                          key={network}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {getCardNetworkLabel(network)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">待勘察</p>
                  )}
                </CardContent>
              </Card>

              {/* Contactless 支持 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    <span>Contactless 支持</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(pos.basic_info.supports_apple_pay || pos.basic_info.supports_google_pay || pos.basic_info.supports_contactless) ? (
                    <div className="space-y-3">
                      {pos.basic_info.supports_apple_pay && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Apple Pay</span>
                        </div>
                      )}
                      {pos.basic_info.supports_google_pay && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Google Pay</span>
                        </div>
                      )}
                      {pos.basic_info.supports_contactless && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">闪付支持</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">待勘察</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 设备支持 - 重新定义为POS机型号和收单机构 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span>设备支持</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">POS机型号</label>
                    <p className="text-sm text-gray-900">
                      {pos.basic_info.model || <span className="text-gray-500">待勘察</span>}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">收单机构</label>
                    <p className="text-sm text-gray-900">
                      {pos.basic_info.acquiring_institution || <span className="text-gray-500">待勘察</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 结账地点板块 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-green-600" />
                  <span>结账地点</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900">
                  {pos.basic_info.checkout_location || <span className="text-gray-500">待勘察</span>}
                </p>
              </CardContent>
            </Card>

            {/* 备注板块 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>备注</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900">
                  {pos.remarks || <span className="text-gray-500">待勘察</span>}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* 自定义字段 */}
        {pos.extended_fields && Object.keys(pos.extended_fields).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>其他信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(pos.extended_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 外部链接 */}
        {externalLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>相关链接</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {externalLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{link.title}</h4>
                      {link.description && (
                        <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 评价列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>用户评价</CardTitle>
              {permissions.canAdd && (
                <Button
                  onClick={() => setShowReviewModal(true)}
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  写评价
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-gray-600 text-center py-4">暂无评价</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
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
        </Card>
      </div>

      {/* 评价弹窗 */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="写评价"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评分
            </label>
            <div className="flex space-x-1">
              {renderStars(newReview.rating, true, (rating) => 
                setNewReview(prev => ({ ...prev, rating }))
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评价内容
            </label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="分享您的使用体验..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowReviewModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={submitReview}
              loading={submittingReview}
              className="flex-1"
            >
              提交评价
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            确定要删除POS机 "{pos?.merchant_name}" 吗？此操作无法撤销。
          </p>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowDeleteModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleDeletePOS}
              loading={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default POSDetail