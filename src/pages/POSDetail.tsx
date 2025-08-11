import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Edit, Heart, ExternalLink, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
// import { supabase } from '@/lib/supabase' // 移除数据库依赖
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface POSMachine {
  id: string
  name: string
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
  }
  extended_fields: Record<string, any>
  average_rating?: number
  review_count?: number
  created_at: string
  updated_at: string
  created_by: string
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
  const { posMachines } = useMapStore()
  
  const [pos, setPOS] = useState<POSMachine | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [externalLinks, setExternalLinks] = useState<ExternalLinkType[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

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
          name: '星巴克POS机',
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
    try {
      // 使用模拟评价数据，移除数据库依赖
      const mockReviews: Review[] = [
        {
          id: '1',
          rating: 5,
          comment: '支付很方便，支持多种支付方式！',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          user_id: 'user1',
          users: {
            display_name: '张三',
            avatar_url: undefined
          }
        },
        {
          id: '2',
          rating: 4,
          comment: '设备运行稳定，但有时候网络会慢一点。',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          user_id: 'user2',
          users: {
            display_name: '李四',
            avatar_url: undefined
          }
        }
      ]
      setReviews(mockReviews)
    } catch (error) {
      console.error('加载评价失败:', error)
    }
  }

  const loadExternalLinks = async () => {
    try {
      // 使用模拟外部链接数据，移除数据库依赖
      const mockLinks: ExternalLinkType[] = [
        {
          id: '1',
          title: '商户官网',
          url: 'https://www.starbucks.com.cn',
          description: '星巴克中国官方网站',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: '支付指南',
          url: 'https://help.starbucks.com.cn/payment',
          description: '了解更多支付方式',
          created_at: new Date().toISOString()
        }
      ]
      setExternalLinks(mockLinks)
    } catch (error) {
      console.error('加载外部链接失败:', error)
    }
  }

  const checkFavoriteStatus = async () => {
    if (!user) return
    
    try {
      // 使用模拟收藏状态，移除数据库依赖
      // 模拟用户已收藏某些POS机
      const mockFavoriteIds = ['1', '2']
      setIsFavorite(mockFavoriteIds.includes(id || ''))
    } catch (error) {
      // 没有收藏记录是正常的
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      // 使用本地状态管理收藏，移除数据库依赖
      if (isFavorite) {
        setIsFavorite(false)
        toast.success('已取消收藏')
      } else {
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

    if (!newReview.comment.trim()) {
      toast.error('请填写评价内容')
      return
    }

    setSubmittingReview(true)
    try {
      // 使用本地状态管理评价，移除数据库依赖
      const newReviewData: Review = {
        id: Date.now().toString(),
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        users: {
          display_name: user.user_metadata?.display_name || '匿名用户',
          avatar_url: user.user_metadata?.avatar_url
        }
      }
      
      // 添加到本地评价列表
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
            
            {user && user.id === pos.created_by && (
              <Button
                onClick={() => navigate(`/edit-pos/${pos.id}`)}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <Edit className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{pos.name}</CardTitle>
            <CardDescription>{pos.merchant_name}</CardDescription>
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

        {/* 支付信息 */}
        {pos.basic_info && Object.keys(pos.basic_info).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>支付信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {pos.basic_info.supports_apple_pay && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm">Apple Pay</span>
                  </div>
                )}
                {pos.basic_info.supports_google_pay && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm">Google Pay</span>
                  </div>
                )}
                {pos.basic_info.supports_foreign_cards && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm">外卡支持</span>
                  </div>
                )}
                {pos.basic_info.supports_contactless && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm">闪付支持</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
              <Button
                onClick={() => setShowReviewModal(true)}
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                写评价
              </Button>
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
    </div>
  )
}

export default POSDetail