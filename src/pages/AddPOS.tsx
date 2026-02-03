import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  HelpCircle,
  MapPin,
  Loader2,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { usePermissions } from '@/hooks/usePermissions'
import BrandSelector from '@/components/BrandSelector'
import SystemSelect from '@/components/ui/SystemSelect'
import SimpleMapPicker from '@/components/SimpleMapPicker'
import { CARD_NETWORKS } from '@/lib/cardNetworks'
import { locationUtils } from '@/lib/amap'
import { POSMachine, supabase } from '@/lib/supabase'
import { FeeType, FeesConfiguration, DEFAULT_FEES_CONFIG, CardNetworkFee } from '@/types/fees'
import { formatFeeDisplay } from '@/utils/feeUtils'
import { useAutoTranslatedTextMap } from '@/hooks/useAutoTranslation'
import { ThreeStateValue } from '@/components/ui/ThreeStateSelector'
import { deleteDraft, getDraft, saveDraft } from '@/lib/drafts'
import { getAlbumScopeLabel, useCardAlbumStore } from '@/stores/useCardAlbumStore'
import { getErrorDetails, notify } from '@/lib/notify'

interface FormData {
  merchant_name: string
  address: string
  latitude: number
  longitude: number
  brand_id?: string
  status?: 'active' | 'inactive' | 'maintenance' | 'disabled'
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
    acquiring_modes?: string[]
  }
  verification_modes: {
    small_amount_no_pin?: string[]
    small_amount_no_pin_unsupported?: boolean
    small_amount_no_pin_uncertain?: boolean
    small_amount_no_pin_unknown?: boolean
    requires_password?: string[]
    requires_password_unsupported?: boolean
    requires_password_uncertain?: boolean
    requires_password_unknown?: boolean
    requires_signature?: string[]
    requires_signature_unsupported?: boolean
    requires_signature_uncertain?: boolean
    requires_signature_unknown?: boolean
  }
  common_cards?: Array<{ name: string; method?: string }>
  attempts?: {
    result: 'success' | 'failure' | 'unknown'
    attempted_at?: string
    timestamp?: string
    card_network?: string
    payment_method?: 'tap' | 'insert' | 'swipe' | 'apple_pay' | 'google_pay' | 'hce'
    cvm?: 'no_pin' | 'pin' | 'signature' | 'unknown'
    acquiring_mode?: 'DCC' | 'EDC' | 'unknown'
    device_status?: 'active' | 'inactive' | 'maintenance' | 'disabled'
    acquiring_institution?: string
    checkout_location?: '自助收银' | '人工收银'
    card_name?: string
    notes?: string
    is_conclusive_failure?: boolean
  }[]
  extended_fields: Record<string, any>
  remarks?: string
  custom_links?: Array<{ title: string; url: string; platform: string }>
  fees?: FeesConfiguration
}

type TapMethod = 'card' | 'apple' | 'google' | 'hce'
type TapState = 'yes' | 'no' | 'unknown'
type SchemeID = typeof CARD_NETWORKS[number]['value']

type CvmTab = 'noPin' | 'pin' | 'signature'
const CVM_FLAGS = ['unsupported', 'uncertain', 'unknown'] as const
type CvmFlag = (typeof CVM_FLAGS)[number]

const SCHEME_COLOR_MAP: Partial<Record<SchemeID, string>> = {
  visa: 'bg-[#1A1F71]',
  mastercard: 'bg-[#EB001B]',
  unionpay: 'bg-[#00537F]',
  amex: 'bg-[#2E77BB]',
  amex_cn: 'bg-[#2E77BB]',
  mastercard_cn: 'bg-[#EB001B]',
  jcb: 'bg-[#1F2F5D]',
  discover: 'bg-[#F97316]',
  diners: 'bg-[#7C3AED]',
}

const tapStateOrder: TapState[] = ['yes', 'no', 'unknown']

const CVM_FIELD_MAP: Record<CvmTab, keyof FormData['verification_modes']> = {
  noPin: 'small_amount_no_pin',
  pin: 'requires_password',
  signature: 'requires_signature',
}

const CVM_FLAG_MAP: Record<
  CvmTab,
  {
    unsupported: keyof FormData['verification_modes']
    uncertain: keyof FormData['verification_modes']
    unknown: keyof FormData['verification_modes']
  }
> = {
  noPin: {
    unsupported: 'small_amount_no_pin_unsupported',
    uncertain: 'small_amount_no_pin_uncertain',
    unknown: 'small_amount_no_pin_unknown',
  },
  pin: {
    unsupported: 'requires_password_unsupported',
    uncertain: 'requires_password_uncertain',
    unknown: 'requires_password_unknown',
  },
  signature: {
    unsupported: 'requires_signature_unsupported',
    uncertain: 'requires_signature_uncertain',
    unknown: 'requires_signature_unknown',
  },
}

const ADD_POS_TEXTS = {
  navTitle: '添加POS机',
  pickLocationButton: '在地图上选择位置',
  reselectLocationButton: '重新选择位置',
  merchantNameLabel: '商户名称 *',
  addressLabel: '地址 *',
  coordinatesLabel: '位置',
  transactionNameLabel: '交易票面名称',
  transactionTypeLabel: 'MCC代码或行业',
  deviceStatusLabel: '设备状态',
  checkoutLocationLabel: '收银区域',
  acquiringInstitutionLabel: '收单机构',
  posModelLabel: 'POS型号',
  tapSupportLabel: 'Tap & Pay 支持',
  cvmTitle: '验证模式 (CVM)',
  remarksTitle: '内部备注',
  customLinksTitle: '自定义链接',
  addLinkButton: '添加链接',
  submitButton: '提交',
  nextButton: '下一步',
  backButton: '返回',
  mapPrefillNotice: '已根据地图选定位置，无需再次选择，直接填写表单即可',
  mapPrefillAddressLoading: '正在解析地址…',
  mapPrefillAddressFailed: '自动获取地址失败，请手动填写地址',
} as const

const tapToThreeState = (state: TapState): ThreeStateValue => {
  if (state === 'yes') return 'supported'
  if (state === 'no') return 'unsupported'
  return 'unknown'
}

const threeStateToTap = (value?: ThreeStateValue): TapState => {
  if (value === 'supported') return 'yes'
  if (value === 'unsupported') return 'no'
  return 'unknown'
}

const ensureFees = (fees?: FeesConfiguration): FeesConfiguration => {
  if (fees && Object.keys(fees).length) {
    return fees
  }
  return { ...DEFAULT_FEES_CONFIG }
}

const AddPOS = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { addPOSMachine } = useMapStore()
  const albumCards = useCardAlbumStore((state) => state.cards)
  const _permissions = usePermissions()
  const uiText = useAutoTranslatedTextMap(ADD_POS_TEXTS)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [isBillDetailsOpen, setIsBillDetailsOpen] = useState(false)
  const [activeCvmTab, setActiveCvmTab] = useState<CvmTab>('noPin')
  const [cardNetworkStates, setCardNetworkStates] = useState<Partial<Record<SchemeID, ThreeStateValue>>>({})
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [prefilledFromQuery, setPrefilledFromQuery] = useState(false)
  const [isPrefillAddressLoading, setIsPrefillAddressLoading] = useState(false)
  const [isAlbumPickerOpen, setIsAlbumPickerOpen] = useState(false)
  const [albumScopeFilter, setAlbumScopeFilter] = useState<'personal' | 'public'>('personal')
  const [selectedAlbumCard, setSelectedAlbumCard] = useState('')
  const [touchedFields, setTouchedFields] = useState({
    merchant_name: false,
    address: false,
    location: false,
  })
  const lastValidationToast = useRef<Record<string, string>>({})
  const submittingRef = useRef(false)

  const getFieldError = (field: keyof typeof touchedFields) =>
    touchedFields[field] ? validationErrors[field] : ''

  const [formData, setFormData] = useState<FormData>({
    merchant_name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    status: 'active',
    merchant_info: {
      transaction_name: '',
      transaction_type: '',
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
      acquiring_modes: [],
    },
    verification_modes: {
      small_amount_no_pin: [],
      small_amount_no_pin_unsupported: false,
      small_amount_no_pin_uncertain: false,
      small_amount_no_pin_unknown: false,
      requires_password: [],
      requires_password_unsupported: false,
      requires_password_uncertain: false,
      requires_password_unknown: false,
      requires_signature: [],
      requires_signature_unsupported: false,
      requires_signature_uncertain: false,
      requires_signature_unknown: false,
    },
    attempts: [],
    extended_fields: {},
    remarks: '',
    custom_links: [],
    fees: ensureFees(DEFAULT_FEES_CONFIG),
    common_cards: [],
  })

  const clearAdvancedSelections = () => {
    handleInputChange('basic_info.supported_card_networks', [])
    handleInputChange('basic_info.supports_contactless', 'unknown')
    handleInputChange('basic_info.supports_apple_pay', 'unknown')
    handleInputChange('basic_info.supports_google_pay', 'unknown')
    handleInputChange('basic_info.supports_hce_simulation', 'unknown')
    handleInputChange('verification_modes.small_amount_no_pin', [])
    handleInputChange('verification_modes.small_amount_no_pin_unsupported', false)
    handleInputChange('verification_modes.small_amount_no_pin_uncertain', false)
    handleInputChange('verification_modes.small_amount_no_pin_unknown', false)
    handleInputChange('verification_modes.requires_password', [])
    handleInputChange('verification_modes.requires_password_unsupported', false)
    handleInputChange('verification_modes.requires_password_uncertain', false)
    handleInputChange('verification_modes.requires_password_unknown', false)
    handleInputChange('verification_modes.requires_signature', [])
    handleInputChange('verification_modes.requires_signature_unsupported', false)
    handleInputChange('verification_modes.requires_signature_uncertain', false)
    handleInputChange('verification_modes.requires_signature_unknown', false)
  }

  useEffect(() => {
    console.log('[AddPOS] step changed:', step)
  }, [step])

  useEffect(() => {
    const draftId = searchParams.get('draftId')
    if (!draftId) return
    const draft = getDraft<{ formData: FormData; step?: number }>(draftId)
    if (draft?.data?.formData) {
      const payload = draft.data.formData as FormData
      setFormData({
        ...payload,
        fees: ensureFees(payload.fees),
      })
      setStep(Math.min(draft.data.step || 1, 5))
      setCurrentDraftId(draft.id)
      notify.success('已加载草稿')
    } else {
      notify.error('草稿不存在或已过期')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    const addressFromQuery = searchParams.get('address')
    const hasDraft = Boolean(searchParams.get('draftId'))
    let cancelled = false

    if (prefilledFromQuery || hasDraft) return
    if (!latParam || !lngParam) return

    const lat = Number(latParam)
    const lng = Number(lngParam)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const fallbackAddress = addressFromQuery || ''

    setPrefilledFromQuery(true)
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: prev.address || fallbackAddress,
    }))
    notify.success(uiText.mapPrefillNotice)
    setIsPrefillAddressLoading(true)

    // 尝试反查地址，提升表单自动填充体验
    locationUtils
      .getAddress(lng, lat)
      .then((resolved) => {
        if (cancelled || !resolved) return
        setFormData((prev) => {
          if (prev.latitude !== lat || prev.longitude !== lng) {
            return prev
          }
          return {
            ...prev,
            address:
              prev.address && prev.address !== fallbackAddress ? prev.address : resolved || fallbackAddress,
          }
        })
      })
      .catch((error) => {
        console.warn('[AddPOS] 解析地址失败:', error)
        if (!cancelled) {
          notify.error(uiText.mapPrefillAddressFailed)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPrefillAddressLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [searchParams, prefilledFromQuery, uiText.mapPrefillAddressFailed, uiText.mapPrefillNotice])

  useEffect(() => {
    const supported = formData.basic_info.supported_card_networks || []
    setCardNetworkStates((prev) => {
      const next: Partial<Record<SchemeID, ThreeStateValue>> = { ...prev }
      CARD_NETWORKS.forEach((scheme) => {
        const id = scheme.value as SchemeID
        if (supported.includes(id)) {
          next[id] = 'supported'
        } else if (!next[id]) {
          next[id] = 'unknown'
        }
      })
      return next
    })
  }, [formData.basic_info.supported_card_networks])

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    if (!formData.merchant_name?.trim()) {
      errors.merchant_name = '请填写商家名称'
    }
    if (!formData.address?.trim()) {
      errors.address = '请填写详细地址'
    }
    if (!formData.latitude || !formData.longitude || formData.latitude === 0 || formData.longitude === 0) {
      errors.location = '请在地图上选择准确位置'
    }
    return errors
  }, [formData.address, formData.latitude, formData.longitude, formData.merchant_name])

  useEffect(() => {
    Object.entries(validationErrors).forEach(([field, message]) => {
      if (!message && lastValidationToast.current[field]) {
        delete lastValidationToast.current[field]
      }
    })
  }, [validationErrors])

  const markTouched = (field: keyof typeof touchedFields) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  const syncSupportedNetworks = (states: Partial<Record<SchemeID, ThreeStateValue>>) => {
    const supported = Object.entries(states)
      .filter(([, status]) => status === 'supported')
      .map(([schemeId]) => schemeId as SchemeID)
    handleInputChange('basic_info.supported_card_networks', supported)
  }

  const getSchemeState = (schemeId: SchemeID): ThreeStateValue => cardNetworkStates[schemeId] || 'unknown'

  const handleInputChange = (field: string, value: any) => {
    try {
      setFormData((prev) => {
        if (field.includes('.')) {
          const [parent, child] = field.split('.')
          return {
            ...prev,
            [parent]: {
              ...(prev[parent as keyof FormData] as any),
              [child]: value,
            },
          }
        }
        return { ...prev, [field]: value }
      })
    } catch (error) {
      console.error('Error updating form data:', error)
      notify.critical('更新表单数据时出错', {
        title: '表单异常',
        details: getErrorDetails(error),
      })
    }
  }

  const addCustomLink = () => {
    setFormData((prev) => ({
      ...prev,
      custom_links: [...(prev.custom_links || []), { title: '', url: '', platform: '' }],
    }))
  }

  const removeCustomLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      custom_links: prev.custom_links?.filter((_, i) => i !== index) || [],
    }))
  }

  const updateCustomLink = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      custom_links:
        prev.custom_links?.map((link, i) => (i === index ? { ...link, [field]: value } : link)) || [],
    }))
  }

  const validateForm = () => {
    setTouchedFields((prev) => ({
      ...prev,
      merchant_name: true,
      address: true,
      location: true,
    }))
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0]
      if (firstError) {
        notify.error(firstError)
      }
      Object.entries(validationErrors).forEach(([field, message]) => {
        if (message) {
          lastValidationToast.current[field] = message
        }
      })
      return false
    }

    const warnings: string[] = []
    if (!formData.basic_info?.model?.trim()) warnings.push('设备型号')
    if (!formData.basic_info?.acquiring_institution?.trim()) warnings.push('收单机构')
    if (!formData.merchant_info?.transaction_name?.trim()) warnings.push('交易名称')

    if (warnings.length > 0) {
      console.log('[AddPOS] 推荐填写字段:', warnings.join('、'))
    }
    return true
  }

  const handleLocationConfirm = (latitude: number, longitude: number, address?: string) => {
    setPrefilledFromQuery(false)
    setIsPrefillAddressLoading(false)
    markTouched('location')
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
      address: address?.trim() || prev.address || '',
    }))
    notify.success('位置选择成功')
  }

  const handleSubmit = async () => {
    if (loading || submittingRef.current) return
    if (!validateForm()) return

    submittingRef.current = true
    setLoading(true)
    try {
      const timeoutMs = 60000
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`保存请求超时（>${timeoutMs / 1000}s），请检查网络连接后重试`)), timeoutMs)
      )

      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试')
      }

      notify.loading('正在保存POS机信息...', { id: 'saving-pos' })

      const payload = {
        ...formData,
        status: formData.status || 'active',
        basic_info: {
          ...formData.basic_info,
          supports_apple_pay: formData.basic_info.supports_apple_pay === 'supported',
          supports_google_pay: formData.basic_info.supports_google_pay === 'supported',
          supports_contactless: formData.basic_info.supports_contactless === 'supported',
          supports_hce_simulation: formData.basic_info.supports_hce_simulation === 'supported',
        },
      }

      const { attempts: _attempts, ...posPayload } = payload
      const result = await Promise.race([addPOSMachine(posPayload), timeoutPromise]) as POSMachine

      const attemptsPayload = (formData.attempts || []).map((attempt, index) => ({
        pos_id: result.id,
        user_id: user?.id || null,
        attempt_number: index + 1,
        result: attempt.result,
        card_network: attempt.card_network || null,
        payment_method: attempt.payment_method || null,
        cvm: attempt.cvm || 'unknown',
        acquiring_mode: attempt.acquiring_mode || 'unknown',
        device_status: attempt.device_status || payload.status || 'active',
        acquiring_institution: attempt.acquiring_institution?.trim() || null,
        checkout_location: attempt.checkout_location || payload.basic_info.checkout_location || null,
        card_name: attempt.card_name?.trim() || null,
        notes: attempt.notes?.trim() || null,
        attempted_at: attempt.attempted_at || attempt.timestamp || null,
        is_conclusive_failure: attempt.is_conclusive_failure || false,
      }))

      if (attemptsPayload.length > 0) {
        const { error: attemptsError } = await supabase
          .from('pos_attempts')
          .insert(attemptsPayload)

        if (attemptsError) {
          console.error('[AddPOS] 保存尝试记录失败:', attemptsError)
          notify.error('POS 已创建，但尝试记录保存失败')
        }
      }


      console.log('[AddPOS] 提交成功，结果:', result)
      notify.dismiss('saving-pos')
      notify.success('POS机添加成功！')
      if (currentDraftId) {
        deleteDraft(currentDraftId)
      }
      setTimeout(() => navigate('/app/map'), 500)
    } catch (error: any) {
      console.error('[AddPOS] 添加POS机失败:', error)
      notify.dismiss('saving-pos')
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
      notify.critical(errorMessage, {
        title: 'POS 机添加失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  const cycleSchemeState = (schemeId: SchemeID) => {
    const order: ThreeStateValue[] = ['supported', 'unsupported', 'unknown']
    const current = getSchemeState(schemeId)
    const nextState = order[(order.indexOf(current) + 1) % order.length]
    const nextStates: Partial<Record<SchemeID, ThreeStateValue>> = { ...cardNetworkStates, [schemeId]: nextState }
    setCardNetworkStates(nextStates)
    syncSupportedNetworks(nextStates)
  }

  const cycleTapState = (method: TapMethod) => {
    const current: TapState = (() => {
      switch (method) {
        case 'card':
          return threeStateToTap(formData.basic_info.supports_contactless)
        case 'apple':
          return threeStateToTap(formData.basic_info.supports_apple_pay)
        case 'google':
          return threeStateToTap(formData.basic_info.supports_google_pay)
        case 'hce':
        default:
          return threeStateToTap(formData.basic_info.supports_hce_simulation)
      }
    })()
    const nextState = tapStateOrder[(tapStateOrder.indexOf(current) + 1) % tapStateOrder.length]
    const mapped = tapToThreeState(nextState)
    switch (method) {
      case 'card':
        handleInputChange('basic_info.supports_contactless', mapped)
        break
      case 'apple':
        handleInputChange('basic_info.supports_apple_pay', mapped)
        break
      case 'google':
        handleInputChange('basic_info.supports_google_pay', mapped)
        break
      case 'hce':
      default:
        handleInputChange('basic_info.supports_hce_simulation', mapped)
        break
    }
  }

  const addAttemptRow = () => {
    setFormData((prev) => ({
      ...prev,
      attempts: [
        ...(prev.attempts || []),
        {
          result: 'success',
          attempted_at: new Date().toISOString(),
          card_network: '',
          payment_method: 'tap',
          cvm: 'unknown',
          acquiring_mode: 'unknown',
          device_status: prev.status || 'active',
          acquiring_institution: prev.basic_info.acquiring_institution || '',
          checkout_location: prev.basic_info.checkout_location,
          card_name: '',
          notes: '',
          is_conclusive_failure: false,
        },
      ],
    }))
  }

  const getAttemptMethodLabel = (method: NonNullable<FormData['attempts']>[number]['payment_method']) => {
    switch (method) {
      case 'tap':
        return '实体卡 Tap'
      case 'insert':
        return '实体卡 Insert'
      case 'swipe':
        return '实体卡 Swipe'
      case 'apple_pay':
        return 'Apple Pay'
      case 'google_pay':
        return 'Google Pay'
      case 'hce':
        return 'HCE'
      default:
        return ''
    }
  }

  const updateAttempt = (index: number, field: keyof NonNullable<FormData['attempts']>[number], value: any) => {
    setFormData((prev) => ({
      ...prev,
      attempts: prev.attempts?.map((attempt, i) => (i === index ? { ...attempt, [field]: value } : attempt)) || [],
    }))
  }

  const removeAttempt = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attempts: prev.attempts?.filter((_, i) => i !== index) || [],
    }))
  }

  const saveAttemptAsCommonCard = (index: number) => {
    const attempt = formData.attempts?.[index]
    if (!attempt) return
    const name = attempt.card_name?.trim()
    const method = attempt.payment_method
    if (!name && !method) {
      notify.error('请先填写卡片名称或支付方式再保存')
      return
    }
    const methodLabel = method ? getAttemptMethodLabel(method) : ''
    setFormData((prev) => {
      const existing = prev.common_cards || []
      const exists = existing.some((item) => item.name === (name || '') && item.method === (methodLabel || ''))
      if (exists) {
        notify.success('已在常用卡片列表中')
        return prev
      }
      notify.success('常用卡片已保存')
      return {
        ...prev,
        common_cards: [...existing, { name: name || methodLabel || '未命名卡片', method: methodLabel }],
      }
    })
  }

  const applyCommonCard = (index: number, cardIndex: number) => {
    const card = formData.common_cards?.[cardIndex]
    if (!card) return
    updateAttempt(index, 'card_name', card.name)
    updateAttempt(index, 'notes', card.method || '')
  }

  const handleSaveDraft = () => {
    if (!formData.latitude || !formData.longitude) {
      notify.error('请先在地图上选择位置再保存草稿')
      return
    }
    const title = formData.merchant_name?.trim() || formData.address || `${formData.latitude.toFixed(4)},${formData.longitude.toFixed(4)}`
    const record = saveDraft({
      id: currentDraftId || undefined,
      title,
      data: { formData, step },
      step,
    })
    setCurrentDraftId(record.id)
    notify.success('草稿已保存')
  }

  const selectedSchemes =
    Object.keys(cardNetworkStates).length > 0
      ? (Object.entries(cardNetworkStates)
          .filter(([, status]) => status === 'supported')
          .map(([schemeId]) => schemeId as SchemeID))
      : formData.basic_info.supported_card_networks || []

  const toggleCvmScheme = (schemeId: SchemeID) => {
    if (getSchemeState(schemeId) !== 'supported') {
      notify.error('请先将该卡组织标记为支持')
      return
    }
    const field = CVM_FIELD_MAP[activeCvmTab]
    const list = (formData.verification_modes[field] as string[]) || []
    const exists = list.includes(schemeId)
    const updated = exists ? list.filter((id) => id !== schemeId) : [...list, schemeId]
    handleInputChange(`verification_modes.${field}`, updated)
  }

  const updateFeeConfig = (schemeId: string, updater: (fee: CardNetworkFee) => CardNetworkFee) => {
    const currentFees = ensureFees(formData.fees)
    const nextFees: FeesConfiguration = { ...currentFees }
    const targetFee = nextFees[schemeId] || {
      network: schemeId,
      type: FeeType.PERCENTAGE,
      value: 0,
      enabled: false,
    }
    nextFees[schemeId] = updater(targetFee)
    handleInputChange('fees', nextFees)
  }

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3, 4, 5].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step ? 'w-8 bg-accent-yellow' : s < step ? 'w-8 bg-accent-salmon' : 'w-2 bg-gray-200'
          }`}
        />
      ))}
      <div className="ml-auto text-sm font-bold text-gray-400">Step {step}/5</div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{uiText.merchantNameLabel}</label>
          <input
            type="text"
            className="w-full bg-cream rounded-xl px-4 py-3 text-soft-black font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
            placeholder="e.g. Starbucks Coffee"
            value={formData.merchant_name}
            onChange={(e) => {
              markTouched('merchant_name')
              handleInputChange('merchant_name', e.target.value)
            }}
            onBlur={() => markTouched('merchant_name')}
          />
          {getFieldError('merchant_name') && (
            <p className="mt-2 text-xs text-red-600">{getFieldError('merchant_name')}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{uiText.addressLabel}</label>
          <div className="relative">
            <input
              type="text"
              className="w-full bg-cream rounded-xl px-4 py-3 text-soft-black font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow/20 pr-12"
              placeholder="Search address..."
              value={formData.address}
              onChange={(e) => {
                markTouched('address')
                handleInputChange('address', e.target.value)
              }}
              onBlur={() => markTouched('address')}
            />
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          {getFieldError('address') && (
            <p className="mt-2 text-xs text-red-600">{getFieldError('address')}</p>
          )}
          {formData.latitude !== 0 && formData.longitude !== 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-accent-salmon font-bold bg-green-50 p-2 rounded-lg w-fit">
              <CheckCircle className="w-3 h-3" />
              {uiText.coordinatesLabel}: {formData.address?.trim() || '请填写详细地址'}
            </div>
          )}
        </div>

        <button
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-accent-yellow hover:text-accent-yellow transition-all flex items-center justify-center gap-2"
          onClick={() => {
            markTouched('location')
            setShowLocationModal(true)
          }}
        >
          <MapPin className="w-4 h-4" />
          {formData.latitude && formData.longitude ? uiText.reselectLocationButton : uiText.pickLocationButton}
        </button>
        {getFieldError('location') && (
          <p className="mt-2 text-xs text-red-600">{getFieldError('location')}</p>
        )}

        {prefilledFromQuery && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <CheckCircle className="w-4 h-4 mt-[2px] text-blue-600" />
            <div className="space-y-1">
              <div className="font-semibold">{uiText.mapPrefillNotice}</div>
              {isPrefillAddressLoading && (
                <div className="flex items-center gap-2 text-[11px] text-blue-700">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{uiText.mapPrefillAddressLoading}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsBillDetailsOpen(!isBillDetailsOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="font-bold text-sm text-soft-black">更多账单设置</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isBillDetailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {isBillDetailsOpen && (
          <div className="p-4 bg-cream space-y-3 border-t border-gray-100">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{uiText.transactionNameLabel}</label>
              <input
                type="text"
                className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                placeholder="STARBUCKS #1024"
                value={formData.merchant_info.transaction_name}
                onChange={(e) => handleInputChange('merchant_info.transaction_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{uiText.transactionTypeLabel}</label>
              <input
                type="text"
                className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                placeholder="5411 - Grocery Stores"
                value={formData.merchant_info.transaction_type}
                onChange={(e) => handleInputChange('merchant_info.transaction_type', e.target.value)}
              />
            </div>
            <BrandSelector
              value={formData.brand_id || ''}
              onChange={(value) => handleInputChange('brand_id', value)}
              placeholder="选择品牌 (可选)"
            />
          </div>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-soft-black">尝试记录</h3>
          <p className="text-xs text-gray-500 mt-1">填写成功/失败的支付尝试，系统会据此推导支持情况。</p>
        </div>
        <button
          type="button"
          onClick={addAttemptRow}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-cream text-soft-black hover:bg-accent-yellow/20 transition-colors"
        >
          + 添加记录
        </button>
      </div>

      {(formData.attempts || []).length === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 bg-white">
          还没有添加尝试记录，点击“添加记录”开始填写。
        </div>
      )}

      {formData.attempts && formData.attempts.length > 0 && albumCards.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <div className="text-xs font-semibold text-gray-500">从卡册选择</div>
            <p className="text-[11px] text-gray-400 mt-1">选择卡片后会自动填充到最新一条尝试记录。</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAlbumPickerOpen(true)}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-soft-black bg-cream hover:bg-accent-yellow/20 transition-colors flex items-center justify-between"
            >
              <span>{selectedAlbumCardLabel || '从卡册中选择卡片'}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-soft-black bg-cream hover:bg-accent-yellow/20 transition-colors"
              onClick={handleApplyAlbumCard}
            >
              填充到最新记录
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {formData.attempts?.map((attempt, index) => (
          <div key={index} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-gray-500">尝试 {index + 1}</div>
              <button
                type="button"
                onClick={() => removeAttempt(index)}
                className="text-red-500 text-xs font-bold hover:text-red-600"
              >
                删除
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">结果</label>
                <select
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.result}
                  onChange={(e) => updateAttempt(index, 'result', e.target.value as 'success' | 'failure' | 'unknown')}
                >
                  <option value="success">成功</option>
                  <option value="failure">失败</option>
                  <option value="unknown">未知</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">发生时间</label>
                <input
                  type="datetime-local"
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.attempted_at ? attempt.attempted_at.slice(0, 16) : ''}
                  onChange={(e) => updateAttempt(index, 'attempted_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">卡组织</label>
                <select
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.card_network || ''}
                  onChange={(e) => updateAttempt(index, 'card_network', e.target.value)}
                >
                  <option value="">请选择</option>
                  {CARD_NETWORKS.map((scheme) => (
                    <option key={scheme.value} value={scheme.value}>{scheme.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">支付方式</label>
                <select
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.payment_method || ''}
                  onChange={(e) => updateAttempt(index, 'payment_method', e.target.value as NonNullable<FormData['attempts']>[number]['payment_method'])}
                >
                  <option value="">请选择</option>
                  <option value="tap">实体卡 Tap</option>
                  <option value="insert">实体卡 Insert</option>
                  <option value="swipe">实体卡 Swipe</option>
                  <option value="apple_pay">Apple Pay</option>
                  <option value="google_pay">Google Pay</option>
                  <option value="hce">HCE</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">验证方式 (CVM)</label>
                <select
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.cvm || 'unknown'}
                  onChange={(e) => updateAttempt(index, 'cvm', e.target.value as NonNullable<FormData['attempts']>[number]['cvm'])}
                >
                  <option value="unknown">未知</option>
                  <option value="no_pin">免密</option>
                  <option value="pin">PIN</option>
                  <option value="signature">签名</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">收单模式</label>
                <select
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.acquiring_mode || 'unknown'}
                  onChange={(e) => updateAttempt(index, 'acquiring_mode', e.target.value as NonNullable<FormData['attempts']>[number]['acquiring_mode'])}
                >
                  <option value="unknown">未知</option>
                  <option value="DCC">DCC</option>
                  <option value="EDC">EDC</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">设备状态</label>
                <SystemSelect
                  dataType="device_status"
                  value={attempt.device_status || 'active'}
                  onChange={(value) => updateAttempt(index, 'device_status', value as NonNullable<FormData['attempts']>[number]['device_status'])}
                  placeholder="请选择设备状态"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">收单机构</label>
                <SystemSelect
                  dataType="acquiring_institution"
                  value={attempt.acquiring_institution || ''}
                  onChange={(value) => updateAttempt(index, 'acquiring_institution', value)}
                  placeholder="请选择收单机构"
                  allowCustom
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">结账地点</label>
                <SystemSelect
                  dataType="checkout_locations"
                  value={attempt.checkout_location || ''}
                  onChange={(value) => updateAttempt(index, 'checkout_location', value as NonNullable<FormData['attempts']>[number]['checkout_location'])}
                  placeholder="请选择结账地点"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">卡片名称</label>
                <input
                  type="text"
                  className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                  value={attempt.card_name || ''}
                  onChange={(e) => updateAttempt(index, 'card_name', e.target.value)}
                  placeholder="如 Visa Signature"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">备注</label>
              <input
                type="text"
                className="w-full bg-cream rounded-lg px-3 py-2 text-sm"
                value={attempt.notes || ''}
                onChange={(e) => updateAttempt(index, 'notes', e.target.value)}
                placeholder="例如：需要签名，或被拒原因"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveAttemptAsCommonCard(index)}
                  className="text-xs font-semibold text-soft-black bg-cream px-3 py-1.5 rounded-lg hover:bg-accent-yellow/20 transition-colors"
                >
                  保存为常用卡
                </button>
                {formData.common_cards && formData.common_cards.length > 0 && (
                  <select
                    className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1"
                    defaultValue=""
                    onChange={(e) => {
                      const selected = parseInt(e.target.value, 10)
                      if (!Number.isNaN(selected)) applyCommonCard(index, selected)
                    }}
                  >
                    <option value="">快速填充常用卡</option>
                    {formData.common_cards.map((card, cardIndex) => (
                      <option key={`${card.name}-${cardIndex}`} value={cardIndex}>
                        {card.name}{card.method ? ` · ${card.method}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <input
                id={`attempt-conclusive-${index}`}
                type="checkbox"
                checked={Boolean(attempt.is_conclusive_failure)}
                onChange={(e) => updateAttempt(index, 'is_conclusive_failure', e.target.checked)}
              />
              <label htmlFor={`attempt-conclusive-${index}`}>
                明确失败（会被计入“不支持”推导）
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4 animate-fade-in-up">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-soft-black">高级选项（可选）</h3>
            <p className="text-xs text-gray-500 mt-1">手动指定支持项，用于补充尝试记录未覆盖的信息。</p>
          </div>
          <button
            type="button"
            onClick={() => setAdvancedOptionsOpen((prev) => !prev)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-cream text-soft-black hover:bg-accent-yellow/20 transition-colors"
          >
            {advancedOptionsOpen ? '收起' : '展开'}
          </button>
        </div>
        {advancedOptionsOpen && (
          <div className="mt-4 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3">支持的卡组织</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CARD_NETWORKS.map((scheme) => {
                  const id = scheme.value as SchemeID
                  const state = getSchemeState(id)
                  const isSupported = state === 'supported'
                  const isUnsupported = state === 'unsupported'
                  const color = SCHEME_COLOR_MAP[id] || 'bg-gray-500'
                  return (
                    <button
                      key={scheme.value}
                      onClick={() => cycleSchemeState(id)}
                      type="button"
                      className={`relative overflow-hidden h-14 rounded-2xl border transition-all duration-300 flex items-center justify-between px-4 group ${
                        isSupported
                          ? `${color} border-transparent shadow-lg scale-[1.02]`
                          : isUnsupported
                          ? 'bg-red-50 border-red-100 text-red-500 hover:border-red-200'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {isSupported && <div className="absolute -right-4 -bottom-6 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>}
                      <span className={`font-bold text-sm tracking-wide ${isSupported ? 'text-white' : isUnsupported ? 'text-red-500' : 'text-gray-500'}`}>
                        {scheme.label}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSupported
                            ? 'bg-white/20 text-white'
                            : isUnsupported
                            ? 'bg-red-100 text-red-500'
                            : 'bg-gray-100 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{uiText.tapSupportLabel}</label>
              <div className="grid grid-cols-4 gap-2">
                {(['card', 'apple', 'google', 'hce'] as TapMethod[]).map((method) => {
                  const state = (() => {
                    switch (method) {
                      case 'card':
                        return threeStateToTap(formData.basic_info.supports_contactless)
                      case 'apple':
                        return threeStateToTap(formData.basic_info.supports_apple_pay)
                      case 'google':
                        return threeStateToTap(formData.basic_info.supports_google_pay)
                      case 'hce':
                      default:
                        return threeStateToTap(formData.basic_info.supports_hce_simulation)
                    }
                  })()
                  let color = 'bg-gray-100 text-gray-400'
                  let icon = <HelpCircle className="w-4 h-4" />
                  if (state === 'yes') {
                    color = 'bg-green-100 text-green-600 ring-1 ring-green-200'
                    icon = <Check className="w-4 h-4" />
                  } else if (state === 'no') {
                    color = 'bg-red-50 text-red-400'
                    icon = <X className="w-4 h-4" />
                  }
                  return (
                    <div
                      key={method}
                      onClick={() => cycleTapState(method)}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95 ${color}`}
                    >
                      {method === 'card' && <CreditCard className="w-5 h-5" />}
                      {method === 'apple' && <div className="text-lg font-bold"></div>}
                      {method === 'google' && <span className="font-bold text-sm">G</span>}
                      {method === 'hce' && <Smartphone className="w-5 h-5" />}
                      <div className="mt-1">{icon}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{uiText.cvmTitle}</label>
              <div className="bg-cream rounded-2xl p-1 flex gap-1">
                {(['noPin', 'pin', 'signature'] as CvmTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCvmTab(tab)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                      activeCvmTab === tab ? 'bg-white shadow-sm text-soft-black' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'noPin' ? 'No PIN' : tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                <p className="text-[10px] text-gray-400">
                  选择支持 <span className="font-bold text-soft-black uppercase">{activeCvmTab === 'noPin' ? 'No PIN' : activeCvmTab}</span> 的卡组织：
                </p>
                <div className="flex flex-wrap gap-3">
                  {selectedSchemes.length === 0 && <span className="text-xs text-gray-300 italic">请先选择支持的卡组织</span>}
                  {selectedSchemes.map((schemeId) => {
                    const scheme = CARD_NETWORKS.find((s) => s.value === schemeId)
                    const isActive = ((formData.verification_modes[CVM_FIELD_MAP[activeCvmTab]] as string[]) || []).includes(
                      schemeId
                    )
                    const color = SCHEME_COLOR_MAP[schemeId as SchemeID] || 'bg-gray-500'
                    return (
                      <button
                        key={schemeId}
                        type="button"
                        onClick={() => toggleCvmScheme(schemeId as SchemeID)}
                        className={`w-12 h-9 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                          isActive ? `${color} text-white shadow-md scale-105` : 'bg-gray-100 text-gray-400 grayscale opacity-50'
                        }`}
                      >
                        {scheme?.label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 text-[10px]">
                  {CVM_FLAGS.map((flag: CvmFlag) => {
                    const flagKey = CVM_FLAG_MAP[activeCvmTab][flag]
                    const enabled = Boolean(formData.verification_modes[flagKey])
                    return (
                      <button
                        key={flag}
                        onClick={() => handleInputChange(`verification_modes.${flagKey}`, !enabled)}
                        className={`px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide transition-colors ${
                          enabled
                            ? flag === 'unsupported'
                              ? 'bg-red-100 text-red-600'
                              : flag === 'uncertain'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {flag === 'unsupported' ? '不支持' : flag === 'uncertain' ? '不确定' : '未知'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-cream/70 px-4 py-3">
              <span className="text-xs text-gray-500">清空高级选项手动选择</span>
              <button
                type="button"
                onClick={clearAdvancedSelections}
                className="text-xs font-semibold text-gray-600 hover:text-red-500"
              >
                重置
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {selectedSchemes.length === 0 && <p className="text-sm text-gray-400">请先选择支持的卡组织</p>}
        {selectedSchemes.map((schemeId) => {
          const scheme = CARD_NETWORKS.find((s) => s.value === schemeId)
          const color = SCHEME_COLOR_MAP[schemeId as SchemeID] || 'bg-gray-500'
          const fee = formData.fees?.[schemeId] || {
            network: schemeId,
            type: FeeType.PERCENTAGE,
            value: 0,
            enabled: false,
          }
          return (
            <div key={schemeId} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white ${color}`}>
                    {scheme?.label.slice(0, 1)}
                  </div>
                  <span className="font-bold text-soft-black">{scheme?.label}</span>
                </div>
                <div
                  onClick={() =>
                    updateFeeConfig(schemeId, (current) => ({
                      ...current,
                      enabled: !current.enabled,
                    }))
                  }
                  className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                    fee.enabled ? 'bg-accent-yellow' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${fee.enabled ? 'left-5' : 'left-1'}`}></div>
                </div>
              </div>
              {fee.enabled && (
                <div className="space-y-3">
                  <div className="bg-cream rounded-lg p-1 flex w-fit">
                    <button
                      onClick={() =>
                        updateFeeConfig(schemeId, (current) => ({
                          ...current,
                          type: FeeType.PERCENTAGE,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        fee.type === FeeType.PERCENTAGE ? 'bg-white shadow-sm text-soft-black' : 'text-gray-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() =>
                        updateFeeConfig(schemeId, (current) => ({
                          ...current,
                          type: FeeType.FIXED,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        fee.type === FeeType.FIXED ? 'bg-white shadow-sm text-soft-black' : 'text-gray-400'
                      }`}
                    >
                      $
                    </button>
                  </div>
                  <input
                    type="number"
                    className="w-full bg-cream rounded-lg px-3 py-2 text-sm font-bold text-soft-black focus:ring-1 focus:ring-accent-yellow/50 outline-none"
                    placeholder="0.00"
                    value={fee.value}
                    onChange={(e) =>
                      updateFeeConfig(schemeId, (current) => ({
                        ...current,
                        value: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-[10px] text-gray-400 text-right">{formatFeeDisplay(fee)}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{uiText.posModelLabel}</label>
          <SystemSelect
            dataType="pos_models"
            value={formData.basic_info.model || ''}
            onChange={(value) => handleInputChange('basic_info.model', value)}
            placeholder="请选择POS型号"
            allowCustom
            customPlaceholder="输入POS型号"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{uiText.acquiringInstitutionLabel}</label>
          <SystemSelect
            dataType="acquiring_institution"
            value={formData.basic_info.acquiring_institution || ''}
            onChange={(value) => handleInputChange('basic_info.acquiring_institution', value)}
            placeholder="请选择收单机构"
            showDescription
            allowCustom
            customPlaceholder="输入收单机构"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{uiText.deviceStatusLabel}</label>
          <SystemSelect
            dataType="device_status"
            value={formData.status || 'active'}
            onChange={(value) => handleInputChange('status', value)}
            placeholder="请选择设备状态"
            showDescription
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{uiText.checkoutLocationLabel}</label>
          <SystemSelect
            dataType="checkout_locations"
            value={formData.basic_info.checkout_location || ''}
            onChange={(value) => handleInputChange('basic_info.checkout_location', value)}
            placeholder="请选择收银区域"
            showDescription
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {['DCC', 'EDC'].map((mode) => {
          const enabled = formData.basic_info.acquiring_modes?.includes(mode)
          return (
            <div
              key={mode}
              onClick={() => {
                const current = formData.basic_info.acquiring_modes || []
                if (enabled) {
                  handleInputChange('basic_info.acquiring_modes', current.filter((item) => item !== mode))
                } else {
                  handleInputChange('basic_info.acquiring_modes', [...current, mode])
                }
              }}
              className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                enabled ? 'border-accent-yellow bg-blue-50' : 'border-gray-100 bg-white'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-soft-black uppercase">{mode}</div>
                <div className="text-xs text-gray-400">{mode === 'DCC' ? 'Dynamic Currency Conversion' : 'Electronic Data Capture'}</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border ${
                  enabled ? 'bg-accent-yellow border-accent-yellow' : 'border-gray-300'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{uiText.remarksTitle}</label>
        <textarea
          className="w-full bg-cream rounded-xl p-4 text-sm text-soft-black focus:ring-2 focus:ring-accent-yellow/20 outline-none h-32 resize-none"
          placeholder="Access codes, contact info, or special instructions..."
          value={formData.remarks}
          onChange={(e) => handleInputChange('remarks', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{uiText.customLinksTitle}</label>
        <div className="space-y-2">
          {formData.custom_links?.map((link, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-2 bg-white border border-gray-100 rounded-xl p-3">
              <input
                className="flex-1 bg-cream rounded-lg px-3 py-2 text-xs text-gray-600"
                placeholder="标题"
                value={link.title}
                onChange={(e) => updateCustomLink(i, 'title', e.target.value)}
              />
              <input
                className="flex-1 bg-cream rounded-lg px-3 py-2 text-xs text-gray-600"
                placeholder="https://"
                value={link.url}
                onChange={(e) => updateCustomLink(i, 'url', e.target.value)}
              />
              <input
                className="flex-1 bg-cream rounded-lg px-3 py-2 text-xs text-gray-600"
                placeholder="平台"
                value={link.platform}
                onChange={(e) => updateCustomLink(i, 'platform', e.target.value)}
              />
              <button
                onClick={() => removeCustomLink(i)}
                className="p-2 text-red-400 hover:bg-red-50 rounded-lg self-start"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addCustomLink}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-400 hover:border-accent-yellow hover:text-accent-yellow transition-all"
          >
            + {uiText.addLinkButton}
          </button>
        </div>
      </div>
    </div>
  )

  const goNext = () => setStep((prev) => Math.min(prev + 1, 5))
  const goPrev = () => setStep((prev) => Math.max(prev - 1, 1))

  const selectedAlbumCardLabel = useMemo(() => {
    if (!selectedAlbumCard) return ''
    const card = albumCards.find((item) => item.id === selectedAlbumCard)
    if (!card) return ''
    return `${card.title} · ${card.issuer} · ${card.organization} (${getAlbumScopeLabel(card.scope)})`
  }, [albumCards, selectedAlbumCard])

  const filteredAlbumCards = useMemo(() => {
    return albumCards.filter((card) => card.scope === albumScopeFilter)
  }, [albumCards, albumScopeFilter])

  const handleApplyAlbumCard = () => {
    if (!selectedAlbumCard) {
      notify.error('请选择要使用的卡片')
      return
    }
    const selectedCard = albumCards.find((card) => card.id === selectedAlbumCard)
    if (!selectedCard) {
      notify.error('未找到卡片信息')
      return
    }
    const targetIndex = (formData.attempts?.length || 0) - 1
    if (targetIndex < 0) {
      notify.error('请先添加一条尝试记录')
      return
    }
    const cardLabel = `${selectedCard.issuer} ${selectedCard.title}`.trim()
    const methodLabel = [selectedCard.organization, selectedCard.bin, selectedCard.group]
      .filter(Boolean)
      .join(' · ')
    updateAttempt(targetIndex, 'card_name', cardLabel)
    updateAttempt(targetIndex, 'notes', methodLabel)
    notify.success('已填充卡片信息')
    setIsAlbumPickerOpen(false)
  }

  const isSubmitting = step === 5 && loading

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className={`bg-white rounded-[32px] shadow-soft flex flex-col relative overflow-hidden min-h-[600px] transition-all duration-300 ${isAlbumPickerOpen ? 'blur-sm' : ''}`}>
          <div className="p-8 pb-4 border-b border-gray-50 z-10 bg-white">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {uiText.backButton}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded-xl font-semibold text-soft-black bg-cream hover:bg-accent-yellow/20 transition-colors"
                >
                  保存草稿
                </button>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-soft-black tracking-tight mt-4">添加新位置</h2>
            <p className="text-sm text-gray-400 mt-1">分四步完成POS机信息登记</p>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {stepIndicator}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            <div className="h-10" />
          </div>
          <div className="p-6 border-t border-gray-50 bg-white w-full flex justify-between items-center">
            {step > 1 ? (
              <button
                onClick={goPrev}
                className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> {uiText.backButton}
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={step === 5 ? handleSubmit : goNext}
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-2xl font-bold text-white bg-soft-black shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-accent-yellow hover:scale-105 active:scale-95'
              }`}
            >
              {step === 5 ? uiText.submitButton : uiText.nextButton}
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <SimpleMapPicker
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onConfirm={(lat, lng, address) => handleLocationConfirm(lat, lng, address)}
          initialLat={formData.latitude || 39.9042}
          initialLng={formData.longitude || 116.4074}
        />

        <AnimatePresence>
          {isAlbumPickerOpen && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAlbumPickerOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25 }}
                className="absolute right-6 top-6 bottom-6 w-[min(46%,720px)] bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/60 flex flex-col overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">选择卡册中的卡片</div>
                  <button
                    type="button"
                    onClick={() => setIsAlbumPickerOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 border-b border-gray-100">
                  <div className="inline-flex bg-cream rounded-full p-1">
                    {(['personal', 'public'] as const).map((scope) => (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => setAlbumScopeFilter(scope)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                          albumScopeFilter === scope
                            ? 'bg-soft-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-soft-black'
                        }`}
                      >
                        {scope === 'personal' ? '个人卡册' : '公共卡册'}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2">请选择要填充到最新尝试记录的卡片。</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {filteredAlbumCards.length === 0 && (
                    <div className="text-sm text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                      暂无{albumScopeFilter === 'personal' ? '个人' : '公共'}卡册卡片
                    </div>
                  )}
                  {filteredAlbumCards.map((card) => {
                    const label = `${card.title} · ${card.issuer} · ${card.organization}`
                    const isActive = selectedAlbumCard === card.id
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedAlbumCard(card.id)}
                        className={`w-full text-left border rounded-2xl px-4 py-3 transition-all ${
                          isActive
                            ? 'border-soft-black bg-soft-black/5'
                            : 'border-gray-100 hover:border-accent-yellow/50 hover:bg-cream/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-soft-black">{label}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {getAlbumScopeLabel(card.scope)} · BIN {card.bin || '—'} · {card.group || '未分组'}
                            </div>
                          </div>
                          {isActive && (
                            <span className="text-xs font-semibold text-soft-black bg-accent-yellow/20 px-3 py-1 rounded-full">
                              已选择
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="border-t border-gray-100 p-5 bg-white/80">
                  <button
                    type="button"
                    onClick={handleApplyAlbumCard}
                    className="w-full px-4 py-3 rounded-2xl text-sm font-semibold text-white bg-soft-black hover:bg-accent-yellow transition-colors"
                  >
                    填充到最新记录
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  )
}

export default AddPOS
