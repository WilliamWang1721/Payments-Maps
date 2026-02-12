import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Edit, FileText, Filter, Plus, Trash2, User, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedListItem from '@/components/AnimatedListItem'
import clsx from 'clsx'
import { useMapStore } from '@/stores/useMapStore'
import AnimatedModal from '@/components/ui/AnimatedModal'
import SystemSelect from '@/components/ui/SystemSelect'
import { usePermissions } from '@/hooks/usePermissions'
import { notify } from '@/lib/notify'
import { CARD_NETWORKS, getCardLevelOptionsByOrganization } from '@/lib/cardMetadata'
import {
  type AlbumScope,
  type CardAlbumItem,
  getAlbumScopeLabel,
  useCardAlbumStore,
} from '@/stores/useCardAlbumStore'
import { useIssueReportStore } from '@/stores/useIssueReportStore'
import { useAuthStore } from '@/stores/useAuthStore'

const TAB_OPTIONS = [
  { key: 'public', label: '公共卡册', icon: Users },
  { key: 'personal', label: '个人卡册', icon: User },
] as const

type IssuerCategory = 'domestic' | 'foreign'
type ForeignIssuerCategory = 'hongKong' | 'unitedStates' | 'unitedKingdom' | 'institutions' | 'asiaPacific'

const CARD_ORGANIZATION_OPTIONS = CARD_NETWORKS.map((network) => ({
  value: network.label,
  label: network.label,
}))

const DOMESTIC_ISSUER_GROUPS = [
  {
    title: '国有大型银行',
    issuers: ['中国工商银行', '中国建设银行', '中国农业银行', '中国银行', '交通银行', '中国邮政储蓄银行'],
  },
  {
    title: '全国性股份制银行',
    issuers: ['招商银行', '中信银行', '浦发银行', '兴业银行', '平安银行', '广发银行', '中国民生银行'],
  },
  {
    title: '城市与互联网银行',
    issuers: ['北京银行', '上海银行', '宁波银行', '江苏银行', '微众银行', '网商银行'],
  },
] as const

const FOREIGN_ISSUER_GROUPS: Array<{
  key: ForeignIssuerCategory
  label: string
  description: string
  issuers: string[]
}> = [
  {
    key: 'hongKong',
    label: '香港银行',
    description: '常见港区发卡机构',
    issuers: ['汇丰银行（香港）', '中银香港', '恒生银行', '渣打银行（香港）', '花旗银行（香港）'],
  },
  {
    key: 'unitedStates',
    label: '美国银行',
    description: '美国本土主流银行',
    issuers: ['美国银行', '摩根大通', '花旗银行', '富国银行', 'Capital One'],
  },
  {
    key: 'unitedKingdom',
    label: '英国银行',
    description: '英国及离岸常见发卡行',
    issuers: ['汇丰银行（英国）', '巴克莱银行', '劳埃德银行集团', 'NatWest', '渣打银行（英国）'],
  },
  {
    key: 'institutions',
    label: '金融机构',
    description: '非传统银行类发卡机构',
    issuers: ['American Express', 'Discover Financial Services', 'Diners Club International', 'Revolut', 'Wise'],
  },
  {
    key: 'asiaPacific',
    label: '亚太银行',
    description: '亚太地区常见发卡行',
    issuers: ['星展银行 DBS', '华侨银行 OCBC', '大华银行 UOB', '三菱 UFJ 银行', '瑞穗银行'],
  },
]

const CardAlbum = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<AlbumScope>('public')
  const { cards, addCard, addToPersonal, updateCard, removeCard } = useCardAlbumStore()
  const permissions = usePermissions()
  const { user } = useAuthStore()
  const { reports, addReport, resolveReport } = useIssueReportStore()
  const [showAddPage, setShowAddPage] = useState(false)
  const [editingCard, setEditingCard] = useState<CardAlbumItem | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardAlbumItem | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<CardAlbumItem | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showIssuerMenu, setShowIssuerMenu] = useState(false)
  const [issuerCategory, setIssuerCategory] = useState<IssuerCategory>('domestic')
  const [foreignIssuerCategory, setForeignIssuerCategory] = useState<ForeignIssuerCategory>('hongKong')
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false)
  const [reportForm, setReportForm] = useState({
    issueType: '',
    description: '',
    contact: '',
  })
  const [formData, setFormData] = useState({
    issuer: '',
    title: '',
    bin: '',
    organization: '',
    secondaryOrganization: '',
    isDualNetwork: false,
    level: '',
    description: '',
    isCoBranded: false,
    hasPointsProgram: false,
    pointsProgramName: '',
    hasClubPoints: false,
    clubPointsProgram: '',
    scope: 'public' as AlbumScope,
  })
  const searchKeyword = useMapStore((state) => state.searchKeyword)
  const [filters, setFilters] = useState({
    issuer: 'all',
    organization: 'all',
    bin: 'all',
  })
  const [touchedFields, setTouchedFields] = useState({
    issuer: false,
    title: false,
    bin: false,
  })
  const linkedCardId = searchParams.get('cardId')?.trim() || ''
  const lastValidationToast = useRef<Record<string, string>>({})

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    if (!formData.title.trim()) {
      errors.title = '请补充卡片名称'
    }
    if (!formData.issuer.trim()) {
      errors.issuer = '请补充发卡行'
    }
    if (!formData.bin.trim()) {
      errors.bin = '请补充卡BIN'
    } else if (!/^\d+$/.test(formData.bin.trim())) {
      errors.bin = '卡BIN仅支持数字'
    } else if (formData.bin.trim().length < 6 || formData.bin.trim().length > 8) {
      errors.bin = '卡BIN需要6-8位数字'
    }
    if (formData.isDualNetwork) {
      if (!formData.secondaryOrganization.trim()) {
        errors.secondaryOrganization = '双标卡请补充第二卡组织'
      } else if (formData.secondaryOrganization.trim() === formData.organization.trim()) {
        errors.secondaryOrganization = '双标卡的两个卡组织不能相同'
      }
    }
    return errors
  }, [formData.bin, formData.issuer, formData.isDualNetwork, formData.organization, formData.secondaryOrganization, formData.title])

  useEffect(() => {
    Object.entries(validationErrors).forEach(([field, message]) => {
      if (message && touchedFields[field as keyof typeof touchedFields]) {
        if (lastValidationToast.current[field] !== message) {
          notify.error(message)
          lastValidationToast.current[field] = message
        }
      } else if (!message && lastValidationToast.current[field]) {
        delete lastValidationToast.current[field]
      }
    })
  }, [touchedFields, validationErrors])

  useEffect(() => {
    if (typeof document === 'undefined' || !showIssuerMenu) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [showIssuerMenu])

  useEffect(() => {
    if (!linkedCardId) return

    const targetCard = cards.find((card) => card.id === linkedCardId)
    if (!targetCard) return

    if (targetCard.scope !== activeTab) {
      setActiveTab(targetCard.scope)
    }
    setSelectedCard(targetCard)
    setShowDetailModal(true)
  }, [activeTab, cards, linkedCardId])

  const clearCardIdQuery = () => {
    if (!searchParams.get('cardId')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('cardId')
    setSearchParams(nextParams, { replace: true })
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    clearCardIdQuery()
  }

  const markTouched = (field: keyof typeof touchedFields) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  const getCardOrganizationList = (card: Pick<CardAlbumItem, 'organization' | 'secondaryOrganization'>) => {
    return Array.from(new Set([card.organization, card.secondaryOrganization].map((item) => item?.trim()).filter(Boolean)))
  }

  const getCardOrganizationLabel = (card: Pick<CardAlbumItem, 'organization' | 'secondaryOrganization'>) => {
    return getCardOrganizationList(card).join(' / ')
  }

  const baseCards = useMemo(() => cards.filter((card) => card.scope === activeTab), [cards, activeTab])
  const getCardKey = (card: CardAlbumItem) => `${card.issuer}-${card.title}-${card.bin}`
  const personalCardKeys = useMemo(() => {
    const keys = new Set<string>()
    cards
      .filter((card) => card.scope === 'personal')
      .forEach((card) => {
        keys.add(getCardKey(card))
      })
    return keys
  }, [cards])

  const filterOptions = useMemo(() => {
    const issuers = new Set<string>()
    const organizations = new Set<string>()
    const bins = new Set<string>()
    baseCards.forEach((card) => {
      issuers.add(card.issuer)
      getCardOrganizationList(card).forEach((organization) => organizations.add(organization))
      bins.add(card.bin)
    })
    return {
      issuers: Array.from(issuers),
      organizations: Array.from(organizations),
      bins: Array.from(bins),
    }
  }, [baseCards])

  const filteredCards = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return baseCards.filter((card) => {
      const matchesKeyword = keyword
        ? [card.title, card.issuer, card.organization, card.secondaryOrganization, card.level, card.group, card.bin]
            .some((value) => (value || '').toLowerCase().includes(keyword))
        : true
      const matchesIssuer = filters.issuer === 'all' || card.issuer === filters.issuer
      const matchesOrganization = filters.organization === 'all'
        || getCardOrganizationList(card).includes(filters.organization)
      const matchesBin = filters.bin === 'all' || card.bin === filters.bin
      return matchesKeyword && matchesIssuer && matchesOrganization && matchesBin
    })
  }, [baseCards, filters, searchKeyword])

  const selectedCardReports = useMemo(() => {
    if (!selectedCard) return []
    return reports.filter((report) => report.itemType === 'card' && report.itemId === selectedCard.id)
  }, [reports, selectedCard])

  const activeForeignIssuerGroup = useMemo(
    () => FOREIGN_ISSUER_GROUPS.find((group) => group.key === foreignIssuerCategory) ?? FOREIGN_ISSUER_GROUPS[0],
    [foreignIssuerCategory]
  )
  const cardLevelOptions = useMemo(
    () => getCardLevelOptionsByOrganization(formData.organization),
    [formData.organization]
  )

  const handleOpenAddPage = () => {
    setFormData({
      issuer: '',
      title: '',
      bin: '',
      organization: '',
      secondaryOrganization: '',
      isDualNetwork: false,
      level: '',
      description: '',
      isCoBranded: false,
      hasPointsProgram: false,
      pointsProgramName: '',
      hasClubPoints: false,
      clubPointsProgram: '',
      scope: activeTab,
    })
    setTouchedFields({ issuer: false, title: false, bin: false })
    lastValidationToast.current = {}
    setShowIssuerMenu(false)
    setShowAdvancedMenu(false)
    setIssuerCategory('domestic')
    setForeignIssuerCategory('hongKong')
    setShowAddPage(true)
  }

  const handleSelectIssuer = (issuer: string) => {
    markTouched('issuer')
    setFormData((prev) => ({ ...prev, issuer }))
    setShowIssuerMenu(false)
  }

  const handleSaveCard = () => {
    setTouchedFields({ issuer: true, title: true, bin: true })
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0]
      if (firstError) {
        notify.error(firstError)
      }
      return
    }

    const updatedAt = new Date().toISOString().slice(0, 10)
    const normalizedPointsProgram = formData.hasPointsProgram ? formData.pointsProgramName.trim() : ''
    const normalizedClubPointsProgram = formData.hasClubPoints ? formData.clubPointsProgram.trim() : ''
    const normalizedSecondaryOrganization = formData.isDualNetwork ? formData.secondaryOrganization.trim() : ''

    if (editingCard) {
      updateCard({
        ...editingCard,
        issuer: formData.issuer.trim(),
        title: formData.title.trim(),
        bin: formData.bin.trim(),
        organization: formData.organization.trim() || '未知卡组织',
        secondaryOrganization: normalizedSecondaryOrganization,
        isDualNetwork: Boolean(normalizedSecondaryOrganization),
        level: formData.level.trim() || '未知等级',
        description: formData.description.trim() || '暂无描述',
        isCoBranded: formData.isCoBranded,
        hasPointsProgram: formData.hasPointsProgram,
        pointsProgramName: normalizedPointsProgram,
        hasClubPoints: formData.hasClubPoints,
        clubPointsProgram: normalizedClubPointsProgram,
        scope: formData.scope,
        updatedAt,
      })
      setShowAddPage(false)
      setShowIssuerMenu(false)
      setEditingCard(null)
      notify.success('卡片信息已更新')
      return
    }

    const newCard: CardAlbumItem = {
      id: `${formData.scope}-${Date.now()}`,
      issuer: formData.issuer.trim(),
      title: formData.title.trim(),
      bin: formData.bin.trim(),
      organization: formData.organization.trim() || '未知卡组织',
      secondaryOrganization: normalizedSecondaryOrganization,
      isDualNetwork: Boolean(normalizedSecondaryOrganization),
      level: formData.level.trim() || '未知等级',
      description: formData.description.trim() || '暂无描述',
      isCoBranded: formData.isCoBranded,
      hasPointsProgram: formData.hasPointsProgram,
      pointsProgramName: normalizedPointsProgram,
      hasClubPoints: formData.hasClubPoints,
      clubPointsProgram: normalizedClubPointsProgram,
      scope: formData.scope,
      updatedAt,
    }

    addCard(newCard)
    setShowAddPage(false)
    setShowIssuerMenu(false)
    notify.success('已添加卡片')
  }

  const handleEditCard = (card: CardAlbumItem) => {
    if (!permissions.isAdmin) {
      notify.error('只有管理员可以编辑卡片')
      return
    }
    closeDetailModal()
    setEditingCard(card)
    setFormData({
      issuer: card.issuer,
      title: card.title,
      bin: card.bin,
      organization: card.organization,
      secondaryOrganization: card.secondaryOrganization || '',
      isDualNetwork: Boolean(card.secondaryOrganization),
      level: card.level || card.group || '',
      description: card.description,
      isCoBranded: Boolean(card.isCoBranded),
      hasPointsProgram: Boolean(card.hasPointsProgram),
      pointsProgramName: card.pointsProgramName || '',
      hasClubPoints: Boolean(card.hasClubPoints),
      clubPointsProgram: card.clubPointsProgram || '',
      scope: card.scope,
    })
    setTouchedFields({ issuer: false, title: false, bin: false })
    lastValidationToast.current = {}
    setShowIssuerMenu(false)
    setShowAdvancedMenu(
      Boolean(card.isCoBranded) || Boolean(card.hasPointsProgram) || Boolean(card.hasClubPoints)
    )
    setIssuerCategory('domestic')
    setForeignIssuerCategory('hongKong')
    setShowAddPage(true)
  }

  const handleDeleteCard = () => {
    if (!cardToDelete) return
    if (!permissions.isAdmin) {
      notify.error('只有管理员可以删除卡片')
      return
    }
    removeCard(cardToDelete.id)
    setShowDeleteModal(false)
    setCardToDelete(null)
    notify.success('卡片已删除')
  }

  const handleOpenDetail = (card: CardAlbumItem) => {
    setSelectedCard(card)
    setShowDetailModal(true)
  }

  const handleSubmitReport = () => {
    if (!selectedCard) return
    if (!reportForm.issueType.trim() || !reportForm.description.trim()) {
      notify.error('请补充申报类型与问题描述')
      return
    }
    addReport({
      itemType: 'card',
      itemId: selectedCard.id,
      itemLabel: selectedCard.title,
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

  const handleAddToPersonal = (card: CardAlbumItem) => {
    const result = addToPersonal(card)
    if (!result.added) {
      notify.info('该卡片已在我的卡册')
      return
    }
    notify.success('已加入我的卡册')
  }

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {showAddPage ? (
        <div className="flex min-h-screen flex-col gap-6">
          <div className="bg-white rounded-[32px] shadow-soft border border-white/50 p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-soft-black dark:text-white">添加卡片</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">完善卡片信息并保存到卡册。</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPage(false)
                    setShowIssuerMenu(false)
                    setEditingCard(null)
                  }}
                  className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveCard}
                  className="px-8 py-3 rounded-2xl font-bold text-white bg-soft-black hover:bg-accent-yellow shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                >
                  {editingCard ? '保存' : '添加'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">卡片名称</label>
                <input
                  value={formData.title}
                  onChange={(event) => {
                    markTouched('title')
                    setFormData((prev) => ({ ...prev, title: event.target.value }))
                  }}
                  onBlur={() => markTouched('title')}
                  placeholder="请输入卡片名称"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">发卡行</label>
                <button
                  type="button"
                  onClick={() => {
                    markTouched('issuer')
                    setShowIssuerMenu(true)
                  }}
                  className={clsx(
                    'w-full rounded-xl border px-4 py-3 text-sm transition-all flex items-center justify-between',
                    formData.issuer
                      ? 'border-soft-black/25 bg-soft-black/5 text-soft-black'
                      : 'border-gray-200 text-gray-500 hover:border-accent-yellow/50'
                  )}
                >
                  <span>{formData.issuer || '点击选择发卡行'}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {formData.issuer && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-100">
                    已选择：{formData.issuer}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">卡BIN</label>
                <input
                  value={formData.bin}
                  onChange={(event) => {
                    markTouched('bin')
                    setFormData((prev) => ({ ...prev, bin: event.target.value }))
                  }}
                  onBlur={() => markTouched('bin')}
                  placeholder="例如 622848"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">卡组织</label>
                  <SystemSelect
                    value={formData.organization}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        organization: value,
                        secondaryOrganization: prev.secondaryOrganization === value ? '' : prev.secondaryOrganization,
                      }))
                    }
                    options={CARD_ORGANIZATION_OPTIONS}
                    placeholder="请选择卡组织"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">卡等级</label>
                  <SystemSelect
                    value={formData.level}
                    onChange={(value) => setFormData((prev) => ({ ...prev, level: value }))}
                    options={cardLevelOptions}
                    allowCustom
                    customPlaceholder="自定义卡等级"
                    placeholder={formData.organization ? '请选择卡等级' : '请先选择卡组织'}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">是否双标卡</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isDualNetwork: true,
                      }))
                    }
                    className={clsx(
                      'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                      formData.isDualNetwork
                        ? 'border-soft-black bg-soft-black text-white'
                        : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                    )}
                  >
                    是
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isDualNetwork: false,
                        secondaryOrganization: '',
                      }))
                    }
                    className={clsx(
                      'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                      !formData.isDualNetwork
                        ? 'border-soft-black bg-soft-black text-white'
                        : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                    )}
                  >
                    否
                  </button>
                </div>

                {formData.isDualNetwork && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">第二卡组织</label>
                    <SystemSelect
                      value={formData.secondaryOrganization}
                      onChange={(value) => setFormData((prev) => ({ ...prev, secondaryOrganization: value }))}
                      options={CARD_ORGANIZATION_OPTIONS.filter((option) => option.value !== formData.organization)}
                      placeholder="请选择第二卡组织"
                    />
                    <p className="text-xs text-gray-400 mt-2">双标卡将在尝试记录中限制为这两个卡组织供选择。</p>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedMenu((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">高级菜单</span>
                  <ChevronDown
                    className={clsx(
                      'w-4 h-4 text-gray-400 transition-transform',
                      showAdvancedMenu && 'rotate-180'
                    )}
                  />
                </button>

                {showAdvancedMenu && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">是否联名卡</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, isCoBranded: true }))}
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            formData.isCoBranded
                              ? 'border-soft-black bg-soft-black text-white'
                              : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                          )}
                        >
                          是
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, isCoBranded: false }))}
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            !formData.isCoBranded
                              ? 'border-soft-black bg-soft-black text-white'
                              : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                          )}
                        >
                          否
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">是否有积分计划</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, hasPointsProgram: true }))
                          }
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            formData.hasPointsProgram
                              ? 'border-soft-black bg-soft-black text-white'
                              : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                          )}
                        >
                          是
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              hasPointsProgram: false,
                              pointsProgramName: '',
                            }))
                          }
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            !formData.hasPointsProgram
                              ? 'border-soft-black bg-soft-black text-white'
                              : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                          )}
                        >
                          否
                        </button>
                      </div>
                      {formData.hasPointsProgram && (
                        <input
                          value={formData.pointsProgramName}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, pointsProgramName: event.target.value }))
                          }
                          placeholder="例如 Membership Rewards / Flying Club"
                          className="mt-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">是否积累俱乐部积分</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, hasClubPoints: true }))
                          }
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            formData.hasClubPoints
                              ? 'border-soft-black bg-soft-black text-white'
                              : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                          )}
                        >
                          是
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              hasClubPoints: false,
                              clubPointsProgram: '',
                            }))
                          }
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            !formData.hasClubPoints
                              ? 'border-soft-black bg-soft-black text-white'
                              : 'border-gray-200 text-gray-500 hover:border-accent-yellow/40'
                          )}
                        >
                          否
                        </button>
                      </div>
                      {formData.hasClubPoints && (
                        <input
                          value={formData.clubPointsProgram}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, clubPointsProgram: event.target.value }))
                          }
                          placeholder="例如 亚洲万里通 / Marriott Bonvoy"
                          className="mt-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">卡片描述</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="补充卡片说明，方便团队理解"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">存入位置</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TAB_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = formData.scope === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, scope: option.key }))}
                        className={clsx(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium',
                          isSelected
                            ? 'border-accent-yellow bg-yellow-50 text-soft-black shadow-sm'
                            : 'border-gray-200 text-gray-500 hover:border-accent-yellow/60'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full bg-white/80 dark:bg-slate-900/70 border border-white/60 dark:border-slate-800 p-1 shadow-soft">
                {TAB_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isActive = activeTab === option.key
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActiveTab(option.key)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                        isActive
                          ? 'bg-accent-yellow text-white shadow-md'
                          : 'text-gray-500 dark:text-gray-400 hover:text-soft-black dark:hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-white/80 dark:bg-slate-900/70 border border-white/60 dark:border-slate-800 rounded-2xl px-3 py-2 shadow-soft">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Filter className="w-4 h-4" />
                  筛选
                </div>
                <select
                  value={filters.organization}
                  onChange={(event) => setFilters((prev) => ({ ...prev, organization: event.target.value }))}
                  className="text-xs sm:text-sm bg-transparent border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300"
                >
                  <option value="all">卡组织</option>
                  {filterOptions.organizations.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={filters.issuer}
                  onChange={(event) => setFilters((prev) => ({ ...prev, issuer: event.target.value }))}
                  className="text-xs sm:text-sm bg-transparent border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300"
                >
                  <option value="all">发卡行</option>
                  {filterOptions.issuers.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={filters.bin}
                  onChange={(event) => setFilters((prev) => ({ ...prev, bin: event.target.value }))}
                  className="text-xs sm:text-sm bg-transparent border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300"
                >
                  <option value="all">卡BIN</option>
                  {filterOptions.bins.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                当前共有 <span className="font-semibold text-soft-black dark:text-white">{filteredCards.length}</span> 张卡片
              </div>
              <AnimatedButton className="gap-2" onClick={handleOpenAddPage}>
                <Plus className="w-4 h-4" />
                添加卡片
              </AnimatedButton>
            </div>
          </motion.div>

          {filteredCards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center bg-white/50 dark:bg-slate-900/40"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-soft-black dark:text-white">暂时没有卡片</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                点击右上角“添加卡片”，将银行卡片归档到公共或个人卡册。
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {filteredCards.map((card, index) => (
                <AnimatedListItem
                  key={card.id}
                  index={index}
                  delay={0.05}
                  direction="up"
                  onClick={() => handleOpenDetail(card)}
                  className="group relative rounded-2xl border border-white/70 dark:border-slate-800 bg-gradient-to-br from-white/90 via-white/70 to-blue-50/80 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-800/70 p-5 shadow-soft hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {card.scope === 'public' && (
                      personalCardKeys.has(getCardKey(card)) ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" />
                          已加入
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleAddToPersonal(card)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full pointer-events-auto"
                        >
                          <Plus className="w-3 h-3" />
                          添加到我的卡册
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleEditCard(card)
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-600 bg-white/80 hover:bg-gray-100 transition-colors"
                      disabled={!permissions.isAdmin}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!permissions.isAdmin) {
                          notify.error('只有管理员可以删除卡片')
                          return
                        }
                        setCardToDelete(card)
                        setShowDeleteModal(true)
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      disabled={!permissions.isAdmin}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800 border border-white/60 dark:border-slate-700">
                      {card.issuer}
                    </span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full font-semibold',
                        card.scope === 'public'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      )}
                    >
                      {getAlbumScopeLabel(card.scope)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-soft-black dark:text-white mt-3">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {card.description}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>卡BIN</span>
                      <span className="font-semibold text-soft-black dark:text-white">{card.bin}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>卡组织</span>
                      <span className="font-semibold text-soft-black dark:text-white">{getCardOrganizationLabel(card)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>卡等级</span>
                      <span className="font-semibold text-soft-black dark:text-white">{card.level || card.group || '未知等级'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                    <span>更新于 {card.updatedAt}</span>
                  </div>
                </AnimatedListItem>
              ))}
            </div>
          )}
        </>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showAddPage && showIssuerMenu && (
              <motion.div
                className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIssuerMenu(false)}
              >
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.25 }}
                  className="absolute right-6 top-6 bottom-6 w-[min(92vw,720px)] md:w-[min(48%,720px)] bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/60 flex flex-col overflow-hidden"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">选择发卡行</div>
                      <div className="text-xs text-gray-400 mt-1">点击银行条目后将自动填充到卡片表单</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowIssuerMenu(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-6 py-4 border-b border-gray-100 space-y-3">
                    <div className="inline-flex rounded-full bg-cream p-1">
                      <button
                        type="button"
                        onClick={() => setIssuerCategory('domestic')}
                        className={clsx(
                          'px-4 py-2 rounded-full text-xs font-semibold transition-all',
                          issuerCategory === 'domestic'
                            ? 'bg-soft-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-soft-black'
                        )}
                      >
                        国内银行
                      </button>
                      <button
                        type="button"
                        onClick={() => setIssuerCategory('foreign')}
                        className={clsx(
                          'px-4 py-2 rounded-full text-xs font-semibold transition-all',
                          issuerCategory === 'foreign'
                            ? 'bg-soft-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-soft-black'
                        )}
                      >
                        国外银行
                      </button>
                    </div>

                    {issuerCategory === 'foreign' && (
                      <div className="flex flex-wrap gap-2">
                        {FOREIGN_ISSUER_GROUPS.map((group) => (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() => setForeignIssuerCategory(group.key)}
                            className={clsx(
                              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                              foreignIssuerCategory === group.key
                                ? 'border-soft-black bg-soft-black text-white'
                                : 'border-gray-200 text-gray-600 hover:border-accent-yellow/50'
                            )}
                          >
                            {group.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {issuerCategory === 'domestic' ? (
                      <div className="space-y-6">
                        {DOMESTIC_ISSUER_GROUPS.map((group) => (
                          <section key={group.title} className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              {group.title}
                            </div>
                            <div className="space-y-2">
                              {group.issuers.map((issuer) => {
                                const isActive = formData.issuer === issuer
                                return (
                                  <button
                                    key={issuer}
                                    type="button"
                                    onClick={() => handleSelectIssuer(issuer)}
                                    className={clsx(
                                      'w-full text-left rounded-2xl border px-4 py-3 text-sm transition-all',
                                      isActive
                                        ? 'border-soft-black bg-soft-black/5 text-soft-black'
                                        : 'border-gray-100 text-gray-700 hover:border-accent-yellow/50 hover:bg-cream/60'
                                    )}
                                  >
                                    {issuer}
                                  </button>
                                )
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <section className="space-y-3">
                        <div className="rounded-2xl border border-gray-100 bg-cream/70 px-4 py-3">
                          <div className="text-sm font-semibold text-soft-black">{activeForeignIssuerGroup.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{activeForeignIssuerGroup.description}</div>
                        </div>
                        <div className="space-y-2">
                          {activeForeignIssuerGroup.issuers.map((issuer) => {
                            const isActive = formData.issuer === issuer
                            return (
                              <button
                                key={issuer}
                                type="button"
                                onClick={() => handleSelectIssuer(issuer)}
                                className={clsx(
                                  'w-full text-left rounded-2xl border px-4 py-3 text-sm transition-all',
                                  isActive
                                    ? 'border-soft-black bg-soft-black/5 text-soft-black'
                                    : 'border-gray-100 text-gray-700 hover:border-accent-yellow/50 hover:bg-cream/60'
                                )}
                              >
                                {issuer}
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {showDetailModal && selectedCard && (
        <AnimatedModal
          isOpen={showDetailModal}
          onClose={closeDetailModal}
          title="卡片详情"
          size="full"
          className="rounded-3xl !max-h-[95vh] h-[95vh]"
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-soft-black">{selectedCard.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedCard.description}</p>
                </div>
                <span
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    selectedCard.scope === 'public'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-purple-50 text-purple-600'
                  )}
                >
                  {getAlbumScopeLabel(selectedCard.scope)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-gray-500">发卡行</span>
                  <span className="font-medium text-gray-900">{selectedCard.issuer}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-gray-500">卡BIN</span>
                  <span className="font-medium text-gray-900">{selectedCard.bin}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-gray-500">卡组织</span>
                  <span className="font-medium text-gray-900">{getCardOrganizationLabel(selectedCard)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-gray-500">卡等级</span>
                  <span className="font-medium text-gray-900">{selectedCard.level || selectedCard.group || '未知等级'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-gray-500">联名卡</span>
                  <span className="font-medium text-gray-900">{selectedCard.isCoBranded ? '是' : '否'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="text-gray-500">积分计划</span>
                  <span className="font-medium text-gray-900">
                    {selectedCard.hasPointsProgram
                      ? (selectedCard.pointsProgramName || '已开启')
                      : '无'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 sm:col-span-2">
                  <span className="text-gray-500">俱乐部积分关联</span>
                  <span className="font-medium text-gray-900">
                    {selectedCard.hasClubPoints
                      ? (selectedCard.clubPointsProgram || '已关联')
                      : '无'}
                  </span>
                </div>
              </div>
            </div>

            {permissions.isAdmin && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">申报记录</h4>
                  <span className="text-xs text-gray-400">
                    共 {selectedCardReports.length} 条
                  </span>
                </div>
                <div className="space-y-3">
                  {selectedCardReports.map((report) => (
                      <div key={report.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{report.issueType}</span>
                          <span className={clsx('text-xs font-semibold', report.status === 'open' ? 'text-orange-500' : 'text-green-600')}>
                            {report.status === 'open' ? '待处理' : '已处理'}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{report.description}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                          <span>{report.reporter?.name || '匿名用户'}</span>
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        {report.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => resolveReport(report.id)}
                            className="mt-2 inline-flex items-center gap-2 rounded-full bg-soft-black px-3 py-1 text-xs font-semibold text-white hover:bg-gray-900 transition-colors"
                          >
                            标记已处理
                          </button>
                        )}
                      </div>
                    ))}
                  {selectedCardReports.length === 0 && (
                    <div className="text-sm text-gray-400">暂无申报记录</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleEditCard(selectedCard)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={!permissions.isAdmin}
              >
                <Edit className="w-4 h-4" />
                编辑卡片
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!permissions.isAdmin) {
                    notify.error('只有管理员可以删除卡片')
                    return
                  }
                  setCardToDelete(selectedCard)
                  setShowDeleteModal(true)
                  closeDetailModal()
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                disabled={!permissions.isAdmin}
              >
                <Trash2 className="w-4 h-4" />
                删除卡片
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-soft-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
              >
                <FileText className="w-4 h-4" />
                申报问题
              </button>
            </div>
          </div>
        </AnimatedModal>
      )}

      {showReportModal && selectedCard && (
        <AnimatedModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="卡片问题申报"
          size="lg"
          footer={(
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
          )}
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-3 text-sm text-yellow-800">
              请填写卡片遇到的问题，管理员会在申报列表中处理。
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">问题类型</label>
              <input
                value={reportForm.issueType}
                onChange={(event) => setReportForm((prev) => ({ ...prev, issueType: event.target.value }))}
                placeholder="例如 卡BIN错误 / 卡组织信息不匹配"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">问题描述</label>
              <textarea
                value={reportForm.description}
                onChange={(event) => setReportForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="补充问题描述和建议"
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
      )}

      {showDeleteModal && cardToDelete && (
        <AnimatedModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="删除卡片"
          size="sm"
          footer={(
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteCard}
                className="px-6 py-2 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          )}
        >
          <p className="text-sm text-gray-600">
            确定要删除「{cardToDelete.title}」吗？删除后无法恢复。
          </p>
        </AnimatedModal>
      )}
    </div>
  )
}

export default CardAlbum
