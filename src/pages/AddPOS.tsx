import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Smartphone, Settings, FileText, Link, Plus, Trash2, Building, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { usePermissions } from '@/hooks/usePermissions'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedInput from '@/components/ui/AnimatedInput'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import ThreeStateSelector, { ThreeStateValue } from '@/components/ui/ThreeStateSelector'
import CardNetworkSelector from '@/components/ui/CardNetworkSelector'
import RadioGroup from '@/components/ui/RadioGroup'
import BrandSelector from '@/components/BrandSelector'
import SystemSelect from '@/components/ui/SystemSelect'
import { CARD_NETWORKS, CardNetwork, getCardNetworkLabel } from '@/lib/cardNetworks'
import { AnimatedTopNav } from '@/components/AnimatedNavigation'
import { FeesConfiguration, DEFAULT_FEES_CONFIG, FeeType } from '@/types/fees'
import { formatFeeDisplay } from '@/utils/feeUtils'
import SimpleMapPicker from '@/components/SimpleMapPicker'

interface FormData {
  merchant_name: string
  address: string
  latitude: number
  longitude: number
  brand_id?: string
  status?: 'active' | 'inactive' | 'maintenance' | 'disabled'
  // 商家信息
  merchant_info: {
    transaction_name?: string
    transaction_type?: string
  }
  basic_info: {
    model?: string
    acquiring_institution?: string
    supports_apple_pay?: ThreeStateValue
    supports_google_pay?: ThreeStateValue
    supports_contactless?: ThreeStateValue
    supports_hce_simulation?: ThreeStateValue
    min_amount_no_pin?: number
    supported_card_networks?: string[]
    checkout_location?: '自助收银' | '人工收银'
    // 收单模式支持
    acquiring_modes?: string[]
  }
  // 验证模式
  verification_modes: {
    small_amount_no_pin?: string[]
    small_amount_no_pin_unsupported?: boolean
    small_amount_no_pin_uncertain?: boolean
    requires_password?: string[]
    requires_password_unsupported?: boolean
    requires_password_uncertain?: boolean
    requires_signature?: string[]
    requires_signature_unsupported?: boolean
    requires_signature_uncertain?: boolean
  }
  // 尝试记录
  attempts?: {
    user: string
    result: 'success' | 'failure'
    timestamp: string
    card_name?: string
    payment_method?: string
  }[]
  extended_fields: Record<string, any>
  remarks?: string
  custom_links?: Array<{ title: string; url: string; platform: string }>
  fees?: FeesConfiguration
}

const AddPOS = () => {
  const navigate = useNavigate()
  const { user: _ } = useAuthStore()
  const { addPOSMachine } = useMapStore()
  const _permissions = usePermissions()
  
  const [loading, setLoading] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  
  // 调试：监听状态变化
  useEffect(() => {
    console.log('showLocationModal 状态变化:', showLocationModal)
  }, [showLocationModal])
  
  const [formData, setFormData] = useState<FormData>({
    merchant_name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    status: 'active',
    merchant_info: {
      transaction_name: '',
      transaction_type: ''
    },
    basic_info: {
      model: '',
      acquiring_institution: '',
      supports_apple_pay: 'unknown',
      supports_google_pay: 'unknown',
      supports_contactless: 'unknown',
      supports_hce_simulation: 'unknown',
      min_amount_no_pin: 0,
      supported_card_networks: [],
      checkout_location: undefined,
      acquiring_modes: []
    },
    verification_modes: {
      small_amount_no_pin: [],
      small_amount_no_pin_unsupported: false,
      small_amount_no_pin_uncertain: false,
      requires_password: [],
      requires_password_unsupported: false,
      requires_password_uncertain: false,
      requires_signature: [],
      requires_signature_unsupported: false,
      requires_signature_uncertain: false
    },
    attempts: [],
    extended_fields: {},
    remarks: '',
    custom_links: [],
    fees: DEFAULT_FEES_CONFIG
  })

  const handleInputChange = (field: string, value: any) => {
    try {
      setFormData(prev => {
        if (field.includes('.')) {
          const [parent, child] = field.split('.')
          return {
            ...prev,
            [parent]: {
              ...(prev[parent as keyof FormData] as any),
              [child]: value
            }
          }
        }
        return { ...prev, [field]: value }
      })
    } catch (error) {
      console.error('Error updating form data:', error)
      toast.error('更新表单数据时出错')
    }
  }

  const addCustomLink = () => {
    setFormData(prev => ({
      ...prev,
      custom_links: [...(prev.custom_links || []), { title: '', url: '', platform: '' }]
    }))
  }

  const removeCustomLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      custom_links: prev.custom_links?.filter((_, i) => i !== index) || []
    }))
  }

  const updateCustomLink = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      custom_links: prev.custom_links?.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      ) || []
    }))
  }

  const validateForm = () => {
    // 快速验证：先检查最基本的字段
    if (!formData.merchant_name?.trim()) {
      toast.error('请填写商家名称')
      return false
    }
    
    if (!formData.address?.trim()) {
      toast.error('请填写详细地址')
      return false
    }
    
    // 位置验证
    if (!formData.latitude || !formData.longitude || 
        formData.latitude === 0 || formData.longitude === 0) {
      toast.error('请在地图上选择准确位置')
      return false
    }
    
    // 可选但推荐的字段验证
     const warnings = []
     
     if (!formData.basic_info?.model?.trim()) {
       warnings.push('设备型号')
     }
     
     if (!formData.basic_info?.acquiring_institution?.trim()) {
       warnings.push('收单机构')
     }
     
     if (!formData.merchant_info?.transaction_name?.trim()) {
       warnings.push('交易名称')
     }
    
    // 如果有缺失的推荐字段，给出友好提示但不阻止提交
    if (warnings.length > 0) {
      console.log('[AddPOS] 推荐填写字段:', warnings.join('、'))
      // 不阻止提交，只是记录日志
    }
    
    return true
  }

  // 处理地图选择的位置
  const handleLocationConfirm = (latitude: number, longitude: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude,
      longitude,
      address: address || prev.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }))
    toast.success('位置选择成功')
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      console.log('[AddPOS] 提交开始，表单数据:', formData)
      
      // 延长超时时间到60秒，给用户更多填写时间
      const timeoutMs = 60000
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`保存请求超时（>${timeoutMs / 1000}s），请检查网络连接后重试`)), timeoutMs)
      )

      // 添加网络状态检查
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试')
      }

      // 显示详细的加载状态
      toast.loading('正在保存POS机信息...', { id: 'saving-pos' })

      const result = await Promise.race([
        addPOSMachine({
          ...formData,
          status: 'active',
          // 转换 ThreeStateValue 到 boolean 以保持数据库兼容性
          basic_info: {
            ...formData.basic_info,
            supports_apple_pay: formData.basic_info.supports_apple_pay === 'supported',
            supports_google_pay: formData.basic_info.supports_google_pay === 'supported',
            supports_contactless: formData.basic_info.supports_contactless === 'supported',
            supports_hce_simulation: formData.basic_info.supports_hce_simulation === 'supported',
          }
        }),
        timeoutPromise,
      ])

      console.log('[AddPOS] 提交成功，结果:', result)
      toast.dismiss('saving-pos')
      toast.success('POS机添加成功！')
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        navigate('/app/map')
      }, 500)
      
    } catch (error: any) {
      console.error('[AddPOS] 添加POS机失败:', error)
      toast.dismiss('saving-pos')
      
      // 更详细的错误处理
      let errorMessage = '添加失败，请重试'
      
      if (error?.message?.includes('超时')) {
        errorMessage = '保存超时，请检查网络连接后重试'
      } else if (error?.message?.includes('网络')) {
        errorMessage = '网络连接异常，请检查网络后重试'
      } else if (error?.message?.includes('认证')) {
        errorMessage = '登录状态异常，请重新登录后重试'
      } else if (error?.code === 'PGRST301') {
        errorMessage = '数据格式错误，请检查输入信息'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <AnimatedTopNav title="添加POS机" className="flex-shrink-0">
        <AnimatedButton onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </AnimatedButton>
        <AnimatedButton onClick={handleSubmit} loading={loading} disabled={loading} className="min-w-[80px] touch-manipulation">
          保存
        </AnimatedButton>
      </AnimatedTopNav>

      {/* 主要内容区域 */}
      <div className="flex-1 p-4 space-y-4 pb-20 sm:pb-4">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatedInput
              label="商户名称 *"
              value={formData.merchant_name}
              onChange={e => handleInputChange('merchant_name', e.target.value)}
              placeholder="请输入商户名称"
            />
            <AnimatedInput
              label="地址 *"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              placeholder="请输入地址"
            />
            <BrandSelector
              value={formData.brand_id || ''}
              onChange={value => handleInputChange('brand_id', value)}
              placeholder="请选择所属品牌（可选）"
            />
            <AnimatedButton 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('点击了地图选择按钮')
                // 延迟到当前事件循环结束后再打开，避免同一次点击事件触发遮罩 onClick 导致立刻关闭
                setTimeout(() => {
                  setShowLocationModal(true)
                  console.log('showLocationModal 已设置为 true')
                }, 0)
              }}
              variant="outline" 
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {formData.latitude && formData.longitude ? '重新选择位置' : '在地图上选择位置'}
            </AnimatedButton>
            {formData.latitude !== 0 && formData.longitude !== 0 && (
              <div className="text-sm text-gray-600">
                坐标: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 商家信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              商家信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatedInput
              label="商户交易名称"
              value={formData.merchant_info.transaction_name || ''}
              onChange={e => handleInputChange('merchant_info.transaction_name', e.target.value)}
              placeholder="请输入商户交易名称"
            />
            <AnimatedInput
              label="商户交易类型"
              value={formData.merchant_info.transaction_type || ''}
              onChange={e => handleInputChange('merchant_info.transaction_type', e.target.value)}
              placeholder="请输入商户交易类型"
            />
          </CardContent>
        </Card>

        {/* 设备支持 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              设备支持
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatedInput
              label="POS机型号"
              value={formData.basic_info.model || ''}
              onChange={e => handleInputChange('basic_info.model', e.target.value)}
              placeholder="请输入POS机型号"
            />
            
            <SystemSelect
              dataType="acquiring_institution"
              label="收单机构"
              value={formData.basic_info.acquiring_institution || ''}
              onChange={value => handleInputChange('basic_info.acquiring_institution', value)}
              placeholder="请选择收单机构"
              showDescription={true}
              allowCustom={true}
              customPlaceholder="输入自定义收单机构名称"
            />

            <SystemSelect
              dataType="device_status"
              label="设备状态"
              value={formData.status || 'active'}
              onChange={value => handleInputChange('status', value)}
              placeholder="请选择设备状态"
              showDescription={true}
            />

            <SystemSelect
              dataType="checkout_locations"
              label="收银位置"
              value={formData.basic_info.checkout_location || ''}
              onChange={value => handleInputChange('basic_info.checkout_location', value)}
              placeholder="请选择收银位置"
              showDescription={true}
            />

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">收单模式支持</label>
              <div className="space-y-3">
                {/* DCC Toggle Switch */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">DCC</div>
                    <div className="text-sm text-gray-500">Dynamic Currency Conversion</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const modes = formData.basic_info.acquiring_modes || []
                      const isDCCEnabled = modes.includes('DCC')
                      if (isDCCEnabled) {
                        handleInputChange('basic_info.acquiring_modes', modes.filter(m => m !== 'DCC'))
                      } else {
                        handleInputChange('basic_info.acquiring_modes', [...modes, 'DCC'])
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.basic_info.acquiring_modes?.includes('DCC') ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.basic_info.acquiring_modes?.includes('DCC') ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {/* EDC Toggle Switch */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">EDC</div>
                    <div className="text-sm text-gray-500">Electronic Data Capture</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const modes = formData.basic_info.acquiring_modes || []
                      const isEDCEnabled = modes.includes('EDC')
                      if (isEDCEnabled) {
                        handleInputChange('basic_info.acquiring_modes', modes.filter(m => m !== 'EDC'))
                      } else {
                        handleInputChange('basic_info.acquiring_modes', [...modes, 'EDC'])
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.basic_info.acquiring_modes?.includes('EDC') ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.basic_info.acquiring_modes?.includes('EDC') ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <CardNetworkSelector
              label="支持的卡组织"
              value={formData.basic_info.supported_card_networks || []}
              onChange={value => handleInputChange('basic_info.supported_card_networks', value)}
              allowSelectAll={true}
            />


          </CardContent>
        </Card>

        {/* Contactless支持 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Contactless支持
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* 实体卡 Contactless */}
              <ThreeStateSelector
                value={formData.basic_info.supports_contactless || 'unknown'}
                onChange={value => handleInputChange('basic_info.supports_contactless', value)}
                label="实体卡 Contactless"
                icon={<CreditCard className="w-5 h-5" />}
              />

              {/* Apple Pay */}
              <ThreeStateSelector
                value={formData.basic_info.supports_apple_pay || 'unknown'}
                onChange={value => handleInputChange('basic_info.supports_apple_pay', value)}
                label="Apple Pay"
                icon={<Smartphone className="w-5 h-5" />}
              />

              {/* Google Pay */}
              <ThreeStateSelector
                value={formData.basic_info.supports_google_pay || 'unknown'}
                onChange={value => handleInputChange('basic_info.supports_google_pay', value)}
                label="Google Pay"
                icon={<Smartphone className="w-5 h-5" />}
              />

              {/* HCE模拟 */}
              <ThreeStateSelector
                value={formData.basic_info.supports_hce_simulation || 'unknown'}
                onChange={value => handleInputChange('basic_info.supports_hce_simulation', value)}
                label="HCE模拟"
                icon={<Settings className="w-5 h-5" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* 验证模式 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              验证模式
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 小额免密 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">小额免密</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <CardNetworkSelector
                     label="支持小额免密的卡组织"
                     value={formData.verification_modes.small_amount_no_pin || []}
                     onChange={value => handleInputChange('verification_modes.small_amount_no_pin', value)}
                     maxSelections={10}
                   />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('verification_modes.small_amount_no_pin_unsupported', !formData.verification_modes.small_amount_no_pin_unsupported)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      formData.verification_modes.small_amount_no_pin_unsupported
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {formData.verification_modes.small_amount_no_pin_unsupported ? '● 不支持' : '○ 不支持'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('verification_modes.small_amount_no_pin_uncertain', !formData.verification_modes.small_amount_no_pin_uncertain)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      formData.verification_modes.small_amount_no_pin_uncertain
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {formData.verification_modes.small_amount_no_pin_uncertain ? '● 未确定' : '○ 未确定'}
                  </button>
                </div>
              </div>
            </div>

            {/* 需要密码 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">需要密码</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <CardNetworkSelector
                     label="需要密码验证的卡组织"
                     value={formData.verification_modes.requires_password || []}
                     onChange={value => handleInputChange('verification_modes.requires_password', value)}
                     maxSelections={10}
                   />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('verification_modes.requires_password_unsupported', !formData.verification_modes.requires_password_unsupported)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      formData.verification_modes.requires_password_unsupported
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {formData.verification_modes.requires_password_unsupported ? '● 不支持' : '○ 不支持'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('verification_modes.requires_password_uncertain', !formData.verification_modes.requires_password_uncertain)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      formData.verification_modes.requires_password_uncertain
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {formData.verification_modes.requires_password_uncertain ? '● 未确定' : '○ 未确定'}
                  </button>
                </div>
              </div>
            </div>

            {/* 需要签名 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">需要签名</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <CardNetworkSelector
                     label="需要签名验证的卡组织"
                     value={formData.verification_modes.requires_signature || []}
                     onChange={value => handleInputChange('verification_modes.requires_signature', value)}
                     maxSelections={10}
                   />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('verification_modes.requires_signature_unsupported', !formData.verification_modes.requires_signature_unsupported)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      formData.verification_modes.requires_signature_unsupported
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {formData.verification_modes.requires_signature_unsupported ? '● 不支持' : '○ 不支持'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('verification_modes.requires_signature_uncertain', !formData.verification_modes.requires_signature_uncertain)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      formData.verification_modes.requires_signature_uncertain
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {formData.verification_modes.requires_signature_uncertain ? '● 未确定' : '○ 未确定'}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 备注信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              备注信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              value={formData.remarks || ''}
              onChange={e => handleInputChange('remarks', e.target.value)}
              placeholder="请输入备注信息..."
            />
          </CardContent>
        </Card>

        {/* 付款手续费配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              付款手续费配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-gray-600 mb-4">
              为不同卡组织设置手续费率，支持百分比和固定金额两种模式
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {CARD_NETWORKS.map(network => {
                const fee = formData.fees?.[network.value] || {
                  network: network.value,
                  type: FeeType.PERCENTAGE,
                  value: 0,
                  enabled: false
                }
                
                return (
                  <div key={network.value} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{network.label}</span>
                        <span className="text-xs text-gray-500 uppercase">{network.value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFees = { ...formData.fees }
                          newFees[network.value] = {
                            ...fee,
                            enabled: !fee.enabled
                          }
                          handleInputChange('fees', newFees)
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          fee.enabled
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {fee.enabled ? '已启用' : '未启用'}
                      </button>
                    </div>
                    
                    {fee.enabled && (
                      <div className="space-y-3">
                        {/* 手续费类型选择 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            手续费类型
                          </label>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newFees = { ...formData.fees }
                                newFees[network.value] = {
                                  ...fee,
                                  type: FeeType.PERCENTAGE,
                                  value: 0
                                }
                                handleInputChange('fees', newFees)
                              }}
                              className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                                fee.type === FeeType.PERCENTAGE
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              百分比 (%)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newFees = { ...formData.fees }
                                newFees[network.value] = {
                                  ...fee,
                                  type: FeeType.FIXED,
                                  value: 0,
                                  currency: '$'
                                }
                                handleInputChange('fees', newFees)
                              }}
                              className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                                fee.type === FeeType.FIXED
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              固定金额
                            </button>
                          </div>
                        </div>
                        
                        {/* 手续费值输入 */}
                        <div className="flex space-x-2">
                          {fee.type === FeeType.FIXED && (
                            <div className="w-20">
                              <SystemSelect
                                dataType="currency"
                                label="货币"
                                value={fee.currency || '$'}
                                onChange={(value) => {
                                  const newFees = { ...formData.fees }
                                  newFees[network.value] = {
                                    ...fee,
                                    currency: value
                                  }
                                  handleInputChange('fees', newFees)
                                }}
                                className="w-20"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {fee.type === FeeType.PERCENTAGE ? '费率 (%)' : '金额'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={fee.type === FeeType.PERCENTAGE ? "100" : undefined}
                              step={fee.type === FeeType.PERCENTAGE ? "0.01" : "0.01"}
                              value={fee.value}
                              onChange={e => {
                                const newFees = { ...formData.fees }
                                newFees[network.value] = {
                                  ...fee,
                                  value: parseFloat(e.target.value) || 0
                                }
                                handleInputChange('fees', newFees)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={fee.type === FeeType.PERCENTAGE ? "0.00" : "0.00"}
                            />
                          </div>
                        </div>
                        
                        {/* 预览显示 */}
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          预览: {formatFeeDisplay(fee)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* 手续费配置说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">配置说明:</div>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>百分比费率: 按交易金额的百分比收取手续费</li>
                  <li>固定金额: 每笔交易收取固定手续费</li>
                  <li>可为每个卡组织单独设置不同的费率</li>
                  <li>未启用的卡组织将不收取手续费</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自定义链接 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Link className="w-5 h-5 mr-2" />
                自定义链接
              </div>
              <AnimatedButton onClick={addCustomLink} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                添加链接
              </AnimatedButton>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.custom_links?.map((link, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md">
                <div className="flex-1 space-y-2">
                  <AnimatedInput
                    label="标题"
                    value={link.title}
                    onChange={e => updateCustomLink(index, 'title', e.target.value)}
                    placeholder="链接标题"
                  />
                  <AnimatedInput
                    label="URL"
                    value={link.url}
                    onChange={e => updateCustomLink(index, 'url', e.target.value)}
                    placeholder="https://"
                  />
                  <AnimatedInput
                    label="平台"
                    value={link.platform}
                    onChange={e => updateCustomLink(index, 'platform', e.target.value)}
                    placeholder="平台名称"
                  />
                </div>
                <AnimatedButton
                  onClick={() => removeCustomLink(index)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </AnimatedButton>
              </div>
            ))}
            {(!formData.custom_links || formData.custom_links.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                暂无自定义链接，点击上方按钮添加
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 移动端固定保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 sm:hidden z-10 pb-safe-bottom">
        <AnimatedButton 
          onClick={handleSubmit} 
          loading={loading} 
          disabled={loading}
          className="w-full h-12 text-base font-medium touch-manipulation"
          size="lg"
        >
          保存POS机信息
        </AnimatedButton>
      </div>

      {/* 调试信息 */}
      <div className="fixed top-20 right-4 bg-red-500 text-white p-2 rounded-lg z-[10000] space-y-2">
        <div>showLocationModal: {showLocationModal ? 'true' : 'false'}</div>
        <button 
          onClick={() => {
            console.log('测试按钮点击前:', showLocationModal)
            const newValue = !showLocationModal
            setShowLocationModal(newValue)
            console.log('设置新值为:', newValue)
          }}
          className="bg-white text-red-500 px-2 py-1 rounded text-sm"
        >
          测试切换状态
        </button>
      </div>

      {/* 地图选择位置组件 */}
      <SimpleMapPicker
        isOpen={showLocationModal}
        onClose={() => {
          console.log('关闭地图选择器')
          setShowLocationModal(false)
        }}
        onConfirm={(lat, lng, address) => {
          console.log('确认位置:', lat, lng, address)
          handleLocationConfirm(lat, lng, address)
        }}
        initialLat={formData.latitude || 39.9042}
        initialLng={formData.longitude || 116.4074}
      />
    </div>
  )
}

export default AddPOS