import { useMemo, useState } from 'react'
import { Check, Filter, Plus, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import AnimatedModal from '@/components/ui/AnimatedModal'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedListItem from '@/components/AnimatedListItem'
import clsx from 'clsx'
import { useMapStore } from '@/stores/useMapStore'

const TAB_OPTIONS = [
  { key: 'public', label: '公共卡册', icon: Users },
  { key: 'personal', label: '个人卡册', icon: User },
] as const

type AlbumScope = (typeof TAB_OPTIONS)[number]['key']

type CardAlbumItem = {
  id: string
  issuer: string
  title: string
  bin: string
  organization: string
  group: string
  description: string
  scope: AlbumScope
  updatedAt: string
}

const initialCards: CardAlbumItem[] = [
  {
    id: 'public-1',
    issuer: '招商银行',
    title: '银联高端卡',
    bin: '622848',
    organization: 'UnionPay',
    group: '高端卡组',
    description: '适合公共展示的高端权益卡片。',
    scope: 'public',
    updatedAt: '2025-02-12',
  },
  {
    id: 'public-2',
    issuer: '中国建设银行',
    title: '旅行白金卡',
    bin: '436742',
    organization: 'Visa',
    group: '白金卡组',
    description: '公共卡册中的旅行主题卡片模板。',
    scope: 'public',
    updatedAt: '2025-02-10',
  },
  {
    id: 'personal-1',
    issuer: '中国工商银行',
    title: '环球通卡',
    bin: '621226',
    organization: 'Mastercard',
    group: '经典卡组',
    description: '个人卡册中常用的银行卡片。',
    scope: 'personal',
    updatedAt: '2025-02-08',
  },
]

const CardAlbum = () => {
  const [activeTab, setActiveTab] = useState<AlbumScope>('public')
  const [cards, setCards] = useState<CardAlbumItem[]>(initialCards)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    issuer: '',
    title: '',
    bin: '',
    organization: '',
    group: '',
    description: '',
    scope: 'public' as AlbumScope,
  })
  const searchKeyword = useMapStore((state) => state.searchKeyword)
  const [filters, setFilters] = useState({
    issuer: 'all',
    organization: 'all',
    bin: 'all',
  })

  const baseCards = useMemo(() => cards.filter((card) => card.scope === activeTab), [cards, activeTab])
  const personalCards = useMemo(() => cards.filter((card) => card.scope === 'personal'), [cards])

  const filterOptions = useMemo(() => {
    const issuers = new Set<string>()
    const organizations = new Set<string>()
    const bins = new Set<string>()
    baseCards.forEach((card) => {
      issuers.add(card.issuer)
      organizations.add(card.organization)
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
        ? [card.title, card.issuer, card.organization, card.group, card.bin]
            .some((value) => value.toLowerCase().includes(keyword))
        : true
      const matchesIssuer = filters.issuer === 'all' || card.issuer === filters.issuer
      const matchesOrganization = filters.organization === 'all' || card.organization === filters.organization
      const matchesBin = filters.bin === 'all' || card.bin === filters.bin
      return matchesKeyword && matchesIssuer && matchesOrganization && matchesBin
    })
  }, [baseCards, filters, searchKeyword])

  const handleOpenAddModal = () => {
    setFormData({
      issuer: '',
      title: '',
      bin: '',
      organization: '',
      group: '',
      description: '',
      scope: activeTab,
    })
    setShowAddModal(true)
  }

  const handleAddCard = () => {
    if (!formData.title.trim() || !formData.issuer.trim() || !formData.bin.trim()) {
      toast.error('请补充卡片名称、发卡行与卡BIN')
      return
    }

    const newCard: CardAlbumItem = {
      id: `${formData.scope}-${Date.now()}`,
      issuer: formData.issuer.trim(),
      title: formData.title.trim(),
      bin: formData.bin.trim(),
      organization: formData.organization.trim() || '未知卡组织',
      group: formData.group.trim() || '未分类卡组',
      description: formData.description.trim() || '暂无描述',
      scope: formData.scope,
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    setCards((prev) => [newCard, ...prev])
    setShowAddModal(false)
    toast.success('已添加卡片')
  }

  const handleAddToPersonal = (card: CardAlbumItem) => {
    const alreadyAdded = personalCards.some(
      (item) => item.bin === card.bin && item.title === card.title && item.issuer === card.issuer
    )
    if (alreadyAdded) {
      toast.info('该卡片已在我的卡册')
      return
    }

    const newCard: CardAlbumItem = {
      ...card,
      id: `personal-${Date.now()}`,
      scope: 'personal',
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    setCards((prev) => [newCard, ...prev])
    toast.success('已加入我的卡册')
  }

  return (
    <div className="flex flex-col gap-6">
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
          <AnimatedButton className="gap-2" onClick={handleOpenAddModal}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCards.map((card, index) => (
            <AnimatedListItem
              key={card.id}
              index={index}
              delay={0.05}
              direction="up"
              className="group relative rounded-2xl border border-white/70 dark:border-slate-800 bg-gradient-to-br from-white/90 via-white/70 to-blue-50/80 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-800/70 p-5 shadow-soft hover:shadow-xl transition-shadow"
            >
              <div className="absolute top-4 right-4">
                {card.scope === 'public' ? (
                  <button
                    type="button"
                    onClick={() => handleAddToPersonal(card)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full"
                  >
                    <Plus className="w-3 h-3" />
                    添加到我的卡册
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full cursor-default"
                  >
                    <Check className="w-3 h-3" />
                    已在我的卡册
                  </button>
                )}
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
                  {card.scope === 'public' ? '公共卡册' : '我的卡册'}
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
                  <span className="font-semibold text-soft-black dark:text-white">{card.organization}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>卡组</span>
                  <span className="font-semibold text-soft-black dark:text-white">{card.group}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                <span>更新于 {card.updatedAt}</span>
                <span className="text-accent-yellow font-medium">查看详情</span>
              </div>
            </AnimatedListItem>
          ))}
        </div>
      )}

      <AnimatedModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="添加卡片"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <AnimatedButton variant="outline" onClick={() => setShowAddModal(false)}>
              取消
            </AnimatedButton>
            <AnimatedButton onClick={handleAddCard}>
              确认添加
            </AnimatedButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">卡片名称</label>
            <input
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="请输入卡片名称"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">发卡行</label>
            <input
              value={formData.issuer}
              onChange={(event) => setFormData((prev) => ({ ...prev, issuer: event.target.value }))}
              placeholder="请输入发卡行名称"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">卡BIN</label>
            <input
              value={formData.bin}
              onChange={(event) => setFormData((prev) => ({ ...prev, bin: event.target.value }))}
              placeholder="例如 622848"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">卡组织</label>
              <input
                value={formData.organization}
                onChange={(event) => setFormData((prev) => ({ ...prev, organization: event.target.value }))}
                placeholder="Visa / Mastercard / UnionPay"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">卡组</label>
              <input
                value={formData.group}
                onChange={(event) => setFormData((prev) => ({ ...prev, group: event.target.value }))}
                placeholder="例如 白金卡组"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40"
              />
            </div>
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
      </AnimatedModal>
    </div>
  )
}

export default CardAlbum
