import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Building, CheckCircle, ChevronRight, Clock, CreditCard, Download, Edit, ExternalLink, FileText, Heart, HelpCircle, MapPin, MessageCircle, Settings, Shield, Smartphone, Star, Trash2, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { POSMachine } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useIssueReportStore } from '@/stores/useIssueReportStore'
import { useMapStore } from '@/stores/useMapStore'
import { getAlbumScopeLabel, useCardAlbumStore } from '@/stores/useCardAlbumStore'
import { usePermissions } from '@/hooks/usePermissions'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedCard from '@/components/ui/AnimatedCard'
import AnimatedModal from '@/components/ui/AnimatedModal'
import SystemSelect from '@/components/ui/SystemSelect'
import { type ThreeStateValue } from '@/components/ui/ThreeStateSelector'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/AnimatedLoading'
import { AnimatedTabBar } from '@/components/AnimatedNavigation'
import { CARD_NETWORKS, getCardNetworkLabel } from '@/lib/cardNetworks'
import { getPaymentMethodLabel, getResultLabel } from '@/lib/utils'
import { getErrorDetails, notify } from '@/lib/notify'
import { extractMissingColumnFromError } from '@/lib/postgrestCompat'
import { checkAndUpdatePOSStatus, calculatePOSSuccessRate, POSStatus, refreshMapData, updatePOSStatus } from '@/utils/posStatusUtils'
import { exportToHTML, exportToJSON, exportToPDF, getFormatDisplayName, getStyleDisplayName, type CardStyle, type ExportFormat } from '@/utils/exportUtils'
import { feeUtils } from '@/types/fees'

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
  card_network?: string
  payment_method?: string
  cvm?: string
  acquiring_mode?: string
  device_status?: string
  acquiring_institution?: string
  checkout_location?: string
  notes?: string
  attempted_at?: string
  is_conclusive_failure?: boolean
  user_id?: string
}

type AttemptDraft = {
  result: 'success' | 'failure' | 'unknown'
  attempted_at?: string
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
}

type SupportEvidence = 'supported' | 'unsupported'
interface SupportEvidenceItem {
  type: SupportEvidence
  attempt: Attempt
}

interface SupportFusionItem {
  key: string
  label: string
  manualState: ThreeStateValue
  inferredState: ThreeStateValue
  resolvedState: ThreeStateValue
  hasConflict: boolean
  manualNote?: string
  evidenceNote?: string
}

interface SupportFusionGroup {
  key: string
  title: string
  items: SupportFusionItem[]
}

interface SupportFusionSection {
  key: string
  title: string
  description: string
  icon: typeof CreditCard
  items: SupportFusionItem[]
  groups?: SupportFusionGroup[]
}

interface SupportDetailTarget {
  sectionKey: string
  sectionTitle: string
  itemKey: string
  itemLabel: string
  resolvedState: ThreeStateValue
}

const PAYMENT_METHOD_OPTIONS = ['tap', 'insert', 'swipe', 'apple_pay', 'google_pay', 'hce'] as const
const CVM_OPTIONS = ['no_pin', 'pin', 'signature'] as const
const ACQUIRING_MODE_OPTIONS = ['DCC', 'EDC'] as const

const POSDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posMachines, deletePOSMachine, selectPOSMachine } = useMapStore()
  const permissions = usePermissions()
  const { reports, addReport, resolveReport } = useIssueReportStore()
  const albumCards = useCardAlbumStore((state) => state.cards)
  
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
  const [draftAttempts, setDraftAttempts] = useState<AttemptDraft[]>([])
  const [commonCards, setCommonCards] = useState<Array<{ name: string; method?: string }>>([])
  const [isAlbumPickerOpen, setIsAlbumPickerOpen] = useState(false)
  const [albumScopeFilter, setAlbumScopeFilter] = useState<'personal' | 'public'>('personal')
  const [selectedAlbumCard, setSelectedAlbumCard] = useState('')
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
  const [activeTab, setActiveTab] = useState('overview')
  const [supportDetailTarget, setSupportDetailTarget] = useState<SupportDetailTarget | null>(null)

  const attemptResultOptions = [
    {
      value: 'success',
      label: '成功',
      description: '交易完成或确认支持',
      icon: CheckCircle,
      iconClass: 'text-emerald-500'
    },
    {
      value: 'failure',
      label: '失败',
      description: '明确失败或无法使用',
      icon: XCircle,
      iconClass: 'text-red-500'
    },
    {
      value: 'unknown',
      label: '未知',
      description: '结果不确定',
      icon: HelpCircle,
      iconClass: 'text-gray-400'
    }
  ] as const

  const attemptFieldBase =
    'w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-[16px] text-soft-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-yellow/20 focus:border-accent-yellow/40 min-h-[44px] touch-manipulation webkit-appearance-none webkit-tap-highlight-none dark:bg-slate-900/80 dark:text-gray-100 dark:border-slate-700 dark:placeholder:text-gray-500'

  const attemptSelectBase = `${attemptFieldBase} pr-10 appearance-none`
  const attemptTextareaBase = `${attemptFieldBase} min-h-[110px] resize-none`

  const createAttemptDraft = (): AttemptDraft => ({
    result: 'success',
    attempted_at: new Date().toISOString(),
    card_network: '',
    payment_method: 'tap',
    cvm: 'unknown',
    acquiring_mode: 'unknown',
    device_status: pos?.status || 'active',
    acquiring_institution: pos?.basic_info?.acquiring_institution || '',
    checkout_location: pos?.basic_info?.checkout_location,
    card_name: '',
    notes: '',
    is_conclusive_failure: false,
  })

  const addAttemptRow = () => {
    setDraftAttempts((prev) => [...prev, createAttemptDraft()])
  }

  const getAttemptMethodLabel = (method: NonNullable<AttemptDraft['payment_method']>) => {
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

  const updateAttempt = (index: number, field: keyof AttemptDraft, value: any) => {
    setDraftAttempts((prev) => prev.map((attempt, i) => (i === index ? { ...attempt, [field]: value } : attempt)))
  }

  const removeAttempt = (index: number) => {
    setDraftAttempts((prev) => prev.filter((_, i) => i !== index))
  }

  const saveAttemptAsCommonCard = (index: number) => {
    const attempt = draftAttempts[index]
    if (!attempt) return
    const name = attempt.card_name?.trim()
    const method = attempt.payment_method
    if (!name && !method) {
      notify.error('请先填写卡片名称或支付方式再保存')
      return
    }
    const methodLabel = method ? getAttemptMethodLabel(method) : ''
    setCommonCards((prev) => {
      const exists = prev.some((item) => item.name === (name || '') && item.method === (methodLabel || ''))
      if (exists) {
        notify.success('已在常用卡片列表中')
        return prev
      }
      notify.success('常用卡片已保存')
      return [...prev, { name: name || methodLabel || '未命名卡片', method: methodLabel }]
    })
  }

  const applyCommonCard = (index: number, cardIndex: number) => {
    const card = commonCards[cardIndex]
    if (!card) return
    updateAttempt(index, 'card_name', card.name)
    updateAttempt(index, 'notes', card.method || '')
  }

  const attemptMatrix = useMemo(() => {
    const initialMatrix = {
      cardNetworks: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
      paymentMethods: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
      cvm: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
      acquiringModes: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
      checkoutLocations: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
      deviceStatus: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
      acquiringInstitutions: new Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>(),
    }

    const safeAttemptList = attempts || []
    if (safeAttemptList.length === 0) {
      return initialMatrix
    }

    const pushEvidence = (
      map: Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>,
      key: string,
      evidence: SupportEvidenceItem
    ) => {
      if (!key) return
      if (!map.has(key)) {
        map.set(key, { supported: [], unsupported: [] })
      }
      const target = map.get(key)
      if (!target) return
      if (evidence.type === 'supported') {
        target.supported.push(evidence)
      } else {
        target.unsupported.push(evidence)
      }
    }

    safeAttemptList.forEach((attempt) => {
      const isSuccess = attempt.result === 'success'
      const isConclusiveFailure = attempt.result === 'failure' && attempt.is_conclusive_failure

      if (isSuccess || isConclusiveFailure) {
        const evidenceType: SupportEvidence = isSuccess ? 'supported' : 'unsupported'
        const evidence: SupportEvidenceItem = { type: evidenceType, attempt }

        if (attempt.card_network) pushEvidence(initialMatrix.cardNetworks, attempt.card_network, evidence)
        if (attempt.payment_method) pushEvidence(initialMatrix.paymentMethods, attempt.payment_method, evidence)
        if (attempt.cvm && attempt.cvm !== 'unknown') pushEvidence(initialMatrix.cvm, attempt.cvm, evidence)
        if (attempt.acquiring_mode && attempt.acquiring_mode !== 'unknown') pushEvidence(initialMatrix.acquiringModes, attempt.acquiring_mode, evidence)
        if (attempt.checkout_location) pushEvidence(initialMatrix.checkoutLocations, attempt.checkout_location, evidence)
        if (attempt.device_status) pushEvidence(initialMatrix.deviceStatus, attempt.device_status, evidence)
        if (attempt.acquiring_institution) pushEvidence(initialMatrix.acquiringInstitutions, attempt.acquiring_institution, evidence)
      }
    })

    return initialMatrix
  }, [attempts])

  const attemptsList = draftAttempts || []
  const attemptsCount = attemptsList.length
  const attemptSuccessCount = attemptsList.filter((attempt) => attempt.result === 'success').length
  const attemptFailureCount = attemptsList.filter((attempt) => attempt.result === 'failure').length
  const attemptSuccessRate = attemptsCount > 0 ? Math.round((attemptSuccessCount / attemptsCount) * 100) : 0
  const latestAttempt = attemptsList[attemptsCount - 1]
  const latestAttemptLabel = latestAttempt?.attempted_at
    ? new Date(latestAttempt.attempted_at).toLocaleString('zh-CN')
    : ''
  const latestResultLabel =
    latestAttempt?.result === 'success'
      ? '成功'
      : latestAttempt?.result === 'failure'
      ? '失败'
      : latestAttempt?.result === 'unknown'
      ? '未知'
      : ''
  const showAlbumCard = attemptsCount > 0 && albumCards.length > 0

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
    const targetIndex = attemptsCount - 1
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

  const attemptSidebar = (
    <aside className="space-y-6">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center shadow-soft">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-soft-black dark:text-gray-100">
              {pos?.merchant_name || '未命名 POS'}
            </div>
            <div className="text-xs text-gray-500">{pos?.address || '暂无地址信息'}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-3 py-3">
            <div className="text-lg font-semibold text-soft-black dark:text-gray-100">{attemptsCount}</div>
            <div className="text-[11px] text-gray-500">总尝试</div>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50/70 px-3 py-3">
            <div className="text-lg font-semibold text-green-600">{attemptSuccessCount}</div>
            <div className="text-[11px] text-gray-500">成功</div>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-3 py-3">
            <div className="text-lg font-semibold text-red-600">{attemptFailureCount}</div>
            <div className="text-[11px] text-gray-500">失败</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-3">
            <div className="text-lg font-semibold text-blue-600">{attemptSuccessRate}%</div>
            <div className="text-[11px] text-gray-500">成功率</div>
          </div>
        </div>
        {latestAttempt && (
          <div className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-xs text-gray-500">
            最近一次：{latestAttemptLabel} · {latestResultLabel}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 via-white/80 to-blue-50/80 p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-semibold text-soft-black dark:text-gray-100">
          <Shield className="w-4 h-4 text-accent-yellow" />
          填写提示
        </div>
        <div className="mt-3 space-y-2 text-sm text-gray-500">
          <p>成功与明确失败会更新支持矩阵，影响默认推荐。</p>
          <p>若刷卡失败但原因不明，请选择“未知”并在备注说明。</p>
          <p>卡片名称可写具体发卡行或卡产品名，便于后续追踪。</p>
        </div>
      </div>

      {showAlbumCard && (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-soft space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-soft-black dark:text-gray-100">
            <CreditCard className="w-4 h-4 text-accent-yellow" />
            从卡册选择
          </div>
          <p className="text-[11px] text-gray-400">选择卡片后会自动填充到最新一条尝试记录。</p>
          <button
            type="button"
            onClick={() => setIsAlbumPickerOpen(true)}
            className="w-full px-4 py-3 rounded-2xl text-sm font-semibold text-soft-black bg-cream hover:bg-accent-yellow/20 transition-colors flex items-center justify-between"
          >
            <span>{selectedAlbumCardLabel || '从卡册中选择卡片'}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            type="button"
            className="w-full px-4 py-3 rounded-2xl text-xs font-semibold text-soft-black bg-cream hover:bg-accent-yellow/20 transition-colors"
            onClick={handleApplyAlbumCard}
          >
            填充到最新记录
          </button>
        </div>
      )}
    </aside>
  )

  const normalizeThreeState = (value?: boolean | ThreeStateValue): ThreeStateValue => {
    if (typeof value === 'boolean') {
      return value ? 'supported' : 'unsupported'
    }
    return value === 'supported' || value === 'unsupported' || value === 'unknown' ? value : 'unknown'
  }

  const getInferredState = (evidence: { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }) => {
    const hasSupported = evidence.supported.length > 0
    const hasUnsupported = evidence.unsupported.length > 0

    if (hasSupported && !hasUnsupported) {
      return { state: 'supported' as ThreeStateValue, hasConflict: false }
    }
    if (!hasSupported && hasUnsupported) {
      return { state: 'unsupported' as ThreeStateValue, hasConflict: false }
    }
    if (hasSupported && hasUnsupported) {
      return { state: 'unknown' as ThreeStateValue, hasConflict: true }
    }
    return { state: 'unknown' as ThreeStateValue, hasConflict: false }
  }

  const resolveSupportState = (
    manualState: ThreeStateValue,
    inferredState: ThreeStateValue,
    inferredConflict: boolean
  ): { state: ThreeStateValue; hasConflict: boolean } => {
    if (inferredConflict) {
      return { state: 'unknown', hasConflict: true }
    }

    if (inferredState !== 'unknown') {
      const hasConflict = manualState !== 'unknown' && manualState !== inferredState
      return { state: inferredState, hasConflict }
    }

    if (manualState !== 'unknown') {
      return { state: manualState, hasConflict: false }
    }

    return { state: 'unknown', hasConflict: false }
  }

  const formatEvidenceLabel = (items: SupportEvidenceItem[]) => {
    if (items.length === 0) return ''
    const displayAttempts = items.slice(0, 2)
    const labels = displayAttempts.map((item) => {
      const timeLabel = item.attempt.attempted_at
        ? new Date(item.attempt.attempted_at).toLocaleDateString('zh-CN')
        : new Date(item.attempt.created_at).toLocaleDateString('zh-CN')
      const methodLabel = item.attempt.payment_method ? getPaymentMethodLabel(item.attempt.payment_method) : ''
      const networkLabel = item.attempt.card_network ? getCardNetworkLabel(item.attempt.card_network) : ''
      const parts = [timeLabel, methodLabel, networkLabel].filter(Boolean)
      return parts.join(' · ')
    })
    const more = items.length > 2 ? ` 等${items.length}条` : ''
    return `${labels.join(' / ')}${more}`
  }

  const formatEvidenceSummary = (
    evidence: { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] },
    inferredState: ThreeStateValue,
    inferredConflict: boolean
  ) => {
    const supportedLabel = formatEvidenceLabel(evidence.supported)
    const unsupportedLabel = formatEvidenceLabel(evidence.unsupported)

    if (inferredConflict) {
      const parts: string[] = []
      if (supportedLabel) parts.push(`支持证据：${supportedLabel}`)
      if (unsupportedLabel) parts.push(`不支持证据：${unsupportedLabel}`)
      return parts.join('；')
    }

    if (inferredState === 'supported' && supportedLabel) return `尝试记录：${supportedLabel}`
    if (inferredState === 'unsupported' && unsupportedLabel) return `失败记录：${unsupportedLabel}`
    return ''
  }

  const getManualPaymentMethodState = (key: string): ThreeStateValue => {
    if (!pos?.basic_info) return 'unknown'
    if (key === 'tap') return normalizeThreeState(pos.basic_info.supports_contactless)
    if (key === 'apple_pay') return normalizeThreeState(pos.basic_info.supports_apple_pay)
    if (key === 'google_pay') return normalizeThreeState(pos.basic_info.supports_google_pay)
    if (key === 'hce') return normalizeThreeState(pos.basic_info.supports_hce_simulation)
    return 'unknown'
  }

  const getManualVerificationState = (key: string): ThreeStateValue => {
    const modes = pos?.verification_modes
    if (!modes) return 'unknown'

    if (key === 'no_pin') {
      if (modes.small_amount_no_pin_unsupported) return 'unsupported'
      if (modes.small_amount_no_pin && modes.small_amount_no_pin.length > 0) return 'supported'
      if (modes.small_amount_no_pin_uncertain) return 'unknown'
      return 'unknown'
    }
    if (key === 'pin') {
      if (modes.requires_password_unsupported) return 'unsupported'
      if (modes.requires_password && modes.requires_password.length > 0) return 'supported'
      if (modes.requires_password_uncertain) return 'unknown'
      return 'unknown'
    }
    if (key === 'signature') {
      if (modes.requires_signature_unsupported) return 'unsupported'
      if (modes.requires_signature && modes.requires_signature.length > 0) return 'supported'
      if (modes.requires_signature_uncertain) return 'unknown'
      return 'unknown'
    }
    return 'unknown'
  }

  const getManualVerificationNote = (key: string) => {
    const isCardNetworkCodeList = (values: string[]) => {
      const knownCardNetworks = new Set([...CARD_NETWORKS.map((network) => network.value), 'maestro'])
      return values.length > 0 && values.every((value) => knownCardNetworks.has(value))
    }

    const formatVerificationNote = (values: string[]) => {
      if (!values.length || isCardNetworkCodeList(values)) return undefined
      return `配置记录：${values.join('、')}`
    }

    const modes = pos?.verification_modes
    if (!modes) return undefined

    if (key === 'no_pin') {
      if (modes.small_amount_no_pin) return formatVerificationNote(modes.small_amount_no_pin)
      if (modes.small_amount_no_pin_uncertain) return '配置记录：待确认'
    }
    if (key === 'pin') {
      if (modes.requires_password) return formatVerificationNote(modes.requires_password)
      if (modes.requires_password_uncertain) return '配置记录：待确认'
    }
    if (key === 'signature') {
      if (modes.requires_signature) return formatVerificationNote(modes.requires_signature)
      if (modes.requires_signature_uncertain) return '配置记录：待确认'
    }
    return undefined
  }

  const getManualAcquiringModeState = (key: string): ThreeStateValue => {
    const basicInfo = pos?.basic_info
    if (!basicInfo) return 'unknown'

    if (key === 'DCC') {
      if (basicInfo.supports_dcc !== undefined) return normalizeThreeState(basicInfo.supports_dcc)
      if (basicInfo.acquiring_modes?.includes('DCC')) return 'supported'
    }

    if (key === 'EDC') {
      if (basicInfo.supports_edc !== undefined) return normalizeThreeState(basicInfo.supports_edc)
      if (basicInfo.acquiring_modes?.includes('EDC')) return 'supported'
    }

    return 'unknown'
  }

  const getManualAcquiringModeNote = (key: string) => {
    if (!pos?.basic_info?.acquiring_modes?.includes(key)) return undefined
    return '配置记录：收单模式包含该项'
  }

  const getManualCheckoutState = (key: string): ThreeStateValue => {
    if (!pos?.basic_info?.checkout_location) return 'unknown'
    return pos.basic_info.checkout_location === key ? 'supported' : 'unknown'
  }

  const getManualCheckoutNote = () => {
    return undefined
  }

  const getManualDeviceStatusState = (key: string): ThreeStateValue => {
    if (!pos?.status) return 'unknown'
    return pos.status === key ? 'supported' : 'unknown'
  }

  const getManualDeviceStatusNote = () => {
    return undefined
  }

  const getManualInstitutionState = (key: string): ThreeStateValue => {
    if (!pos?.basic_info?.acquiring_institution) return 'unknown'
    return pos.basic_info.acquiring_institution === key ? 'supported' : 'unknown'
  }

  const getManualInstitutionNote = () => {
    return undefined
  }

  const buildSupportFusionItems = (
    items: Array<{ key: string; label: string }>,
    evidenceMap: Map<string, { supported: SupportEvidenceItem[]; unsupported: SupportEvidenceItem[] }>,
    resolveManualState: (key: string) => ThreeStateValue,
    resolveManualNote?: (key: string) => string | undefined
  ): SupportFusionItem[] => {
    return items.map((item) => {
      const evidence = evidenceMap.get(item.key) || { supported: [], unsupported: [] }
      const { state: inferredState, hasConflict: inferredConflict } = getInferredState(evidence)
      const manualState = resolveManualState(item.key)
      const resolved = resolveSupportState(manualState, inferredState, inferredConflict)

      return {
        key: item.key,
        label: item.label,
        manualState,
        inferredState,
        resolvedState: resolved.state,
        hasConflict: resolved.hasConflict,
        manualNote: resolveManualNote?.(item.key),
        evidenceNote: formatEvidenceSummary(evidence, inferredState, inferredConflict),
      }
    })
  }

  const acquiringInstitutionKeys = Array.from(
    new Set([pos?.basic_info?.acquiring_institution, ...Array.from(attemptMatrix.acquiringInstitutions.keys())].filter(Boolean))
  ) as string[]

  const checkoutLocationItems = buildSupportFusionItems(
    [
      { key: '自助收银', label: '自助收银' },
      { key: '人工收银', label: '人工收银' },
    ],
    attemptMatrix.checkoutLocations,
    getManualCheckoutState,
    getManualCheckoutNote
  )

  const deviceStatusItems = buildSupportFusionItems(
    [
      { key: 'active', label: '正常运行' },
      { key: 'inactive', label: '暂时不可用' },
      { key: 'maintenance', label: '维修中' },
      { key: 'disabled', label: '已停用' },
    ],
    attemptMatrix.deviceStatus,
    getManualDeviceStatusState,
    getManualDeviceStatusNote
  )

  const institutionItems = buildSupportFusionItems(
    acquiringInstitutionKeys.map((key) => ({ key, label: key })),
    attemptMatrix.acquiringInstitutions,
    getManualInstitutionState,
    getManualInstitutionNote
  )

  const deviceAndAcquiringGroups: SupportFusionGroup[] = [
    {
      key: 'checkout-location',
      title: '结账位置',
      items: checkoutLocationItems,
    },
    {
      key: 'device-status',
      title: '设备状态',
      items: deviceStatusItems,
    },
    {
      key: 'institution',
      title: '收单机构',
      items: institutionItems,
    },
  ]

  const supportFusionSections: SupportFusionSection[] = [
    {
      key: 'network',
      title: '卡组织支持',
      description: '配置与尝试记录综合结果',
      icon: CreditCard,
      items: buildSupportFusionItems(
        CARD_NETWORKS.map((network) => ({ key: network.value, label: network.label })),
        attemptMatrix.cardNetworks,
        (key) => (pos?.basic_info?.supported_card_networks?.includes(key) ? 'supported' : 'unknown')
      ),
    },
    {
      key: 'payment-method',
      title: '支付方式',
      description: 'NFC / 钱包 / 插卡能力',
      icon: Smartphone,
      items: buildSupportFusionItems(
        PAYMENT_METHOD_OPTIONS.map((method) => ({ key: method, label: getPaymentMethodLabel(method) })),
        attemptMatrix.paymentMethods,
        getManualPaymentMethodState,
        (key) => {
          if (key === 'tap' && pos?.basic_info?.min_amount_no_pin) {
            return `配置记录：免密金额上限 ¥${pos.basic_info.min_amount_no_pin}`
          }
          return undefined
        }
      ),
    },
    {
      key: 'cvm',
      title: '验证方式 (CVM)',
      description: '免密 / PIN / 签名三态',
      icon: Shield,
      items: buildSupportFusionItems(
        CVM_OPTIONS.map((cvm) => ({
          key: cvm,
          label: cvm === 'no_pin' ? '免密' : cvm === 'pin' ? 'PIN' : '签名',
        })),
        attemptMatrix.cvm,
        getManualVerificationState,
        getManualVerificationNote
      ),
    },
    {
      key: 'acquiring-mode',
      title: '收单模式',
      description: 'DCC / EDC 支持情况',
      icon: Settings,
      items: buildSupportFusionItems(
        ACQUIRING_MODE_OPTIONS.map((mode) => ({ key: mode, label: mode })),
        attemptMatrix.acquiringModes,
        getManualAcquiringModeState,
        getManualAcquiringModeNote
      ),
    },
    {
      key: 'device-acquiring',
      title: '设备与收单',
      description: '结账位置 / 设备状态 / 收单机构',
      icon: Settings,
      items: deviceAndAcquiringGroups.flatMap((group) => group.items),
      groups: deviceAndAcquiringGroups,
    },
  ]

  const allFusionItems = supportFusionSections.flatMap((section) => section.items)
  const supportFusionSummary = {
    supported: allFusionItems.filter((item) => item.resolvedState === 'supported').length,
    unsupported: allFusionItems.filter((item) => item.resolvedState === 'unsupported').length,
    unknown: allFusionItems.filter((item) => item.resolvedState === 'unknown').length,
    conflicts: allFusionItems.filter((item) => item.hasConflict).length,
  }

  const hasManualPaymentData = !!pos && (
    (!!pos.basic_info && Object.keys(pos.basic_info).length > 0) ||
    (!!pos.verification_modes && Object.keys(pos.verification_modes).length > 0)
  )

  const supportStateLabelMap: Record<ThreeStateValue, string> = {
    supported: '支持',
    unsupported: '不支持',
    unknown: '未知',
  }

  const supportStateBadgeClassMap: Record<ThreeStateValue, string> = {
    supported: 'bg-gray-100 text-gray-700 border border-gray-200',
    unsupported: 'bg-gray-100 text-gray-700 border border-gray-200',
    unknown: 'bg-gray-100 text-gray-700 border border-gray-200',
  }

  const supportSummaryValueClassMap = {
    supported: 'text-emerald-600',
    unsupported: 'text-rose-600',
    unknown: 'text-slate-600',
    conflicts: 'text-amber-600',
  } as const

  const supportSummaryCards = [
    { key: 'supported', label: '支持', value: supportFusionSummary.supported },
    { key: 'unsupported', label: '不支持', value: supportFusionSummary.unsupported },
    { key: 'unknown', label: '未知', value: supportFusionSummary.unknown },
    { key: 'conflicts', label: '待复核', value: supportFusionSummary.conflicts },
  ] as const

  const paymentMethodIconMap: Record<string, typeof CreditCard> = {
    tap: Smartphone,
    insert: CreditCard,
    swipe: CreditCard,
    apple_pay: Smartphone,
    google_pay: Smartphone,
    hce: Shield,
  }

  const getUnifiedSupportNote = (item: SupportFusionItem) => {
    return item.evidenceNote || item.manualNote
  }

  const getSupportAttemptField = (
    sectionKey: string,
    itemKey: string
  ): 'card_network' | 'payment_method' | 'cvm' | 'acquiring_mode' | 'checkout_location' | 'device_status' | 'acquiring_institution' | null => {
    if (sectionKey === 'network') return 'card_network'
    if (sectionKey === 'payment-method') return 'payment_method'
    if (sectionKey === 'cvm') return 'cvm'
    if (sectionKey === 'acquiring-mode') return 'acquiring_mode'
    if (sectionKey === 'device-acquiring') {
      if (itemKey === '自助收银' || itemKey === '人工收银') return 'checkout_location'
      if (itemKey === 'active' || itemKey === 'inactive' || itemKey === 'maintenance' || itemKey === 'disabled') {
        return 'device_status'
      }
      return 'acquiring_institution'
    }
    return null
  }

  const getAttemptTimestamp = (attempt: Attempt) => {
    const timestamp = new Date(attempt.attempted_at || attempt.created_at).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  const formatAttemptDateTime = (attempt: Attempt) => {
    return new Date(attempt.attempted_at || attempt.created_at).toLocaleString('zh-CN')
  }

  const getRelatedAttemptsForSupportItem = (sectionKey: string, itemKey: string) => {
    const field = getSupportAttemptField(sectionKey, itemKey)
    if (!field) return []
    return [...attempts]
      .filter((attempt) => attempt[field] === itemKey)
      .sort((left, right) => getAttemptTimestamp(right) - getAttemptTimestamp(left))
  }

  const supportDetailAttempts = useMemo(() => {
    if (!supportDetailTarget) return []
    return getRelatedAttemptsForSupportItem(supportDetailTarget.sectionKey, supportDetailTarget.itemKey)
  }, [attempts, supportDetailTarget])

  const supportDetailSection = useMemo(() => {
    if (!supportDetailTarget) return null
    return supportFusionSections.find((section) => section.key === supportDetailTarget.sectionKey) || null
  }, [supportDetailTarget, supportFusionSections])
  const SupportDetailIcon = supportDetailSection?.icon || CreditCard

  const openSupportDetailDrawer = (section: SupportFusionSection, item: SupportFusionItem) => {
    setSupportDetailTarget({
      sectionKey: section.key,
      sectionTitle: section.title,
      itemKey: item.key,
      itemLabel: item.label,
      resolvedState: item.resolvedState,
    })
  }

  const closeSupportDetailDrawer = () => {
    setSupportDetailTarget(null)
  }

  const isMobileActionsDisabled = !pos?.id
  const openAttemptModal = () => {
    if (!pos) return
    closeSupportDetailDrawer()
    setDraftAttempts((prev) => (prev.length > 0 ? prev : [createAttemptDraft()]))
    setShowAttemptModal(true)
  }

  const handleAttemptClick = () => {
    openAttemptModal()
  }
  const handleReviewClick = () => {
    if (!pos) return
    setShowReviewModal(true)
  }

  useEffect(() => {
    if (id) {
      loadPOSDetail()
      loadReviews()
      loadAttempts()
      loadSuccessRate()
      if (user) {
        checkFavoriteStatus()
        recordVisitHistory()
      }
    }
  }, [id, user])

  useEffect(() => {
    if (pos) {
      loadExternalLinks(pos)
    } else {
      setExternalLinks([])
    }
  }, [pos])

  useEffect(() => {
    if (activeTab !== 'payment' && supportDetailTarget) {
      closeSupportDetailDrawer()
    }
  }, [activeTab, supportDetailTarget])

  useEffect(() => {
    if (!supportDetailTarget) return
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [supportDetailTarget])

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

  const loadExternalLinks = async (currentPos: POSMachine) => {
    try {
      // 从POS机数据中获取自定义链接
      if (currentPos.custom_links && currentPos.custom_links.length > 0) {
        const links: ExternalLinkType[] = currentPos.custom_links.map((link, index) => ({
          id: `custom-${index}`,
          title: link.title,
          url: link.url,
          description: link.platform ? `${link.platform} 链接` : '',
          created_at: new Date().toISOString()
        }))
        setExternalLinks(links)
        return
      }

      if (!id) return

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

    if (attemptsCount === 0) {
      notify.error('请先添加一条尝试记录')
      return
    }

    setSubmittingAttempt(true)
    try {
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

      const attemptsPayload = attemptsList.map((attempt, index) => ({
        pos_id: id,
        user_id: user.id,
        attempt_number: nextAttemptNumber + index,
        result: attempt.result,
        card_name: attempt.card_name?.trim() || null,
        card_network: attempt.card_network || null,
        payment_method: attempt.payment_method || null,
        cvm: attempt.cvm || 'unknown',
        acquiring_mode: attempt.acquiring_mode || 'unknown',
        device_status: attempt.device_status || pos?.status || 'active',
        acquiring_institution: attempt.acquiring_institution?.trim() || null,
        checkout_location: attempt.checkout_location || pos?.basic_info?.checkout_location || null,
        notes: attempt.notes?.trim() || null,
        attempted_at: attempt.attempted_at || null,
        is_conclusive_failure: attempt.is_conclusive_failure || false,
      }))

      // 保存尝试记录到Supabase数据库
      const { data, error } = await supabase
        .from('pos_attempts')
        .insert(attemptsPayload)
        .select()
      
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
          const missingColumn = extractMissingColumnFromError(error)
          if (missingColumn) {
            // Hard-fail: never drop fields silently when the schema is out of date.
            notify.critical(`提交失败：数据库缺少字段 ${missingColumn}，请先执行 supabase/migrations/014_ensure_pos_records_columns.sql，并刷新 PostgREST schema cache。`, {
              title: '数据库需要升级',
            })
          } else {
            notify.error(`提交失败: ${error.message || '未知错误'}`)
          }
        }
        return
      }
      
      const insertedAttempts: Attempt[] = (data || []).map((item) => ({
        id: item.id,
        created_at: item.created_at || new Date().toISOString(),
        result: item.result,
        card_name: item.card_name,
        card_network: item.card_network,
        payment_method: item.payment_method,
        cvm: item.cvm,
        acquiring_mode: item.acquiring_mode,
        device_status: item.device_status,
        acquiring_institution: item.acquiring_institution,
        checkout_location: item.checkout_location,
        notes: item.notes,
        attempted_at: item.attempted_at,
        is_conclusive_failure: item.is_conclusive_failure,
        user_id: item.user_id,
      }))

      if (insertedAttempts.length > 0) {
        insertedAttempts.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        setAttempts((prev) => [...insertedAttempts, ...prev])
      }
      
      notify.success('尝试记录提交成功')
      
      setDraftAttempts([])
      setSelectedAlbumCard('')
      setIsAlbumPickerOpen(false)
      
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
        await loadPOSDetail()
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

  const handleNavigateToMap = () => {
    if (!pos) return
    selectPOSMachine(pos)
    navigate('/app/map')
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-5xl space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard className="bg-white/80 dark:bg-slate-900/80 border-white/60 dark:border-slate-800 rounded-[28px]" />
            <SkeletonCard className="bg-white/80 dark:bg-slate-900/80 border-white/60 dark:border-slate-800 rounded-[28px]" />
          </div>
          <SkeletonCard className="bg-white/80 dark:bg-slate-900/80 border-white/60 dark:border-slate-800 rounded-[28px]" />
        </div>
      </div>
    )
  }

  if (!pos) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-8">
          <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100 mb-2">POS机不存在</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">请返回上一页或重新搜索。</p>
          <AnimatedButton onClick={() => navigate(-1)}>返回</AnimatedButton>
        </div>
      </div>
    )
  }

  const posReports = reports.filter((report) => report.itemType === 'pos' && report.itemId === pos.id)

  return (
    <div className="min-h-full">
      {!showAttemptModal && (
        <>
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 transition-all duration-300 ${supportDetailTarget ? 'blur-sm' : ''}`}>
        <AnimatedCard
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft"
          variant="elevated"
          hoverable
        >
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft border border-white/70 text-gray-600 hover:text-soft-black hover:bg-gray-50 transition-colors"
                  aria-label="返回"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold text-soft-black dark:text-gray-100">
                    {pos.merchant_name}
                  </CardTitle>
                  <CardDescription className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="mt-0.5 h-4 w-4 text-accent-yellow" />
                    <span>{pos.address || '暂无地址信息'}</span>
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${
                      pos.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : pos.status === 'inactive'
                        ? 'bg-yellow-100 text-yellow-700'
                        : pos.status === 'maintenance'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        pos.status === 'active'
                          ? 'bg-green-500'
                          : pos.status === 'inactive'
                          ? 'bg-yellow-500'
                          : pos.status === 'maintenance'
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`} />
                      {pos.status === 'active'
                        ? '正常运行'
                        : pos.status === 'inactive'
                        ? '暂时不可用'
                        : pos.status === 'maintenance'
                        ? '维修中'
                        : '已停用'}
                    </span>
                    {successRate !== null && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 font-semibold">
                        成功率 {(successRate * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateToMap}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  在地图查看
                </AnimatedButton>
                <button
                  onClick={toggleFavorite}
                  className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors"
                  title="收藏"
                  aria-label="收藏"
                >
                  <Heart className={`w-5 h-5 mx-auto ${isFavorite ? 'text-red-500 fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-soft-black transition-colors"
                  title="导出记录"
                  aria-label="导出记录"
                >
                  <Download className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-soft-black transition-colors"
                  title="申报问题"
                  aria-label="申报问题"
                >
                  <FileText className="w-5 h-5 mx-auto" />
                </button>
                {permissions.canEditItem(pos.created_by) && (
                  <button
                    onClick={() => navigate(`/app/edit-pos/${pos.id}`)}
                    className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-soft-black transition-colors"
                    title="编辑POS机"
                    aria-label="编辑POS机"
                  >
                    <Edit className="w-5 h-5 mx-auto" />
                  </button>
                )}
                {permissions.canDeleteItem(pos.created_by) && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="h-10 w-10 rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors"
                    title="删除POS机"
                    aria-label="删除POS机"
                  >
                    <Trash2 className="w-5 h-5 mx-auto" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">POS机型号</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {pos.basic_info?.model || <span className="text-gray-500">待勘察</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">收单机构</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {pos.basic_info?.acquiring_institution || <span className="text-gray-500">待勘察</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">收银位置</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {pos.basic_info?.checkout_location || <span className="text-gray-500">待勘察</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">设备状态</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {pos.status === 'active'
                      ? '正常运行'
                      : pos.status === 'inactive'
                      ? '暂时不可用'
                      : pos.status === 'maintenance'
                      ? '维修中'
                      : '已停用'}
                  </span>
                  {permissions.canEditItem(pos.created_by) && (
                    <AnimatedButton
                      onClick={() => {
                        setNewStatus(pos.status || 'active')
                        setShowStatusModal(true)
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-7"
                    >
                      修改
                    </AnimatedButton>
                  )}
                </div>
              </div>
            </div>
            {(pos.address || (pos.latitude && pos.longitude)) || pos.created_at ? (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {(pos.address || (pos.latitude && pos.longitude)) && (
                    <div>
                      位置: {pos.address || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`}
                    </div>
                  )}
                  {pos.created_at && (
                    <div>
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

        <AnimatedTabBar
          tabs={[
            { id: 'overview', label: '概览' },
            { id: 'payment', label: '支付与验证' },
            { id: 'attempts', label: '尝试记录' },
            { id: 'reviews', label: '评价' },
            { id: 'more', label: '更多' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[24px] shadow-soft"
          variant="dashboard"
          ariaLabel="POS详情内容分区"
        />

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-accent-yellow" />
                      <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">商家信息</h3>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-xs font-semibold text-gray-400">商户交易名称</div>
                        <div className="text-sm font-semibold text-soft-black dark:text-gray-100 mt-1">
                          {pos.merchant_info?.transaction_name || '待勘察'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-xs font-semibold text-gray-400">商户交易类型</div>
                        <div className="text-sm font-semibold text-soft-black dark:text-gray-100 mt-1">
                          {pos.merchant_info?.transaction_type || '待勘察'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>

                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-accent-yellow" />
                      <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">设备与收单</h3>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-xs font-semibold text-gray-400">POS机型号</div>
                        <div className="text-sm font-semibold text-soft-black dark:text-gray-100 mt-1">
                          {pos.basic_info?.model || '待勘察'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-xs font-semibold text-gray-400">收单机构</div>
                        <div className="text-sm font-semibold text-soft-black dark:text-gray-100 mt-1">
                          {pos.basic_info?.acquiring_institution || '待勘察'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-xs font-semibold text-gray-400">收银位置</div>
                        <div className="text-sm font-semibold text-soft-black dark:text-gray-100 mt-1">
                          {pos.basic_info?.checkout_location || '待勘察'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-xs font-semibold text-gray-400">设备状态</div>
                        <div className="text-sm font-semibold text-soft-black dark:text-gray-100 mt-1">
                          {pos.status === 'active'
                            ? '正常运行'
                            : pos.status === 'inactive'
                            ? '暂时不可用'
                            : pos.status === 'maintenance'
                            ? '维修中'
                            : '已停用'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              </div>

              {pos.remarks && (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-accent-yellow" />
                      <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">备注信息</h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pos.remarks}</p>
                  </CardContent>
                </AnimatedCard>
              )}
            </>
          )}

          {activeTab === 'payment' && (
            <>
              {hasManualPaymentData || attempts.length > 0 ? (
                <>
                  <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                    <CardContent className="p-6 md:p-7 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="grid flex-1 grid-cols-2 sm:grid-cols-4 gap-3">
                          {supportSummaryCards.map((card) => (
                            <div key={card.key} className="rounded-2xl border border-gray-100 bg-gray-50/80 px-3 py-3 text-center">
                              <div className={`text-lg font-semibold ${supportSummaryValueClassMap[card.key]}`}>{card.value}</div>
                              <div className="text-[11px] text-gray-500">{card.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 shadow-soft">
                          <Clock className="mr-1.5 h-3.5 w-3.5 text-accent-yellow" />
                          尝试记录 {attempts.length} 条
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {supportFusionSections.map((section) => {
                      const SectionIcon = section.icon
                      const isDeviceSection = section.key === 'device-acquiring'
                      const useListLayout = section.key === 'payment-method' || section.key === 'cvm'

                      return (
                        <AnimatedCard
                          key={section.key}
                          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft"
                          variant="elevated"
                          hoverable
                        >
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <SectionIcon className="w-5 h-5 text-accent-yellow" />
                                <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">{section.title}</h3>
                              </div>
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-500">
                                {section.items.length} 项
                              </span>
                            </div>

                            {section.items.length > 0 ? (
                              isDeviceSection ? (
                                <div className="space-y-3">
                                  {(section.groups || []).map((group) => (
                                    <div key={group.key} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                                      <div className="text-xs font-semibold text-gray-400">{group.title}</div>
                                      {group.items.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                          {group.items.map((item) => {
                                            const unifiedNote = getUnifiedSupportNote(item)
                                            return (
                                              <button
                                                key={`${group.key}-${item.key}`}
                                                type="button"
                                                onClick={() => openSupportDetailDrawer(section, item)}
                                                className={`w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left transition-all hover:border-accent-yellow/40 hover:bg-cream/30 cursor-pointer ${
                                                  item.hasConflict ? 'ring-1 ring-amber-300/70' : ''
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <p className="text-sm font-semibold text-soft-black dark:text-gray-100">{item.label}</p>
                                                  <div className="flex items-center gap-2">
                                                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${supportStateBadgeClassMap[item.resolvedState]}`}>
                                                      {supportStateLabelMap[item.resolvedState]}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-gray-300" />
                                                  </div>
                                                </div>
                                                <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                                                  {unifiedNote || '点击查看相关尝试记录'}
                                                </p>
                                                {item.hasConflict && (
                                                  <div className="mt-2">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                      <AlertTriangle className="h-3 w-3" />
                                                      需复核
                                                    </span>
                                                  </div>
                                                )}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className="mt-3 text-xs text-gray-500">暂无相关记录</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className={useListLayout ? 'space-y-2.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                                  {section.items.map((item) => {
                                    const unifiedNote = getUnifiedSupportNote(item)
                                    const MethodIcon = section.key === 'payment-method' ? (paymentMethodIconMap[item.key] || CreditCard) : null

                                    return (
                                      <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => openSupportDetailDrawer(section, item)}
                                        className={`w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left transition-all hover:border-accent-yellow/40 hover:bg-cream/30 cursor-pointer ${
                                          item.hasConflict ? 'ring-1 ring-amber-300/70' : ''
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-center gap-3">
                                            {MethodIcon && (
                                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-500">
                                                <MethodIcon className="h-4 w-4" />
                                              </span>
                                            )}
                                            <p className="text-sm font-semibold text-soft-black dark:text-gray-100">{item.label}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${supportStateBadgeClassMap[item.resolvedState]}`}>
                                              {supportStateLabelMap[item.resolvedState]}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-gray-300" />
                                          </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                                          {unifiedNote || '点击查看相关尝试记录'}
                                        </p>
                                        {item.hasConflict && (
                                          <div className="mt-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                              <AlertTriangle className="h-3 w-3" />
                                              需复核
                                            </span>
                                          </div>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )
                            ) : (
                              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-center text-sm text-gray-500">
                                暂无可展示数据
                              </div>
                            )}
                          </CardContent>
                        </AnimatedCard>
                      )
                    })}
                  </div>

                  {pos.fees && (
                    <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-accent-yellow" />
                          <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">付款手续费</h3>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(pos.fees).map(([network, fee]) => {
                            if (!fee.enabled) return null

                            const displayInfo = feeUtils.getFeeDisplayInfo(fee)

                            return (
                              <div key={network} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-6 rounded-lg bg-white shadow-soft flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-soft-black">
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
                                    <div className="text-sm font-semibold text-soft-black dark:text-gray-100">
                                      {getCardNetworkLabel(network)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {fee.type === 'percentage' ? '百分比费率' : '固定金额'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-soft-black dark:text-gray-100">
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
                            <div className="text-center text-sm text-gray-500">暂无手续费配置</div>
                          )}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  )}
                </>
              ) : (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardContent className="p-6 text-center text-sm text-gray-500">
                    暂无支付能力数据，请先补充基础配置或新增尝试记录。
                  </CardContent>
                </AnimatedCard>
              )}
            </>
          )}

          {activeTab === 'attempts' && (
            <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                    <Clock className="w-5 h-5 text-accent-yellow" />
                    尝试记录
                  </CardTitle>
                  {permissions.canAdd && (
                    <AnimatedButton onClick={openAttemptModal} size="sm">
                      <Clock className="w-4 h-4 mr-2" />
                      记录尝试
                    </AnimatedButton>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {attempts.length > 0 ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-soft-black dark:text-gray-100">{attempts.length}</div>
                          <div className="text-xs text-gray-500">总尝试</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{attempts.filter(a => a.result === 'success').length}</div>
                          <div className="text-xs text-gray-500">成功</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{attempts.filter(a => a.result === 'failure').length}</div>
                          <div className="text-xs text-gray-500">失败</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-soft-black dark:text-gray-100">
                            {attempts.length > 0 ? Math.round((attempts.filter(a => a.result === 'success').length / attempts.length) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500">成功率</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {attempts.map((attempt) => (
                        <div key={attempt.id} className="rounded-2xl border border-gray-100 bg-white/90 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500">
                              {new Date(attempt.created_at).toLocaleDateString('zh-CN')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                attempt.result === 'success'
                                  ? 'bg-green-100 text-green-700'
                                  : attempt.result === 'failure'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {getResultLabel(attempt.result)}
                              </span>
                              {attempt.is_conclusive_failure && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">明确失败</span>
                              )}
                              {user && attempt.user_id === user.id && (
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">卡片名称：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.card_name || '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">卡组织：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.card_network ? getCardNetworkLabel(attempt.card_network) : '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">支付方式：</span>
                              <span className="text-soft-black dark:text-gray-100">{getPaymentMethodLabel(attempt.payment_method) || '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">CVM：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.cvm || '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">收单模式：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.acquiring_mode || '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">设备状态：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.device_status || '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">收单机构：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.acquiring_institution || '未记录'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">结账地点：</span>
                              <span className="text-soft-black dark:text-gray-100">{attempt.checkout_location || '未记录'}</span>
                            </div>
                            {attempt.attempted_at && (
                              <div>
                                <span className="text-gray-500">发生时间：</span>
                                <span className="text-soft-black dark:text-gray-100">{new Date(attempt.attempted_at).toLocaleString('zh-CN')}</span>
                              </div>
                            )}
                          </div>
                          {attempt.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                              备注：{attempt.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 py-6">暂无尝试记录</div>
                )}
              </CardContent>
            </AnimatedCard>
          )}

          {activeTab === 'reviews' && (
            <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                    <MessageCircle className="w-5 h-5 text-accent-yellow" />
                    用户评价
                  </CardTitle>
                  {permissions.canAdd && (
                    <AnimatedButton onClick={() => setShowReviewModal(true)} size="sm">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      写评价
                    </AnimatedButton>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-6">暂无评价</div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-gray-100 bg-white/90 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-soft-black dark:text-gray-100">
                              {review.users?.display_name || '匿名用户'}
                            </span>
                            <div className="flex">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </AnimatedCard>
          )}

          {activeTab === 'more' && (
            <>
              {permissions.isAdmin && (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-soft-black dark:text-gray-100">申报记录</CardTitle>
                    <CardDescription className="text-sm text-gray-500">管理员可在此处理 POS 机相关申报</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {posReports.map((report) => (
                      <div key={report.id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-soft-black dark:text-gray-100">{report.issueType}</h4>
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

              {externalLinks.length > 0 && (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                      <ExternalLink className="w-5 h-5 text-accent-yellow" />
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
                          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-soft-black hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium">{link.title}</span>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </AnimatedCard>
              )}

              {pos.extended_fields && Object.keys(pos.extended_fields).length > 0 && (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                      <Settings className="w-5 h-5 text-accent-yellow" />
                      其他信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(pos.extended_fields).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm">
                          <span className="text-gray-500">{key}</span>
                          <span className="font-semibold text-soft-black dark:text-gray-100">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </AnimatedCard>
              )}

              <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                    <Download className="w-5 h-5 text-accent-yellow" />
                    导出记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <AnimatedButton onClick={() => setShowExportModal(true)} size="sm">
                      选择导出格式
                    </AnimatedButton>
                    <AnimatedButton onClick={() => setShowReportModal(true)} variant="outline" size="sm">
                      申报问题
                    </AnimatedButton>
                  </div>
                </CardContent>
              </AnimatedCard>
            </>
          )}

            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur pb-safe-bottom">
              <div className="grid grid-cols-4 gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={isMobileActionsDisabled}
                  className="flex flex-col items-center justify-center gap-1 text-xs text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="收藏"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                  收藏
                </button>
                <button
                  type="button"
                  onClick={handleNavigateToMap}
                  disabled={isMobileActionsDisabled}
                  className="flex flex-col items-center justify-center gap-1 text-xs text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="导航"
                >
                  <MapPin className="w-5 h-5 text-gray-400" />
                  导航
                </button>
                <button
                  type="button"
                  onClick={handleAttemptClick}
                  disabled={isMobileActionsDisabled}
                  className="flex flex-col items-center justify-center gap-1 text-xs text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="记录尝试"
                >
                  <Clock className="w-5 h-5 text-gray-400" />
                  尝试
                </button>
                <button
                  type="button"
                  onClick={handleReviewClick}
                  disabled={isMobileActionsDisabled}
                  className="flex flex-col items-center justify-center gap-1 text-xs text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="写评价"
                >
                  <MessageCircle className="w-5 h-5 text-gray-400" />
                  评价
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {!showAttemptModal && supportDetailTarget && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" onClick={closeSupportDetailDrawer} />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
              className="absolute right-6 top-6 bottom-6 w-[min(48%,720px)] bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/60 flex flex-col overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <SupportDetailIcon className="w-4 h-4 text-accent-yellow" />
                  条目尝试记录
                </div>
                <button
                  type="button"
                  onClick={closeSupportDetailDrawer}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-gray-100 bg-white/90">
                <div className="text-base font-semibold text-soft-black">{supportDetailTarget.itemLabel}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">{supportDetailTarget.sectionTitle}</span>
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${supportStateBadgeClassMap[supportDetailTarget.resolvedState]}`}>
                    {supportStateLabelMap[supportDetailTarget.resolvedState]}
                  </span>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                    相关尝试 {supportDetailAttempts.length} 条
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {supportDetailAttempts.length > 0 ? (
                  <div className="space-y-3">
                    {supportDetailAttempts.map((attempt) => (
                      <div key={attempt.id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-500">{formatAttemptDateTime(attempt)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            attempt.result === 'success'
                              ? 'bg-green-100 text-green-700'
                              : attempt.result === 'failure'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getResultLabel(attempt.result)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">卡组织：</span>
                            <span className="text-soft-black">{attempt.card_network ? getCardNetworkLabel(attempt.card_network) : '未记录'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">支付方式：</span>
                            <span className="text-soft-black">{getPaymentMethodLabel(attempt.payment_method) || '未记录'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">验证方式：</span>
                            <span className="text-soft-black">{attempt.cvm || '未记录'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">收单模式：</span>
                            <span className="text-soft-black">{attempt.acquiring_mode || '未记录'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">设备状态：</span>
                            <span className="text-soft-black">{attempt.device_status || '未记录'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">收单机构：</span>
                            <span className="text-soft-black">{attempt.acquiring_institution || '未记录'}</span>
                          </div>
                        </div>
                        {attempt.notes && (
                          <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
                            备注：{attempt.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center text-sm text-gray-500">
                    暂无与 {supportDetailTarget.itemLabel} 相关的尝试记录。
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 p-5 bg-white/80">
                <button
                  type="button"
                  onClick={closeSupportDetailDrawer}
                  className="w-full px-4 py-3 rounded-2xl text-sm font-semibold text-white bg-soft-black hover:bg-accent-yellow transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAttemptModal && (
        <>
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
        </>
      )}

      {/* 添加尝试记录独立页面 */}
      <AnimatePresence>
        {showAttemptModal && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-cream dark:bg-slate-950" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-gradient-to-br from-accent-yellow/20 via-indigo-200/40 to-transparent blur-3xl" />
              <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-blue-200/50 via-white/60 to-transparent blur-3xl" />
            </div>

            <motion.div
              className="relative flex min-h-screen flex-col"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="sticky top-0 z-20 border-b border-white/70 dark:border-slate-800 bg-cream/90 dark:bg-slate-950/90 backdrop-blur pt-safe-top">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAttemptModal(false)}
                      className="h-10 w-10 rounded-full bg-white shadow-soft border border-white/70 text-gray-600 hover:text-soft-black hover:bg-gray-50 transition-colors dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-slate-800"
                      aria-label="返回"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">记录尝试</p>
                      <h2 className="text-xl font-semibold text-soft-black dark:text-gray-100">添加尝试记录</h2>
                      <p className="text-sm text-gray-500">
                        {pos?.merchant_name}
                        {pos?.address ? ` · ${pos.address}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-white/60 px-3 py-1 text-xs font-semibold text-gray-500 shadow-soft dark:bg-slate-900/80 dark:border-slate-800 dark:text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-accent-yellow" />
                      已有 {attemptsCount} 条记录
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12 ${isAlbumPickerOpen ? 'blur-sm' : ''}`}>
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-white/60 px-3 py-1 text-xs font-semibold text-gray-500 shadow-soft">
                          <Clock className="w-3.5 h-3.5 text-accent-yellow" />
                          已有 {attemptsCount} 条记录
                        </span>
                        <button
                          type="button"
                          onClick={addAttemptRow}
                          className="px-4 py-2 rounded-2xl text-xs font-semibold bg-cream text-soft-black hover:bg-accent-yellow/20 transition-colors"
                        >
                          + 添加记录
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
                      <div className="space-y-8">
                        {attemptsCount === 0 ? (
                          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/90 p-6 text-sm text-gray-500">
                            还没有添加尝试记录，点击“添加记录”开始填写。
                          </div>
                        ) : (
                          attemptsList.map((attempt, index) => (
                            <div key={`attempt-${index}`} className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">
                                  尝试 {index + 1}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttempt(index)}
                                  className="text-xs font-semibold text-red-500 hover:text-red-600"
                                >
                                  删除
                                </button>
                              </div>

                              <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-6 sm:p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">尝试结果</h3>
                                    <p className="text-sm text-gray-500 mt-1">记录卡片与支付方式的实际表现。</p>
                                  </div>
                                  <span className="text-xs text-gray-400">* 为必填</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {attemptResultOptions.map((option) => {
                                    const Icon = option.icon
                                    const isSelected = attempt.result === option.value
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateAttempt(index, 'result', option.value)}
                                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                                          isSelected
                                            ? 'bg-soft-black text-white border-soft-black shadow-lg shadow-blue-900/20'
                                            : 'bg-white/90 border-gray-200 text-gray-700 hover:border-accent-yellow/40 hover:bg-white'
                                        }`}
                                      >
                                        <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-white' : option.iconClass}`} />
                                        <div>
                                          <div className="text-sm font-semibold">{option.label}</div>
                                          <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                            {option.description}
                                          </div>
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">卡片名称</label>
                                    <input
                                      type="text"
                                      value={attempt.card_name || ''}
                                      onChange={(e) => updateAttempt(index, 'card_name', e.target.value)}
                                      placeholder="如 Visa Signature"
                                      className={attemptFieldBase}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">卡组织</label>
                                    <select
                                      value={attempt.card_network || ''}
                                      onChange={(e) => updateAttempt(index, 'card_network', e.target.value)}
                                      className={attemptSelectBase}
                                    >
                                      <option value="">请选择卡组织</option>
                                      {CARD_NETWORKS.map((scheme) => (
                                        <option key={scheme.value} value={scheme.value}>{scheme.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">发生时间</label>
                                    <input
                                      type="datetime-local"
                                      className={attemptFieldBase}
                                      value={attempt.attempted_at ? attempt.attempted_at.slice(0, 16) : ''}
                                      onChange={(e) => updateAttempt(index, 'attempted_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                    />
                                  </div>
                                </div>
                              </section>

                              <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-6 sm:p-8 space-y-6">
                                <div className="flex items-center gap-2 text-sm font-semibold text-soft-black dark:text-gray-100">
                                  <CreditCard className="w-4 h-4 text-accent-yellow" />
                                  支付方式与验证
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">支付方式</label>
                                    <select
                                      value={attempt.payment_method || ''}
                                      onChange={(e) => updateAttempt(index, 'payment_method', e.target.value)}
                                      className={attemptSelectBase}
                                    >
                                      <option value="">请选择支付方式</option>
                                      <option value="tap">实体卡 Tap</option>
                                      <option value="insert">实体卡 Insert</option>
                                      <option value="swipe">实体卡 Swipe</option>
                                      <option value="apple_pay">Apple Pay</option>
                                      <option value="google_pay">Google Pay</option>
                                      <option value="hce">HCE</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">验证方式 (CVM)</label>
                                    <select
                                      value={attempt.cvm || 'unknown'}
                                      onChange={(e) => updateAttempt(index, 'cvm', e.target.value)}
                                      className={attemptSelectBase}
                                    >
                                      <option value="unknown">未知</option>
                                      <option value="no_pin">免密</option>
                                      <option value="pin">PIN</option>
                                      <option value="signature">签名</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">收单模式</label>
                                    <select
                                      value={attempt.acquiring_mode || 'unknown'}
                                      onChange={(e) => updateAttempt(index, 'acquiring_mode', e.target.value)}
                                      className={attemptSelectBase}
                                    >
                                      <option value="unknown">未知</option>
                                      <option value="DCC">DCC</option>
                                      <option value="EDC">EDC</option>
                                    </select>
                                  </div>
                                </div>
                              </section>

                              <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-6 sm:p-8 space-y-6">
                                <div className="flex items-center gap-2 text-sm font-semibold text-soft-black dark:text-gray-100">
                                  <Settings className="w-4 h-4 text-accent-yellow" />
                                  设备与收单信息
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">设备状态</label>
                                    <SystemSelect
                                      dataType="device_status"
                                      value={attempt.device_status || 'active'}
                                      onChange={(value) => updateAttempt(index, 'device_status', value)}
                                      placeholder="请选择设备状态"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">收单机构</label>
                                    <SystemSelect
                                      dataType="acquiring_institution"
                                      value={attempt.acquiring_institution || ''}
                                      onChange={(value) => updateAttempt(index, 'acquiring_institution', value)}
                                      placeholder="请选择收单机构"
                                      allowCustom
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">结账地点</label>
                                    <SystemSelect
                                      dataType="checkout_locations"
                                      value={attempt.checkout_location || ''}
                                      onChange={(value) => updateAttempt(index, 'checkout_location', value)}
                                      placeholder="请选择结账地点"
                                    />
                                  </div>
                                </div>

                                <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
                                  <input
                                    id={`attempt-conclusive-${index}`}
                                    type="checkbox"
                                    checked={Boolean(attempt.is_conclusive_failure)}
                                    onChange={(e) => updateAttempt(index, 'is_conclusive_failure', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-accent-yellow focus:ring-accent-yellow/40"
                                  />
                                  明确失败（会被计入“不支持”结果）
                                </label>
                              </section>

                              <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[32px] shadow-soft p-6 sm:p-8 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-soft-black dark:text-gray-100">
                                  <FileText className="w-4 h-4 text-accent-yellow" />
                                  备注
                                </div>
                                <textarea
                                  value={attempt.notes || ''}
                                  onChange={(e) => updateAttempt(index, 'notes', e.target.value)}
                                  placeholder="例如：需要签名，或被拒原因"
                                  rows={4}
                                  className={attemptTextareaBase}
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => saveAttemptAsCommonCard(index)}
                                    className="text-xs font-semibold text-soft-black bg-cream px-4 py-2 rounded-xl hover:bg-accent-yellow/20 transition-colors"
                                  >
                                    保存为常用卡
                                  </button>
                                  {commonCards.length > 0 && (
                                    <select
                                      className="text-xs bg-white/90 border border-gray-200 rounded-xl px-3 py-2"
                                      defaultValue=""
                                      onChange={(e) => {
                                        const selected = parseInt(e.target.value, 10)
                                        if (!Number.isNaN(selected)) applyCommonCard(index, selected)
                                      }}
                                    >
                                      <option value="">快速填充常用卡</option>
                                      {commonCards.map((card, cardIndex) => (
                                        <option key={`${card.name}-${cardIndex}`} value={cardIndex}>
                                          {card.name}{card.method ? ` · ${card.method}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </section>
                            </div>
                          ))
                        )}
                      </div>
                      {attemptSidebar}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/70 dark:border-slate-800 bg-cream/90 dark:bg-slate-950/90 backdrop-blur pb-safe-bottom">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAttemptModal(false)}
                    className="px-6 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={submitAttempt}
                    disabled={submittingAttempt}
                    className="px-8 py-3 rounded-2xl font-semibold text-white bg-soft-black hover:bg-accent-yellow shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingAttempt ? '提交中...' : '提交记录'}
                  </button>
                </div>
              </div>
            </motion.div>

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
          </motion.div>
        )}
      </AnimatePresence>

      {!showAttemptModal && (
        <>
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
        </>
      )}
    </div>
  )
}

export default POSDetail
