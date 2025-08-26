import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Smartphone, Settings, FileText, Link, Plus, Trash2, Building, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { usePermissions } from '@/hooks/usePermissions'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedInput from '@/components/ui/AnimatedInput'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import AnimatedModal from '@/components/ui/AnimatedModal'
import MultiSelect from '@/components/ui/MultiSelect'
import RadioGroup from '@/components/ui/RadioGroup'
import BrandSelector from '@/components/BrandSelector'
import Select from '@/components/ui/Select'
import { CARD_NETWORKS, CardNetwork, getCardNetworkLabel } from '@/lib/cardNetworks'
import { AnimatedTopNav } from '@/components/AnimatedNavigation'
import { FeesConfiguration, DEFAULT_FEES_CONFIG, FeeType } from '@/types/fees'
import { formatFeeDisplay } from '@/utils/feeUtils'

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
    supports_apple_pay?: boolean
    supports_google_pay?: boolean
    supports_contactless?: boolean
    supports_hce_simulation?: boolean
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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)

  // 防止body滚动，只允许页面内容区域滚动
  useEffect(() => {
    // 禁用body滚动
    document.body.style.overflow = 'hidden'
    
    // 组件卸载时恢复body滚动
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])
  const [showLocationModal, setShowLocationModal] = useState(false)
  
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
      supports_apple_pay: false,
      supports_google_pay: false,
      supports_contactless: false,
      supports_hce_simulation: false,
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

  // 地图初始化
  useEffect(() => {
    if (!showLocationModal || !mapContainerRef.current) return

    let isCancelled = false
    setMapLoading(true)

    const initMap = async () => {
      if (!mapContainerRef.current || isCancelled) return

      try {
        const AMap = await loadAMap()
        if (isCancelled) return

        const map = new AMap.Map(mapContainerRef.current, {
          ...DEFAULT_MAP_CONFIG,
          zoom: 16,
          center: [formData.longitude || 116.4074, formData.latitude || 39.9042]
        })
        mapInstanceRef.current = map

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar())

        map.on('click', (e: any) => {
          updateLocation(e.lnglat.getLng(), e.lnglat.getLat())
        })

        // 如果已有位置，显示标记
        if (formData.latitude && formData.longitude) {
          updateLocation(formData.longitude, formData.latitude)
        }

      } catch (error) {
        console.error('Map initialization failed:', error)
        toast.error('地图加载失败，请刷新页面重试')
      } finally {
        if (!isCancelled) {
          setMapLoading(false)
        }
      }
    }

    const timerId = setTimeout(initMap, 150)

    return () => {
      isCancelled = true
      clearTimeout(timerId)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [showLocationModal, formData.latitude, formData.longitude])

  // 更新位置标记
  const updateLocation = (lng: number, lat: number) => {
    if (!mapInstanceRef.current) return
    const AMap = window.AMap

    if (markerRef.current) {
      mapInstanceRef.current.remove(markerRef.current)
    }

    markerRef.current = new AMap.Marker({
      position: [lng, lat],
      draggable: true,
    })

    markerRef.current.on('dragend', (e: any) => {
      const currentPos = e.lnglat
      updateFormLocation(currentPos.getLng(), currentPos.getLat())
    })

    mapInstanceRef.current.add(markerRef.current)
    updateFormLocation(lng, lat)
  }

  // 更新表单位置信息
  const updateFormLocation = async (lng: number, lat: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

    try {
      const address = await locationUtils.getAddress(lng, lat)
      setFormData(prev => ({ ...prev, address }))
    } catch (error) {
      console.warn('Failed to get address:', error)
      const fallbackAddress = `位置: ${lat.toFixed(6)}, ${lng.toFixed(6)} (请手动输入详细地址)`
      setFormData(prev => ({ ...prev, address: fallbackAddress }))
      toast.error('地址解析失败，请手动输入详细地址')
    }
  }

  // 获取当前位置
  const handleGetLocation = async () => {
    if (!mapInstanceRef.current) {
      toast.error('地图未加载完成')
      return
    }

    setLocationLoading(true)
    try {
      const { getCurrentLocation } = useMapStore.getState()
      await getCurrentLocation()
      const { currentLocation } = useMapStore.getState()
      if (currentLocation) {
        const { longitude: lng, latitude: lat } = currentLocation
        mapInstanceRef.current.setCenter([lng, lat])
        updateLocation(lng, lat)
        toast.success('定位成功')
      }
    } catch (error) {
      console.error('定位失败:', error)
      toast.error('定位失败，请检查定位权限')
    } finally {
      setLocationLoading(false)
    }
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
        }),
        timeoutPromise,
      ])

      console.log('[AddPOS] 提交成功，结果:', result)
      toast.dismiss('saving-pos')
      toast.success('POS机添加成功！')
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        navigate('/map')
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
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <AnimatedTopNav title="添加POS机" className="flex-shrink-0">
        <AnimatedButton onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </AnimatedButton>
        <AnimatedButton onClick={handleSubmit} loading={loading} disabled={loading}>
          保存
        </AnimatedButton>
      </AnimatedTopNav>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              onClick={() => setShowLocationModal(true)}
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
            
            <Select
              label="收单机构"
              value={formData.basic_info.acquiring_institution || ''}
              onChange={value => handleInputChange('basic_info.acquiring_institution', value)}
              options={[
                { value: '银联商务', label: '银联商务' },
                { value: '拉卡拉', label: '拉卡拉' },
                { value: '收钱吧', label: '收钱吧' },
                { value: '美团', label: '美团' },
                { value: '富友支付', label: '富友支付' },
                { value: '通联支付', label: '通联支付' },
                { value: '汇付天下', label: '汇付天下' },
                { value: '随行付', label: '随行付' },
                { value: '新大陆', label: '新大陆' },
                { value: '海科融通', label: '海科融通' },
                { value: '其他', label: '其他' }
              ]}
              placeholder="请选择收单机构"
            />

            <Select
              label="设备状态"
              value={formData.status || 'active'}
              onChange={value => handleInputChange('status', value)}
              options={[
                { value: 'active', label: '正常运行' },
                { value: 'inactive', label: '暂时不可用' },
                { value: 'maintenance', label: '维修中' },
                { value: 'disabled', label: '已停用' }
              ]}
              placeholder="请选择设备状态"
            />

            <RadioGroup
              name="checkout_location"
              label="收银位置"
              options={[
                { value: '自助收银', label: '自助收银' },
                { value: '人工收银', label: '人工收银' }
              ]}
              value={formData.basic_info.checkout_location || ''}
              onChange={value => handleInputChange('basic_info.checkout_location', value)}
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

            <MultiSelect
              label="支持的卡组织"
              options={CARD_NETWORKS.map(network => ({
                value: network.value,
                label: getCardNetworkLabel(network.value as CardNetwork)
              }))}
              value={formData.basic_info.supported_card_networks || []}
              onChange={value => handleInputChange('basic_info.supported_card_networks', value)}
              placeholder="请选择支持的卡组织"
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('basic_info.supports_contactless', !formData.basic_info.supports_contactless)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.basic_info.supports_contactless
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.basic_info.supports_contactless ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <span className="font-medium">实体卡 Contactless</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleInputChange('basic_info.supports_apple_pay', !formData.basic_info.supports_apple_pay)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.basic_info.supports_apple_pay
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.basic_info.supports_apple_pay ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <span className="font-medium">Apple Pay</span>
                  </div>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('basic_info.supports_google_pay', !formData.basic_info.supports_google_pay)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.basic_info.supports_google_pay
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.basic_info.supports_google_pay ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <span className="font-medium">Google Pay</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleInputChange('basic_info.supports_hce_simulation', !formData.basic_info.supports_hce_simulation)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.basic_info.supports_hce_simulation
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.basic_info.supports_hce_simulation ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <span className="font-medium">HCE模拟</span>
                  </div>
                </button>
              </div>
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
                  <MultiSelect
                     label="支持的卡组织"
                     options={CARD_NETWORKS.map(network => ({
                       value: network.value,
                       label: getCardNetworkLabel(network.value as CardNetwork)
                     }))}
                     value={formData.verification_modes.small_amount_no_pin || []}
                     onChange={value => handleInputChange('verification_modes.small_amount_no_pin', value)}
                     placeholder="请选择支持小额免密的卡组织"
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
                  <MultiSelect
                     label="支持的卡组织"
                     options={CARD_NETWORKS.map(network => ({
                       value: network.value,
                       label: getCardNetworkLabel(network.value as CardNetwork)
                     }))}
                     value={formData.verification_modes.requires_password || []}
                     onChange={value => handleInputChange('verification_modes.requires_password', value)}
                     placeholder="请选择需要密码的卡组织"
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
                  <MultiSelect
                     label="支持的卡组织"
                     options={CARD_NETWORKS.map(network => ({
                       value: network.value,
                       label: getCardNetworkLabel(network.value as CardNetwork)
                     }))}
                     value={formData.verification_modes.requires_signature || []}
                     onChange={value => handleInputChange('verification_modes.requires_signature', value)}
                     placeholder="请选择需要签名的卡组织"
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                货币
                              </label>
                              <select
                                value={fee.currency || '$'}
                                onChange={e => {
                                  const newFees = { ...formData.fees }
                                  newFees[network.value] = {
                                    ...fee,
                                    currency: e.target.value
                                  }
                                  handleInputChange('fees', newFees)
                                }}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="$">$</option>
                                <option value="¥">¥</option>
                                <option value="€">€</option>
                                <option value="£">£</option>
                              </select>
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

      {/* 地图选择位置模态框 */}
      <AnimatedModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="选择位置"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            点击地图选择POS机位置，可拖拽标记调整位置
          </div>
          
          <div className="w-full h-96 rounded-lg relative">
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
                <Loading text="正在加载地图..." />
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
            
            {/* 定位按钮 */}
            <AnimatedButton
              onClick={handleGetLocation}
              disabled={locationLoading || mapLoading}
              className="absolute right-4 bottom-4 w-12 h-12 rounded-full shadow-lg bg-white hover:bg-gray-50 text-blue-600 border border-gray-200 p-0 flex items-center justify-center"
              variant="ghost"
            >
              {locationLoading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </AnimatedButton>
          </div>
          
          {formData.latitude !== 0 && formData.longitude !== 0 && (
            <div className="text-sm text-gray-600">
              当前坐标: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <AnimatedButton
              onClick={() => setShowLocationModal(false)}
              variant="outline"
            >
              取消
            </AnimatedButton>
            <AnimatedButton
              onClick={() => {
                if (formData.latitude === 0 || formData.longitude === 0) {
                  toast.error('请先选择位置')
                  return
                }
                setShowLocationModal(false)
                toast.success('位置选择成功')
              }}
              disabled={formData.latitude === 0 || formData.longitude === 0}
            >
              确认选择
            </AnimatedButton>
          </div>
        </div>
      </AnimatedModal>
    </div>
  )
}

export default AddPOS