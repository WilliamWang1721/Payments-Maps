import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, CreditCard, Settings, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { usePermissions } from '@/hooks/usePermissions'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedInput from '@/components/ui/AnimatedInput'
import Loading from '@/components/ui/Loading'
import AnimatedCard from '@/components/ui/AnimatedCard'
import { CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import AnimatedModal from '@/components/ui/AnimatedModal'
import MultiSelect from '@/components/ui/MultiSelect'
import BrandSelector from '@/components/BrandSelector'
import { CARD_NETWORKS, getCardNetworkLabel } from '@/lib/cardNetworks'
import { POSMachine, supabase } from '@/lib/supabase'
import RadioGroup from '@/components/ui/RadioGroup'
import Checkbox from '@/components/ui/Checkbox'
import Select from '@/components/ui/Select'
import { DEFAULT_FEES_CONFIG, FeeType, feeUtils } from '@/types/fees'

const EditPOS = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posMachines, updatePOSMachine, deletePOSMachine } = useMapStore()
  const permissions = usePermissions()
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<POSMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showCardInfoModal, setShowCardInfoModal] = useState(false)
  const [pendingAttemptResult, setPendingAttemptResult] = useState<'success' | 'failure' | null>(null)
  const [cardInfo, setCardInfo] = useState({
    card_name: '',
    payment_method: '',
    card_number: '',
    cvv: '',
    expiry_date: '',
    cardholder_name: '',
    result: '',
    notes: ''
  })
  const [attempts, setAttempts] = useState<any[]>([])

  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      if (scrollTop > scrollHeight - clientHeight) {
        scrollContainerRef.current.scrollTop = Math.max(0, scrollHeight - clientHeight)
      }
    }
  }, [formData])

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  useEffect(() => {
    if (!id) return

    const loadPOSData = async () => {
      try {
        // 首先尝试从store中获取数据
        let posData = posMachines.find(p => p.id === id)
        
        // 如果store中没有数据，直接从数据库查询
        if (!posData) {
          const { data, error } = await supabase
            .from('pos_machines')
            .select('*')
            .eq('id', id)
            .single()
          
          if (error || !data) {
            console.error('查询POS机数据失败:', error)
            toast.error('未找到该POS机信息')
            navigate('/app/map')
            return
          }
          
          posData = {
            ...data,
            longitude: Number(data.longitude),
            latitude: Number(data.latitude)
          } as POSMachine
        }
        
        // 权限检查
        if (!permissions.isLoading && !permissions.canEditItem(posData.created_by)) {
          toast.error('您没有权限编辑此POS机')
          navigate('/app/map')
          return
        }
        
        // 确保手续费字段有默认值
        const formDataWithDefaults = {
          ...posData,
          fees: posData.fees || DEFAULT_FEES_CONFIG
        }
        setFormData(formDataWithDefaults)
        loadAttempts() // 加载尝试记录
      } catch (error) {
        console.error('加载POS机数据失败:', error)
        toast.error('加载数据失败，请重试')
        navigate('/app/map')
      } finally {
        setLoading(false)
      }
    }

    loadPOSData()
  }, [id, posMachines, user, navigate, permissions.isLoading, permissions.canEditItem])









  const handleInputChange = (field: string, value: any) => {
    if (!formData) return
    const [mainKey, subKey] = field.split('.')

    if (subKey) {
      setFormData(prev => prev ? {
        ...prev,
        [mainKey]: {
          ...((prev as any)[mainKey] || {}),
           [subKey]: value,
        },
      } : null)
    } else {
      setFormData(prev => prev ? { ...prev, [field]: value } : null)
    }
  }

  const addCustomLink = () => {
    if (!formData) return
    setFormData(prev => prev ? {
      ...prev,
      custom_links: [...(prev.custom_links || []), { title: '', url: '', platform: 'other' }]
    } : null)
  }

  const removeCustomLink = (index: number) => {
    if (!formData) return
    setFormData(prev => prev ? {
      ...prev,
      custom_links: prev.custom_links?.filter((_, i) => i !== index) || []
    } : null)
  }

  const updateCustomLink = (index: number, field: 'title' | 'url' | 'platform', value: string) => {
    if (!formData) return
    setFormData(prev => prev ? {
      ...prev,
      custom_links: prev.custom_links?.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      ) || []
    } : null)
  }

  const validateForm = () => {
    if (!formData) return false
    
    // 快速验证：先检查最基本的字段
    if (!formData.merchant_name?.trim()) {
      toast.error('请填写商家名称')
      return false
    }
    
    if (!formData.address?.trim()) {
      toast.error('请填写详细地址')
      return false
    }
    
    // 位置验证（编辑时位置可能为空，但如果有值则需要有效）
    if ((formData.latitude !== undefined && formData.latitude !== null && formData.latitude === 0) ||
        (formData.longitude !== undefined && formData.longitude !== null && formData.longitude === 0)) {
      toast.error('请选择有效的地理位置')
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
      console.log('[EditPOS] 推荐填写字段:', warnings.join('、'))
      // 不阻止提交，只是记录日志
    }
    
    return true
  }

  const handleSave = async () => {
    if (!validateForm() || !formData || !id) return

    setSaving(true)
    try {
      console.log('[EditPOS] 更新开始，表单数据:', formData)
      
      // 延长超时时间到60秒，给用户更多填写时间
      const timeoutMs = 60000
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`更新请求超时（>${timeoutMs / 1000}s），请检查网络连接后重试`)), timeoutMs)
      )

      // 添加网络状态检查
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试')
      }

      // 显示详细的加载状态
      toast.loading('正在更新POS机信息...', { id: 'updating-pos' })

      const updatedData = { 
        ...formData, 
        updated_at: new Date().toISOString() 
      }
      
      const result = await Promise.race([
        updatePOSMachine(id, updatedData),
        timeoutPromise,
      ])
      
      console.log('[EditPOS] 更新成功，结果:', result)
      toast.dismiss('updating-pos')
      toast.success('POS机信息更新成功！')
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        navigate('/app/map')
      }, 500)
      
    } catch (error: any) {
      console.error('[EditPOS] 更新POS机失败:', error)
      toast.dismiss('updating-pos')
      
      // 更详细的错误处理
      let errorMessage = '更新失败，请重试'
      
      if (error?.message?.includes('超时')) {
        errorMessage = '更新超时，请检查网络连接后重试'
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
      setSaving(false)
    }
  }

  const loadAttempts = async () => {
    if (!id) return
    
    try {
      const { data, error } = await supabase
        .from('pos_attempts')
        .select('*')
        .eq('pos_id', id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('加载尝试记录失败:', error)
        return
      }
      
      setAttempts(data || [])
    } catch (error) {
      console.error('加载尝试记录失败:', error)
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
        toast.error('删除失败，请重试')
        return
      }
      
      // 更新本地状态
      setAttempts(prev => prev.filter(attempt => attempt.id !== attemptId))
      toast.success('尝试记录已删除')
    } catch (error) {
      console.error('删除尝试记录失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  const handleDelete = async () => {
    if (!id) return

    setDeleting(true)
    try {
      await deletePOSMachine(id)
      toast.success('POS机删除成功')
      navigate('/app/map')
    } catch (error) {
      console.error('删除POS机失败:', error)
      toast.error('删除失败，请重试')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleAttemptRecord = (result: 'success' | 'failure') => {
    setPendingAttemptResult(result)
    setCardInfo({ card_name: '', payment_method: '', card_number: '', cvv: '', expiry_date: '', cardholder_name: '', result: '', notes: '' })
    setShowCardInfoModal(true)
  }

  const submitAttemptRecord = async () => {
    if (!pendingAttemptResult || !user || !id) return
    
    try {
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
      const { error } = await supabase
        .from('pos_attempts')
        .insert({
          pos_id: id,
          user_id: user.id,
          result: pendingAttemptResult === 'success' ? 'success' : 'failure',
          card_name: cardInfo.card_name.trim() || null,
          payment_method: cardInfo.payment_method.trim() || null,
          notes: cardInfo.notes?.trim() || null,
          attempt_number: nextAttemptNumber
        })
        .select()
        .single()
      
      if (error) {
        console.error('提交尝试记录失败:', error)
        toast.error('提交失败，请重试')
        return
      }
      
      // 重新加载尝试记录
      await loadAttempts()
      
      setShowCardInfoModal(false)
      setPendingAttemptResult(null)
      setCardInfo({ card_name: '', payment_method: '', card_number: '', cvv: '', expiry_date: '', cardholder_name: '', result: '', notes: '' })
      
      toast.success(`${pendingAttemptResult === 'success' ? '成功' : '失败'}尝试已记录`)
    } catch (error) {
      console.error('提交尝试记录失败:', error)
      toast.error('提交失败，请重试')
    }
  }

  const cancelAttemptRecord = () => {
    setShowCardInfoModal(false)
    setPendingAttemptResult(null)
    setCardInfo({ card_name: '', payment_method: '', card_number: '', cvv: '', expiry_date: '', cardholder_name: '', result: '', notes: '' })
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loading size="lg" text="正在加载数据..." /></div>
  }

  if (!formData) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">POS机数据加载失败或不存在</h3>
          <AnimatedButton onClick={() => navigate('/app/map')}>返回地图</AnimatedButton>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">编辑POS机</h1>
                <p className="text-sm text-gray-500">修改POS机信息</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {permissions.canDeleteItem(formData.created_by) && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除</span>
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? '保存中...' : '保存'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="地址信息（不可编辑）"
                  disabled
                  readOnly
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BrandSelector
                  value={formData.brand_id || ''}
                  onChange={value => handleInputChange('brand_id', value)}
                  placeholder="请选择所属品牌（可选）"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatedInput
                  label="商户交易名称"
                  value={formData.merchant_info?.transaction_name || ''}
                  onChange={e => handleInputChange('merchant_info.transaction_name', e.target.value)}
                  placeholder="请输入商户交易名称"
                />
                <AnimatedInput
                  label="商户交易类型"
                  value={formData.merchant_info?.transaction_type || ''}
                  onChange={e => handleInputChange('merchant_info.transaction_type', e.target.value)}
                  placeholder="请输入商户交易类型"
                />
              </div>
            </div>
          </CardContent>
        </AnimatedCard>



        {/* 设备支持和支付功能 */}
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>设备支持和支付功能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 基本设备信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatedInput
                  label="POS机型号"
                  value={formData.basic_info.model || ''}
                  onChange={e => handleInputChange('basic_info.model', e.target.value)}
                  placeholder="请输入POS机型号"
                />
                <Select
                  label="收单机构"
                  value={formData.basic_info.acquiring_institution || ''}
                  onChange={(value) => handleInputChange('basic_info.acquiring_institution', value)}
                  placeholder="请选择收单机构"
                  options={[
                    { value: "银联商务", label: "银联商务" },
                    { value: "拉卡拉", label: "拉卡拉" },
                    { value: "收钱吧", label: "收钱吧" },
                    { value: "美团", label: "美团" },
                    { value: "富友支付", label: "富友支付" },
                    { value: "中国银行", label: "中国银行" },
                    { value: "工商银行", label: "工商银行" },
                    { value: "建设银行", label: "建设银行" },
                    { value: "交通银行", label: "交通银行" },
                    { value: "中信银行", label: "中信银行" },
                    { value: "联通沃钱包", label: "联通沃钱包" }
                  ]}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="设备状态"
                  value={formData.status || 'active'}
                  onChange={(value) => handleInputChange('status', value)}
                  placeholder="请选择设备状态"
                  options={[
                    { value: "active", label: "正常运行" },
                    { value: "inactive", label: "暂时不可用" },
                    { value: "maintenance", label: "维修中" },
                    { value: "disabled", label: "已停用" }
                  ]}
                />
                <Select
                  label="结账地点"
                  value={formData.basic_info.checkout_location || ''}
                  onChange={(value) => handleInputChange('basic_info.checkout_location', value)}
                  placeholder="请选择结账地点"
                  options={[
                    { value: "自助收银", label: "自助收银" },
                    { value: "人工收银", label: "人工收银" }
                  ]}
                />
              </div>

              {/* 卡组织支持 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">支持的卡组织</label>
                <MultiSelect
                  options={CARD_NETWORKS.map(network => ({
                    value: network.value,
                    label: getCardNetworkLabel(network.value)
                  }))}
                  value={formData.basic_info.supported_card_networks || []}
                  onChange={(value) => handleInputChange('basic_info.supported_card_networks', value)}
                  placeholder="选择支持的卡组织"
                />
              </div>

              {/* Contactless 支持 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Contactless 支持</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RadioGroup
                    name="supports_apple_pay"
                    label="Apple Pay支持"
                    value={formData.basic_info.supports_apple_pay}
                    onChange={(value) => handleInputChange('basic_info.supports_apple_pay', value)}
                    options={[
                      { value: true, label: '支持' },
                      { value: false, label: '不支持' },
                      { value: null, label: '未知' }
                    ]}
                  />
                  <RadioGroup
                    name="supports_google_pay"
                    label="Google Pay支持"
                    value={formData.basic_info.supports_google_pay}
                    onChange={(value) => handleInputChange('basic_info.supports_google_pay', value)}
                    options={[
                      { value: true, label: '支持' },
                      { value: false, label: '不支持' },
                      { value: null, label: '未知' }
                    ]}
                  />
                  <RadioGroup
                    name="supports_contactless"
                    label="实体卡 Contactless"
                    value={formData.basic_info.supports_contactless}
                    onChange={(value) => handleInputChange('basic_info.supports_contactless', value)}
                    options={[
                      { value: true, label: '支持' },
                      { value: false, label: '不支持' },
                      { value: null, label: '未知' }
                    ]}
                  />
                  <RadioGroup
                    name="supports_foreign_cards"
                    label="外卡支持"
                    value={formData.basic_info.supports_foreign_cards}
                    onChange={(value) => handleInputChange('basic_info.supports_foreign_cards', value)}
                    options={[
                      { value: true, label: '支持' },
                      { value: false, label: '不支持' },
                      { value: null, label: '未知' }
                    ]}
                  />
                  <RadioGroup
                    name="supports_hce_simulation"
                    label="HCE模拟"
                    value={formData.basic_info.supports_hce_simulation}
                    onChange={(value) => handleInputChange('basic_info.supports_hce_simulation', value)}
                    options={[
                      { value: true, label: '支持' },
                      { value: false, label: '不支持' },
                      { value: null, label: '未知' }
                    ]}
                  />
                </div>
              </div>

              {/* 收单模式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">支持收单模式</label>
                <div className="flex flex-wrap gap-4">
                  <Checkbox
                    label="DCC"
                    checked={formData.basic_info.acquiring_modes?.includes('DCC') || false}
                    onChange={(checked) => {
                      const modes = formData.basic_info.acquiring_modes || [];
                      if (checked) {
                        handleInputChange('basic_info.acquiring_modes', [...modes, 'DCC']);
                      } else {
                        handleInputChange('basic_info.acquiring_modes', modes.filter(mode => mode !== 'DCC'));
                      }
                    }}
                  />
                  <Checkbox
                    label="EDC"
                    checked={formData.basic_info.acquiring_modes?.includes('EDC') || false}
                    onChange={(checked) => {
                      const modes = formData.basic_info.acquiring_modes || [];
                      if (checked) {
                        handleInputChange('basic_info.acquiring_modes', [...modes, 'EDC']);
                      } else {
                        handleInputChange('basic_info.acquiring_modes', modes.filter(mode => mode !== 'EDC'));
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* 验证模式 */}
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>验证模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 小额免密支持 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">小额免密支持</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <MultiSelect
                      options={CARD_NETWORKS.map(network => ({
                        value: network.value,
                        label: getCardNetworkLabel(network.value)
                      }))}
                      value={formData.verification_modes?.small_amount_no_pin || []}
                      onChange={(value) => handleInputChange('verification_modes.small_amount_no_pin', value)}
                      placeholder="选择支持小额免密的卡组织"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox
                      label="不支持"
                      checked={formData.verification_modes?.small_amount_no_pin_unsupported || false}
                      onChange={(checked) => handleInputChange('verification_modes.small_amount_no_pin_unsupported', checked)}
                      size="sm"
                    />
                    <Checkbox
                      label="未确定"
                      checked={formData.verification_modes?.small_amount_no_pin_uncertain || false}
                      onChange={(checked) => handleInputChange('verification_modes.small_amount_no_pin_uncertain', checked)}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* 需要密码 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">需要密码</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <MultiSelect
                      options={CARD_NETWORKS.map(network => ({
                        value: network.value,
                        label: getCardNetworkLabel(network.value)
                      }))}
                      value={formData.verification_modes?.requires_password || []}
                      onChange={(value) => handleInputChange('verification_modes.requires_password', value)}
                      placeholder="选择需要密码验证的卡组织"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox
                      label="不支持"
                      checked={formData.verification_modes?.requires_password_unsupported || false}
                      onChange={(checked) => handleInputChange('verification_modes.requires_password_unsupported', checked)}
                      size="sm"
                    />
                    <Checkbox
                      label="未确定"
                      checked={formData.verification_modes?.requires_password_uncertain || false}
                      onChange={(checked) => handleInputChange('verification_modes.requires_password_uncertain', checked)}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* 需要签名 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">需要签名</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <MultiSelect
                      options={CARD_NETWORKS.map(network => ({
                        value: network.value,
                        label: getCardNetworkLabel(network.value)
                      }))}
                      value={formData.verification_modes?.requires_signature || []}
                      onChange={(value) => handleInputChange('verification_modes.requires_signature', value)}
                      placeholder="选择需要签名验证的卡组织"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox
                      label="不支持"
                      checked={formData.verification_modes?.requires_signature_unsupported || false}
                      onChange={(checked) => handleInputChange('verification_modes.requires_signature_unsupported', checked)}
                      size="sm"
                    />
                    <Checkbox
                      label="未确定"
                      checked={formData.verification_modes?.requires_signature_uncertain || false}
                      onChange={(checked) => handleInputChange('verification_modes.requires_signature_uncertain', checked)}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* 尝试信息 */}
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>尝试信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 统计概览 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {attempts.filter(a => a.result === 'success').length}
                  </div>
                  <div className="text-sm text-green-700 mt-1">成功次数</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {attempts.filter(a => a.result === 'failure').length}
                  </div>
                  <div className="text-sm text-red-700 mt-1">失败次数</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {attempts.length > 0 
                      ? `${Math.round((attempts.filter(a => a.result === 'success').length / attempts.length) * 100)}%`
                      : '0%'
                    }
                  </div>
                  <div className="text-sm text-blue-700 mt-1">成功率</div>
                </div>
              </div>

              {/* 尝试记录列表 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">尝试记录</h4>
                <div className="max-h-48 overflow-y-auto space-y-3 border rounded-lg p-3 bg-gray-50">
                  {attempts.length > 0 ? (
                    attempts.map((attempt, index) => (
                      <div key={attempt.id} className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              attempt.result === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {attempt.result === 'success' ? '✓ 成功' : '✗ 失败'}
                            </span>
                            <span className="text-sm text-gray-600">第{index + 1}次尝试</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {new Date(attempt.created_at).toLocaleString()}
                            </span>
                            {user && attempt.user_id === user.id && (
                              <button
                                onClick={() => deleteAttempt(attempt.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="删除记录"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">
                          记录用户: {attempt.user_id || '未知用户'}
                        </div>
                        {(attempt.card_name || attempt.payment_method) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {attempt.card_name && `卡片: ${attempt.card_name}`}
                            {attempt.card_name && attempt.payment_method && ' | '}
                            {attempt.payment_method && `支付方式: ${attempt.payment_method}`}
                          </div>
                        )}
                        {attempt.notes && (
                          <div className="text-xs text-gray-600 mt-1">
                            备注: {attempt.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      暂无尝试记录
                    </div>
                  )}
                </div>
              </div>
              
              {/* 记录按钮 */}
              <div className="flex space-x-3">
                <AnimatedButton
                  type="button"
                  onClick={() => handleAttemptRecord('success')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  <span className="mr-2">✓</span>
                  记录成功
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  onClick={() => handleAttemptRecord('failure')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  <span className="mr-2">✗</span>
                  记录失败
                </AnimatedButton>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* 付款手续费配置 */}
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>付款手续费配置</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              为不同卡组织设置手续费率，支持百分比和固定金额两种模式
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CARD_NETWORKS.map((network) => {
                const fee = formData.fees?.[network.value] || {
                  type: FeeType.PERCENTAGE,
                  value: 0,
                  currency: 'HKD',
                  enabled: false
                };
                
                return (
                  <div key={network.value} className="p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{network.label}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fee.enabled}
                          onChange={(e) => {
                            const newFees = { ...formData.fees };
                            newFees[network.value] = { ...fee, network: network.value, enabled: e.target.checked };
                            handleInputChange('fees', newFees);
                          }}
                          className="sr-only"
                        />
                        <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                          fee.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                            fee.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                      </label>
                    </div>
                    
                    {fee.enabled && (
                      <div className="space-y-3">
                        <div className="flex space-x-3">
                          <select
                            value={fee.type}
                            onChange={(e) => {
                              const newFees = { ...formData.fees };
                              newFees[network.value] = { ...fee, type: e.target.value as FeeType };
                              handleInputChange('fees', newFees);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={FeeType.PERCENTAGE}>百分比 (%)</option>
                            <option value={FeeType.FIXED}>固定金额</option>
                          </select>
                          
                          <div className="flex-1 flex space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={fee.value}
                              onChange={(e) => {
                                const newFees = { ...formData.fees };
                                newFees[network.value] = { ...fee, value: parseFloat(e.target.value) || 0 };
                                handleInputChange('fees', newFees);
                              }}
                              placeholder={fee.type === FeeType.PERCENTAGE ? "2.5" : "10.00"}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            
                            {fee.type === FeeType.FIXED && (
                              <select
                                value={fee.currency}
                                onChange={(e) => {
                                  const newFees = { ...formData.fees };
                                  newFees[network.value] = { ...fee, currency: e.target.value };
                                  handleInputChange('fees', newFees);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="HKD">HKD</option>
                                <option value="USD">USD</option>
                                <option value="CNY">CNY</option>
                                <option value="EUR">EUR</option>
                              </select>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
                          预览：{feeUtils.formatFeeValue(fee)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">配置说明：</span>
                  启用手续费后，系统将根据设置的费率计算每笔交易的手续费。百分比费率基于交易金额计算，固定金额费率为每笔交易固定收费。
                </p>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* 备注 */}
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>备注信息</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              rows={4}
              value={formData.remarks || ''}
              onChange={e => handleInputChange('remarks', e.target.value)}
              placeholder="请输入备注信息（可选）"
            />
          </CardContent>
        </AnimatedCard>

        {/* 自定义链接 */}
        <AnimatedCard variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>自定义链接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formData.custom_links?.map((link, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <AnimatedInput
                      label="链接标题"
                      value={link.title}
                      onChange={e => updateCustomLink(index, 'title', e.target.value)}
                      placeholder="例如：小红书推荐"
                    />
                  </div>
                  <div className="flex-1">
                    <AnimatedInput
                      label="链接地址"
                      value={link.url}
                      onChange={e => updateCustomLink(index, 'url', e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <AnimatedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomLink(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </AnimatedButton>
                </div>
              ))}
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={addCustomLink}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>添加链接</span>
              </AnimatedButton>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* 卡信息输入模态框 */}
      {showCardInfoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200/50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">记录尝试信息</h3>
                    <p className="text-sm text-gray-500">添加支付尝试记录</p>
                  </div>
                </div>
                <button
                  onClick={cancelAttemptRecord}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <span className="sr-only">关闭</span>
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  pendingAttemptResult === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {pendingAttemptResult === 'success' ? '✓ 成功尝试' : '✗ 失败尝试'}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    卡片名称/类型
                  </label>
                  <input
                    type="text"
                    value={cardInfo.card_name}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, card_name: e.target.value }))}
                    placeholder="例如：HSBC 汇丰 Red 信用卡"
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <Select
                    label="支付方式"
                    value={cardInfo.payment_method}
                    onChange={(value) => setCardInfo(prev => ({ ...prev, payment_method: value }))}
                    placeholder="请选择支付方式"
                    options={[
                      { value: "Apple Pay", label: "Apple Pay" },
                      { value: "Google Pay", label: "Google Pay" },
                      { value: "HCE", label: "HCE" },
                      { value: "实体卡 Tap", label: "实体卡 Tap" },
                      { value: "实体卡 Insert", label: "实体卡 Insert" },
                      { value: "实体卡 Swipe", label: "实体卡 Swipe" }
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    卡号
                  </label>
                  <input
                    type="text"
                    value={cardInfo.card_number}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, card_number: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    placeholder="输入卡号"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cardInfo.cvv}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, cvv: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    placeholder="输入CVV"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    有效期
                  </label>
                  <input
                    type="text"
                    value={cardInfo.expiry_date}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    placeholder="MM/YY"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    持卡人姓名
                  </label>
                  <input
                    type="text"
                    value={cardInfo.cardholder_name}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, cardholder_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    placeholder="输入持卡人姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    结果
                  </label>
                  <select
                    value={cardInfo.result}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, result: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">选择结果</option>
                    <option value="成功">成功</option>
                    <option value="失败">失败</option>
                    <option value="待处理">待处理</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    备注
                  </label>
                  <textarea
                    value={cardInfo.notes}
                    onChange={(e) => setCardInfo(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
                    rows={3}
                    placeholder="输入备注信息"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200/50">
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={cancelAttemptRecord}
                  className="flex-1 px-6 py-3 bg-gray-100/80 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border-gray-200"
                >
                  取消
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  onClick={submitAttemptRecord}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl border-0"
                >
                  确认记录
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatedModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">确定要删除这个POS机吗？此操作无法撤销。</p>
          <div className="flex space-x-2">
            <AnimatedButton onClick={() => setShowDeleteModal(false)} variant="outline" className="flex-1">取消</AnimatedButton>
            <AnimatedButton onClick={handleDelete} loading={deleting} variant="outline" className="flex-1 text-red-600 border-red-600 hover:bg-red-50">删除</AnimatedButton>
          </div>
        </div>
      </AnimatedModal>
      </div>
    </div>
  )
}

export default EditPOS
