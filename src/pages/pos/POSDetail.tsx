import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Building, CheckCircle, ChevronRight, Clock, CreditCard, Download, Edit, ExternalLink, FileText, Heart, HelpCircle, MapPin, MessageCircle, RefreshCcw, Settings, Shield, Smartphone, Star, Trash2, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
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
import { getCardNetworkValue } from '@/lib/cardMetadata'
import { getPaymentMethodLabel } from '@/lib/utils'
import { getErrorDetails, notify } from '@/lib/notify'
import { extractMissingColumnFromError } from '@/lib/postgrestCompat'
import { checkAndUpdatePOSStatus, calculatePOSSuccessRate, POSStatus, refreshMapData, updatePOSStatus } from '@/utils/posStatusUtils'
import { buildRefreshedExtendedFields, derivePOSFromAttempts, readPOSAttemptRefreshMeta } from '@/utils/posRefreshLogic'
import { exportToHTML, exportToJSON, exportToPDF, getFormatDisplayName, getStyleDisplayName, type CardStyle, type ExportFormat } from '@/utils/exportUtils'
import { sanitizeExternalUrl, sanitizePlainText } from '@/utils/sanitize'
import { feeUtils } from '@/types/fees'
import type { CardAlbumItem } from '@/stores/useCardAlbumStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { POSMachine } from '@/types'
import { posService } from '@/services/posService'

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

type SafeExternalLink = ExternalLinkType & {
  safeUrl: string
}

interface Attempt {
  id: string
  created_at: string
  result: 'success' | 'failure' | 'unknown'
  card_album_card_id?: string
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

interface AttemptUserRecord {
  id: string
  email?: string | null
  user_metadata?: {
    display_name?: string
    full_name?: string
    name?: string
  } | null
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
  card_album_card_id?: string
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
const POS_ATTEMPTS_UPGRADE_HINT =
  '请先执行 supabase/migrations/014_ensure_pos_records_columns.sql 与 supabase/migrations/015_add_pos_album_card_reference.sql（或最新迁移），并刷新 PostgREST schema cache。'
type SchemeID = typeof CARD_NETWORKS[number]['value']
type AttemptAlbumBinding = {
  cardId: string
  cardName: string
  networkValues: SchemeID[]
}

const DATETIME_LOCAL_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const padDateTimePart = (value: number) => String(value).padStart(2, '0')

const toDateTimeLocalValue = (value?: string) => {
  if (!value) return ''
  if (DATETIME_LOCAL_VALUE_PATTERN.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return `${parsed.getFullYear()}-${padDateTimePart(parsed.getMonth() + 1)}-${padDateTimePart(parsed.getDate())}T${padDateTimePart(parsed.getHours())}:${padDateTimePart(parsed.getMinutes())}`
}

const getCurrentDateTimeLocalValue = () => toDateTimeLocalValue(new Date().toISOString())

const normalizeAttemptedAt = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

const getAlbumCardOrganizationLabels = (card: Pick<CardAlbumItem, 'organization' | 'secondaryOrganization'>) => {
  return Array.from(
    new Set([card.organization, card.secondaryOrganization].map((item) => item?.trim()).filter(Boolean))
  )
}

const getAlbumCardNetworkValues = (card: Pick<CardAlbumItem, 'organization' | 'secondaryOrganization'>): SchemeID[] => {
  return Array.from(
    new Set(
      getAlbumCardOrganizationLabels(card)
        .map((organization) => getCardNetworkValue(organization))
        .filter((value): value is SchemeID => Boolean(value))
    )
  )
}

const POSDetail = () => {
  const { t, i18n } = useTranslation()
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
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [refreshingPOS, setRefreshingPOS] = useState(false)
  const [showAttemptModal, setShowAttemptModal] = useState(false)
  const [draftAttempts, setDraftAttempts] = useState<AttemptDraft[]>([])
  const [commonCards, setCommonCards] = useState<Array<{ name: string; method?: string }>>([])
  const [isAlbumPickerOpen, setIsAlbumPickerOpen] = useState(false)
  const safeExternalLinks = useMemo<SafeExternalLink[]>(() => {
    return externalLinks.reduce<SafeExternalLink[]>((acc, link) => {
      const safeUrl = sanitizeExternalUrl(link.url)
      if (!safeUrl) return acc
      acc.push({
        ...link,
        safeUrl,
      })
      return acc
    }, [])
  }, [externalLinks])
  const [albumScopeFilter, setAlbumScopeFilter] = useState<'personal' | 'public'>('personal')
  const [selectedAlbumCard, setSelectedAlbumCard] = useState('')
  const [attemptAlbumBindings, setAttemptAlbumBindings] = useState<Record<number, AttemptAlbumBinding>>({})
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
  const [attemptUserNames, setAttemptUserNames] = useState<Record<string, string>>({})

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
  const localeTag = useMemo(() => {
    const lang = (i18n.resolvedLanguage || i18n.language || 'zh').toLowerCase()
    if (lang.startsWith('en')) return 'en-US'
    if (lang.startsWith('de')) return 'de-DE'
    if (lang.startsWith('ru')) return 'ru-RU'
    return 'zh-CN'
  }, [i18n.language, i18n.resolvedLanguage])
  const unknownLabel = t('attemptRecord.unknown', { defaultValue: '未知' })
  const anonymousUserLabel = t('attemptRecord.user.anonymous', { defaultValue: '匿名用户' })
  const getFirstText = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value
    }
    return ''
  }
  const currentUserLabel =
    getFirstText(
      user?.user_metadata?.display_name,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
      user?.email?.split('@')[0]
    ) || anonymousUserLabel

  const createAttemptDraft = (): AttemptDraft => ({
    result: 'success',
    attempted_at: getCurrentDateTimeLocalValue(),
    card_network: '',
    payment_method: 'tap',
    cvm: 'unknown',
    acquiring_mode: 'unknown',
    device_status: pos?.status || 'active',
    acquiring_institution: pos?.basic_info?.acquiring_institution || '',
    checkout_location: pos?.basic_info?.checkout_location,
    card_album_card_id: '',
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
    if (field === 'card_name') {
      setAttemptAlbumBindings((prev) => {
        const binding = prev[index]
        if (!binding) return prev
        const nextName = typeof value === 'string' ? value.trim() : ''
        if (nextName === binding.cardName) {
          return prev
        }
        const { [index]: _removed, ...rest } = prev
        return rest
      })
    }
    setDraftAttempts((prev) =>
      prev.map((attempt, i) => {
        if (i !== index) return attempt
        if (field === 'result' && value !== 'failure') {
          return { ...attempt, [field]: value, is_conclusive_failure: false }
        }
        if (field === 'card_name') {
          const nextCardName = typeof value === 'string' ? value.trim() : ''
          const currentCardName = attempt.card_name?.trim() || ''
          const nextAttempt = { ...attempt, [field]: value }
          if (attempt.card_album_card_id && nextCardName !== currentCardName) {
            nextAttempt.card_album_card_id = ''
          }
          return nextAttempt
        }
        return { ...attempt, [field]: value }
      })
    )
  }

  const removeAttempt = (index: number) => {
    setAttemptAlbumBindings((prev) => {
      const next: Record<number, AttemptAlbumBinding> = {}
      Object.entries(prev).forEach(([key, binding]) => {
        const parsedIndex = Number(key)
        if (Number.isNaN(parsedIndex) || parsedIndex === index) return
        next[parsedIndex > index ? parsedIndex - 1 : parsedIndex] = binding
      })
      return next
    })
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
  const attemptSuccessRate = attemptsCount > 0 ? Math.round((attemptSuccessCount / attemptsCount) * 100) : null
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
    const organizations = getAlbumCardOrganizationLabels(card).join(' / ')
    return `${card.title} · ${card.issuer} · ${organizations} (${getAlbumScopeLabel(card.scope)})`
  }, [albumCards, selectedAlbumCard])

  const filteredAlbumCards = useMemo(() => {
    return albumCards.filter((card) => card.scope === albumScopeFilter)
  }, [albumCards, albumScopeFilter])

  const albumCardsById = useMemo(() => {
    const map = new Map<string, CardAlbumItem>()
    albumCards.forEach((card) => {
      map.set(card.id, card)
    })
    return map
  }, [albumCards])

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
    const networkValues = getAlbumCardNetworkValues(selectedCard)
    updateAttempt(targetIndex, 'card_name', cardLabel)
    updateAttempt(targetIndex, 'card_album_card_id', selectedCard.id)
    if (networkValues.length === 1) {
      updateAttempt(targetIndex, 'card_network', networkValues[0])
      setAttemptAlbumBindings((prev) => {
        const { [targetIndex]: _removed, ...rest } = prev
        return rest
      })
    } else if (networkValues.length > 1) {
      updateAttempt(targetIndex, 'card_network', '')
      setAttemptAlbumBindings((prev) => ({
        ...prev,
        [targetIndex]: {
          cardId: selectedCard.id,
          cardName: cardLabel,
          networkValues,
        },
      }))
    }
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
            <div className="text-lg font-semibold text-blue-600">
              {attemptSuccessRate === null ? '无数据' : `${attemptSuccessRate}%`}
            </div>
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

  const getAttemptResultText = (result?: string) => {
    if (result === 'success') return t('attemptRecord.result.success', { defaultValue: '成功' })
    if (result === 'failure') return t('attemptRecord.result.failure', { defaultValue: '失败' })
    return t('attemptRecord.result.unknown', { defaultValue: '未知' })
  }

  const getAttemptCvmLabel = (value?: string | null) => {
    if (!value || value === 'unknown') return unknownLabel
    if (value === 'no_pin') return t('attemptRecord.cvm.no_pin', { defaultValue: '免密' })
    if (value === 'pin') return t('attemptRecord.cvm.pin', { defaultValue: 'PIN' })
    if (value === 'signature') return t('attemptRecord.cvm.signature', { defaultValue: '签名' })
    return value
  }

  const getAttemptAcquiringModeLabel = (value?: string | null) => {
    if (!value || value === 'unknown') return unknownLabel
    if (value === 'DCC') return t('attemptRecord.acquiringMode.dcc', { defaultValue: 'DCC' })
    if (value === 'EDC') return t('attemptRecord.acquiringMode.edc', { defaultValue: 'EDC' })
    return value
  }

  const getAttemptDeviceStatusLabel = (value?: string | null) => {
    if (!value) return unknownLabel
    if (value === 'active') return t('attemptRecord.deviceStatus.active', { defaultValue: '正常运行' })
    if (value === 'inactive') return t('attemptRecord.deviceStatus.inactive', { defaultValue: '暂时不可用' })
    if (value === 'maintenance') return t('attemptRecord.deviceStatus.maintenance', { defaultValue: '维修中' })
    if (value === 'disabled') return t('attemptRecord.deviceStatus.disabled', { defaultValue: '已停用' })
    return value
  }

  const getAttemptCheckoutLocationLabel = (value?: string | null) => {
    if (!value) return unknownLabel
    if (value === '自助收银') return t('attemptRecord.checkout.self', { defaultValue: '自助收银' })
    if (value === '人工收银') return t('attemptRecord.checkout.manual', { defaultValue: '人工收银' })
    return value
  }

  const getAttemptUserLabel = (attempt: Attempt) => {
    const fallback = anonymousUserLabel
    const attemptUserId = attempt.user_id
    if (!attemptUserId) return fallback
    const fromMap = attemptUserNames[attemptUserId]
    if (fromMap) return fromMap
    if (user?.id === attemptUserId) {
      return currentUserLabel
    }
    return fallback
  }

  const openAlbumCardDetail = (cardId: string) => {
    if (!cardId) return
    const query = new URLSearchParams({ cardId })
    navigate(`/app/card-album?${query.toString()}`)
  }

  const getAttemptCardMeta = (attempt: Attempt) => {
    const linkedId = attempt.card_album_card_id?.trim()
    if (!linkedId) {
      return {
        label: attempt.card_name?.trim() || '未记录',
        linkedCardId: '',
        isLinked: false,
      }
    }
    const linkedCard = albumCardsById.get(linkedId)
    if (!linkedCard) {
      return {
        label: attempt.card_name?.trim() || '关联卡片已不存在',
        linkedCardId: linkedId,
        isLinked: false,
      }
    }
    return {
      label: `${linkedCard.issuer} ${linkedCard.title}`.trim(),
      linkedCardId: linkedCard.id,
      isLinked: true,
    }
  }

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
      description: '结账位置 / 收单机构',
      icon: Settings,
      items: deviceAndAcquiringGroups.flatMap((group) => group.items),
      groups: deviceAndAcquiringGroups,
    },
  ]

  const deviceAcquiringSection = supportFusionSections.find((section) => section.key === 'device-acquiring') || null
  const paymentSupportSections = supportFusionSections.filter((section) => section.key !== 'device-acquiring')

  const allFusionItems = paymentSupportSections.flatMap((section) => section.items)
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
    supported: 'bg-green-100 text-green-700 border border-green-200',
    unsupported: 'bg-red-100 text-red-700 border border-red-200',
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
  ): 'card_network' | 'payment_method' | 'cvm' | 'acquiring_mode' | 'checkout_location' | 'acquiring_institution' | null => {
    if (sectionKey === 'network') return 'card_network'
    if (sectionKey === 'payment-method') return 'payment_method'
    if (sectionKey === 'cvm') return 'cvm'
    if (sectionKey === 'acquiring-mode') return 'acquiring_mode'
    if (sectionKey === 'device-acquiring') {
      if (itemKey === '自助收银' || itemKey === '人工收银') return 'checkout_location'
      return 'acquiring_institution'
    }
    return null
  }

  const getAttemptTimestamp = (attempt: Attempt) => {
    const timestamp = new Date(attempt.attempted_at || attempt.created_at).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  const formatAttemptDate = (attempt: Attempt) => {
    return new Date(attempt.attempted_at || attempt.created_at).toLocaleDateString(localeTag)
  }

  const formatAttemptDateTime = (attempt: Attempt) => {
    return new Date(attempt.attempted_at || attempt.created_at).toLocaleString(localeTag)
  }

  const getRelatedAttemptsForSupportItem = (sectionKey: string, itemKey: string) => {
    const field = getSupportAttemptField(sectionKey, itemKey)
    if (!field) return []
    return [...attempts]
      .filter((attempt) => attempt[field] === itemKey)
      .sort((left, right) => getAttemptTimestamp(right) - getAttemptTimestamp(left))
  }

  const supportDetailAttempts = supportDetailTarget
    ? getRelatedAttemptsForSupportItem(supportDetailTarget.sectionKey, supportDetailTarget.itemKey)
    : []

  const supportDetailSection = supportDetailTarget
    ? supportFusionSections.find((section) => section.key === supportDetailTarget.sectionKey) || null
    : null
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
    // 这些加载函数共享同一批查询参数，避免 useCallback 链式依赖导致重复拉取。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  useEffect(() => {
    if (pos) {
      loadExternalLinks(pos)
    } else {
      setExternalLinks([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  useEffect(() => {
    if (activeTab !== 'payment' && supportDetailTarget) {
      closeSupportDetailDrawer()
    }
  }, [activeTab, supportDetailTarget])

  useBodyScrollLock(Boolean(supportDetailTarget), { includeHtml: true })
  useBodyScrollLock(isAlbumPickerOpen, { includeHtml: true })
  useBodyScrollLock(showDeleteModal, { includeHtml: true })

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
    const sanitizedIssueType = sanitizePlainText(reportForm.issueType, { maxLength: 80 })
    const sanitizedDescription = sanitizePlainText(reportForm.description, {
      maxLength: 1000,
      preserveLineBreaks: true,
    })
    const sanitizedContact = sanitizePlainText(reportForm.contact, { maxLength: 120 })

    if (!sanitizedIssueType || !sanitizedDescription) {
      notify.error('请补充申报类型与问题描述')
      return
    }

    addReport({
      itemType: 'pos',
      itemId: pos.id,
      itemLabel: pos.merchant_name,
      issueType: sanitizedIssueType,
      description: sanitizedDescription,
      contact: sanitizedContact || undefined,
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

  const loadAttemptUserNames = async (attemptRows: Attempt[]) => {
    const userIds = Array.from(new Set(attemptRows.map((attempt) => attempt.user_id).filter(Boolean) as string[]))
    if (userIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, user_metadata')
        .in('id', userIds)

      if (error) {
        console.error('加载尝试记录用户信息失败:', error)
        return
      }

      const fallback = anonymousUserLabel
      const nameMap: Record<string, string> = {}
      ;(data as AttemptUserRecord[] | null)?.forEach((item) => {
        const displayName =
          item.user_metadata?.display_name ||
          item.user_metadata?.full_name ||
          item.user_metadata?.name ||
          item.email?.split('@')[0] ||
          fallback
        nameMap[item.id] = displayName
      })

      if (Object.keys(nameMap).length > 0) {
        setAttemptUserNames((prev) => ({ ...prev, ...nameMap }))
      }
    } catch (error) {
      console.error('加载尝试记录用户信息失败:', error)
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
      
      const nextAttempts = (attemptsData || []) as Attempt[]
      setAttempts(nextAttempts)
      void loadAttemptUserNames(nextAttempts)
    } catch (error) {
      console.error('加载尝试记录失败:', error)
    }
  }

  const checkFavoriteStatus = async () => {
    if (!user || !id || favoritesUnavailable) return
    
    try {
      const { isFavorite, featureAvailable } = await posService.getFavoriteStatus(user.id, id)
      if (!featureAvailable) {
        console.warn('收藏功能未启用或表不存在，已忽略')
        setFavoritesUnavailable(true)
        return
      }
      setIsFavorite(isFavorite)
    } catch (error) {
      console.error('查询收藏状态失败:', error)
    }
  }

  const recordVisitHistory = async () => {
    if (!user || !id) return
    
    try {
      await posService.recordUserHistoryVisit(user.id, id)
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
        const { featureAvailable } = await posService.removeFavorite(user.id, id)
        if (!featureAvailable) {
          setFavoritesUnavailable(true)
          notify.error('收藏功能当前不可用')
          return
        }
        setIsFavorite(false)
        notify.success('已取消收藏')
      } else {
        const { featureAvailable } = await posService.addFavorite(user.id, id)
        if (!featureAvailable) {
          setFavoritesUnavailable(true)
          notify.error('收藏功能当前不可用')
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

    const sanitizedReviewComment = sanitizePlainText(newReview.comment, {
      maxLength: 1000,
      preserveLineBreaks: true,
    })

    if (!sanitizedReviewComment) {
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
          content: sanitizedReviewComment
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

      const attemptsPayload = attemptsList.map((attempt, index) => {
        const linkedCardId = attempt.card_album_card_id?.trim() || null
        const fallbackCardName = sanitizePlainText(attempt.card_name, { maxLength: 120 }) || null
        return {
          pos_id: id,
          user_id: user.id,
          attempt_number: nextAttemptNumber + index,
          result: attempt.result,
          card_album_card_id: linkedCardId,
          card_name: fallbackCardName,
          card_network: attempt.card_network || null,
          payment_method: attempt.payment_method || null,
          cvm: attempt.cvm || 'unknown',
          acquiring_mode: attempt.acquiring_mode || 'unknown',
          device_status: attempt.device_status || pos?.status || 'active',
          acquiring_institution: sanitizePlainText(attempt.acquiring_institution, { maxLength: 120 }) || null,
          checkout_location: attempt.checkout_location || pos?.basic_info?.checkout_location || null,
          notes: sanitizePlainText(attempt.notes, { maxLength: 1000, preserveLineBreaks: true }) || null,
          attempted_at: normalizeAttemptedAt(attempt.attempted_at),
          is_conclusive_failure: attempt.result === 'failure' && Boolean(attempt.is_conclusive_failure),
        }
      })

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
            notify.critical(`提交失败：数据库缺少字段 ${missingColumn}，${POS_ATTEMPTS_UPGRADE_HINT}`, {
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
        card_album_card_id: item.card_album_card_id,
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
        setAttemptUserNames((prev) => ({ ...prev, [user.id]: currentUserLabel }))
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

  const attemptRefreshMeta = useMemo(() => readPOSAttemptRefreshMeta(pos?.extended_fields), [pos?.extended_fields])
  const canRefreshByPermission = Boolean(user && pos?.created_by && (permissions.isAdmin || pos.created_by === user.id))
  const hasAttemptRecords = attempts.length > 0
  const canRefreshOnce = canRefreshByPermission && !attemptRefreshMeta.hasRefreshed && hasAttemptRecords

  const handleOpenRefreshModal = () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!canRefreshByPermission) {
      notify.error('只有记录创建者或管理员可以刷新该 POS 记录')
      return
    }

    if (attemptRefreshMeta.hasRefreshed) {
      notify.error('该 POS 记录已经刷新过，不能再次刷新')
      return
    }

    if (!hasAttemptRecords) {
      notify.error('暂无尝试记录，无法刷新该 POS 记录')
      return
    }

    setShowRefreshModal(true)
  }

  const handleRefreshPOSFromAttempts = async () => {
    if (!pos || !user) {
      notify.error('请先登录后再操作')
      return
    }

    if (!canRefreshByPermission) {
      notify.error('只有记录创建者或管理员可以刷新该 POS 记录')
      return
    }

    if (attemptRefreshMeta.hasRefreshed) {
      notify.error('该 POS 记录已经刷新过，不能再次刷新')
      setShowRefreshModal(false)
      return
    }

    setRefreshingPOS(true)
    const toastId = notify.loading('正在按最新尝试记录逻辑刷新 POS 记录...')

    try {
      const { data: latestAttempts, error: attemptsError } = await supabase
        .from('pos_attempts')
        .select('*')
        .eq('pos_id', pos.id)
        .order('attempted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (attemptsError) {
        throw attemptsError
      }

      const attemptsData = (latestAttempts || []) as Attempt[]
      if (attemptsData.length === 0) {
        notify.error('暂无尝试记录，无法刷新 POS 记录', { id: toastId })
        return
      }

      const derived = derivePOSFromAttempts(pos, attemptsData)
      if (derived.decisiveAttemptCount === 0) {
        notify.error('缺少成功或明确失败的尝试记录，无法刷新', { id: toastId })
        return
      }

      const refreshedAt = new Date().toISOString()
      const nextExtendedFields = buildRefreshedExtendedFields(
        pos.extended_fields,
        user.id,
        refreshedAt,
        derived.sourceAttemptCount
      )

      const updatePayload: Record<string, unknown> = {
        basic_info: derived.basicInfo,
        verification_modes: derived.verificationModes,
        status: derived.status,
        extended_fields: nextExtendedFields,
        updated_at: refreshedAt,
      }

      let { error: updateError } = await supabase
        .from('pos_machines')
        .update(updatePayload)
        .eq('id', pos.id)

      if (updateError && updateError.message?.includes('verification_modes')) {
        const fallbackPayload = { ...updatePayload }
        delete fallbackPayload.verification_modes

        const { error: fallbackError } = await supabase
          .from('pos_machines')
          .update(fallbackPayload)
          .eq('id', pos.id)

        updateError = fallbackError || null
      }

      if (updateError) {
        const missingColumn = extractMissingColumnFromError(updateError)
        if (missingColumn) {
          notify.critical(`刷新失败：数据库缺少字段 ${missingColumn}，请先升级数据库结构后重试。`, {
            title: '数据库需要升级',
            details: POS_ATTEMPTS_UPGRADE_HINT,
          })
        } else {
          notify.error(`刷新失败：${updateError.message || '未知错误'}`, { id: toastId })
        }
        return
      }

      notify.success('POS 记录已按最新尝试记录逻辑刷新', { id: toastId })
      setShowRefreshModal(false)
      await Promise.all([loadPOSDetail(), loadAttempts(), loadSuccessRate(), refreshMapData()])
    } catch (error) {
      console.error('刷新 POS 记录失败:', error)
      notify.error('刷新失败，请稍后重试', { id: toastId })
    } finally {
      setRefreshingPOS(false)
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

  const renderSupportSectionCard = (section: SupportFusionSection) => {
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
                        成功率 {Math.round(successRate)}%
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
                {canRefreshByPermission && (
                  <button
                    onClick={handleOpenRefreshModal}
                    disabled={!canRefreshOnce || refreshingPOS}
                    className={`h-10 w-10 rounded-xl border transition-colors ${
                      canRefreshOnce && !refreshingPOS
                        ? 'border-gray-200 bg-white text-gray-500 hover:text-soft-black'
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    }`}
                    title={
                      canRefreshOnce
                        ? '按尝试记录刷新 POS 信息（仅一次）'
                        : attemptRefreshMeta.hasRefreshed
                        ? '该记录已刷新过'
                        : '暂无尝试记录，无法刷新'
                    }
                    aria-label="刷新POS机"
                  >
                    <RefreshCcw className={`w-5 h-5 mx-auto ${refreshingPOS ? 'animate-spin' : ''}`} />
                  </button>
                )}
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

                {deviceAcquiringSection ? (
                  renderSupportSectionCard(deviceAcquiringSection)
                ) : (
                  <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-accent-yellow" />
                        <h3 className="text-lg font-semibold text-soft-black dark:text-gray-100">设备与收单</h3>
                      </div>
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-500">
                        暂无可展示数据
                      </div>
                    </CardContent>
                  </AnimatedCard>
                )}
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
                    {paymentSupportSections.map((section) => renderSupportSectionCard(section))}
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
                      {attempts.map((attempt) => {
                        const resultLabel = getAttemptResultText(attempt.result)
                        const resultBadgeClass =
                          attempt.result === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : attempt.result === 'failure'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        const cardMeta = getAttemptCardMeta(attempt)
                        const title = `${formatAttemptDate(attempt)} · ${getAttemptUserLabel(attempt)} · ${resultLabel}`
                        return (
                          <div key={attempt.id} className="rounded-2xl border border-gray-100 bg-white/90 p-4">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                              <h4 className="text-base sm:text-lg font-semibold text-soft-black dark:text-gray-100">{title}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${resultBadgeClass}`}>
                                  {resultLabel}
                                </span>
                                {attempt.result === 'failure' && attempt.is_conclusive_failure && (
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
                                {cardMeta.isLinked ? (
                                  <button
                                    type="button"
                                    onClick={() => openAlbumCardDetail(cardMeta.linkedCardId)}
                                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    {cardMeta.label}
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-soft-black dark:text-gray-100">{cardMeta.label}</span>
                                )}
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
                                <span className="text-soft-black dark:text-gray-100">{getAttemptCvmLabel(attempt.cvm)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">收单模式：</span>
                                <span className="text-soft-black dark:text-gray-100">{getAttemptAcquiringModeLabel(attempt.acquiring_mode)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">设备状态：</span>
                                <span className="text-soft-black dark:text-gray-100">{getAttemptDeviceStatusLabel(attempt.device_status)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">收单机构：</span>
                                <span className="text-soft-black dark:text-gray-100">{attempt.acquiring_institution?.trim() || unknownLabel}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">结账地点：</span>
                                <span className="text-soft-black dark:text-gray-100">{getAttemptCheckoutLocationLabel(attempt.checkout_location)}</span>
                              </div>
                              {attempt.attempted_at && (
                                <div>
                                  <span className="text-gray-500">发生时间：</span>
                                  <span className="text-soft-black dark:text-gray-100">{new Date(attempt.attempted_at).toLocaleString(localeTag)}</span>
                                </div>
                              )}
                            </div>
                            {attempt.notes && (
                              <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                                备注：{attempt.notes}
                              </div>
                            )}
                          </div>
                        )
                      })}
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

              {safeExternalLinks.length > 0 && (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                      <ExternalLink className="w-5 h-5 text-accent-yellow" />
                      外部链接
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {safeExternalLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.safeUrl}
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

              {canRefreshByPermission && (
                <AnimatedCard className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-800 rounded-[28px] shadow-soft" variant="elevated" hoverable>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-soft-black dark:text-gray-100">
                      <RefreshCcw className="w-5 h-5 text-accent-yellow" />
                      刷新 POS 记录
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      使用最新尝试记录逻辑覆盖旧数据（每条 POS 仅允许刷新一次）
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {attemptRefreshMeta.hasRefreshed ? (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        已刷新于 {attemptRefreshMeta.refreshedAt ? new Date(attemptRefreshMeta.refreshedAt).toLocaleString(localeTag) : '未知时间'}，该记录不可再次刷新。
                      </div>
                    ) : !hasAttemptRecords ? (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        当前暂无尝试记录，暂时无法执行刷新。
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        刷新会覆盖当前 POS 的支付能力字段、验证模式与设备状态，请确认后再执行。
                      </div>
                    )}
                    <AnimatedButton
                      onClick={handleOpenRefreshModal}
                      disabled={!canRefreshOnce || refreshingPOS}
                      loading={refreshingPOS}
                      variant={canRefreshOnce ? 'primary' : 'outline'}
                      size="sm"
                    >
                      {canRefreshOnce ? '刷新为最新尝试逻辑' : '已刷新（不可重复）'}
                    </AnimatedButton>
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

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {!showAttemptModal && supportDetailTarget && (
              <motion.div
                className="fixed inset-0 z-[60]"
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
                            {getAttemptResultText(attempt.result)}
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
                            <span className="text-soft-black">{getAttemptCvmLabel(attempt.cvm)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">收单模式：</span>
                            <span className="text-soft-black">{getAttemptAcquiringModeLabel(attempt.acquiring_mode)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">收单机构：</span>
                            <span className="text-soft-black">{attempt.acquiring_institution?.trim() || unknownLabel}</span>
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
          </AnimatePresence>,
          document.body
        )}

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
                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-white/60 px-3 py-1 text-xs font-semibold text-gray-500 shadow-soft dark:bg-slate-900/80 dark:border-slate-800 dark:text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-accent-yellow" />
                      已有 {attemptsCount} 条记录
                    </span>
                    <button
                      type="button"
                      onClick={addAttemptRow}
                      className="px-4 py-2 rounded-full border border-accent-yellow/50 bg-accent-yellow/15 text-xs font-semibold text-soft-black hover:bg-accent-yellow/25 transition-colors dark:border-accent-yellow/30 dark:bg-accent-yellow/20 dark:text-gray-100 dark:hover:bg-accent-yellow/30"
                    >
                      + 添加记录
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12 ${isAlbumPickerOpen ? 'blur-sm' : ''}`}>
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
                      <div className="space-y-8">
                        {attemptsCount === 0 ? (
                          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/90 p-6 text-sm text-gray-500">
                            还没有添加尝试记录，点击“添加记录”开始填写。
                          </div>
                        ) : (
                          attemptsList.map((attempt, index) => {
                            const binding = attemptAlbumBindings[index]
                            const isDualBound = Boolean(
                              binding
                                && binding.networkValues.length > 1
                                && (attempt.card_name || '').trim() === binding.cardName
                            )
                            const attemptNetworkOptions = isDualBound
                              ? CARD_NETWORKS.filter((scheme) => binding.networkValues.includes(scheme.value as SchemeID))
                              : CARD_NETWORKS
                            return (
                            <div key={`attempt-${index}`} className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">
                                    尝试 {index + 1}
                                  </div>
                                  <div className="mt-1 text-base font-semibold text-soft-black dark:text-gray-100">
                                    {(attempt.attempted_at ? new Date(attempt.attempted_at) : new Date()).toLocaleDateString(localeTag)} · {currentUserLabel} · {getAttemptResultText(attempt.result)}
                                  </div>
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
                                      <option value="">{isDualBound ? '请选择该双标卡的卡组织' : '请选择卡组织'}</option>
                                      {attemptNetworkOptions.map((scheme) => (
                                        <option key={scheme.value} value={scheme.value}>{scheme.label}</option>
                                      ))}
                                    </select>
                                    {isDualBound && (
                                      <p className="text-xs text-gray-400">当前卡片为双标卡，仅可选择绑定的两个卡组织。</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">发生时间</label>
                                    <input
                                      type="datetime-local"
                                      className={attemptFieldBase}
                                      value={toDateTimeLocalValue(attempt.attempted_at)}
                                      onChange={(e) => updateAttempt(index, 'attempted_at', e.target.value)}
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

                                {attempt.result === 'failure' ? (
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
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-500">
                                    仅“失败”结果可标记为明确失败。
                                  </div>
                                )}
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
                            )
                          })
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

            {typeof document !== 'undefined' &&
              createPortal(
                <AnimatePresence>
                  {isAlbumPickerOpen && (
                    <motion.div
                      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
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
                        const organizationLabel = getAlbumCardOrganizationLabels(card).join(' / ')
                        const label = `${card.title} · ${card.issuer} · ${organizationLabel}`
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
                                  {getAlbumScopeLabel(card.scope)} · BIN {card.bin || '—'} · {card.level || card.group || '未知等级'}
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
                </AnimatePresence>,
                document.body
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {!showAttemptModal && (
        <>
          <AnimatedModal
            isOpen={showRefreshModal}
            onClose={() => setShowRefreshModal(false)}
            title="刷新 POS 记录"
            size="md"
            footer={
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <AnimatedButton
                  onClick={() => setShowRefreshModal(false)}
                  variant="outline"
                  disabled={refreshingPOS}
                >
                  取消
                </AnimatedButton>
                <AnimatedButton
                  onClick={handleRefreshPOSFromAttempts}
                  loading={refreshingPOS}
                  disabled={!canRefreshOnce}
                >
                  {refreshingPOS ? '刷新中...' : '确认刷新并覆盖'}
                </AnimatedButton>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                将按最新尝试记录逻辑重新写入当前 POS 的支付能力、验证模式与状态信息，并覆盖旧字段。
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 space-y-1">
                <div>POS：{pos?.merchant_name || '—'}</div>
                <div>当前尝试记录数：{attempts.length}</div>
                <div>执行人：{currentUserLabel}</div>
                <div>限制：每条 POS 仅允许刷新一次</div>
              </div>
              {attemptRefreshMeta.hasRefreshed && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                  该 POS 已在 {attemptRefreshMeta.refreshedAt ? new Date(attemptRefreshMeta.refreshedAt).toLocaleString(localeTag) : '未知时间'} 刷新，无法再次执行。
                </div>
              )}
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
                
                {successRate !== null && successRate < 50 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-orange-700 font-medium">
                        注意：当前成功率为 {Math.round(successRate)}%，低于50%
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
          {showDeleteModal &&
            typeof document !== 'undefined' &&
            createPortal(
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
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
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  )
}

export default POSDetail
