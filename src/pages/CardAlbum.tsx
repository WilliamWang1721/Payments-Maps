import { useMemo, useState } from 'react'
import { BookOpen, Plus, User, Users } from 'lucide-react'
import AnimatedModal from '@/components/ui/AnimatedModal'
import AnimatedButton from '@/components/ui/AnimatedButton'
import clsx from 'clsx'

const TAB_OPTIONS = [
  { key: 'public', label: '公共卡册', icon: Users },
  { key: 'personal', label: '个人卡册', icon: User },
] as const

type AlbumScope = (typeof TAB_OPTIONS)[number]['key']

type CardAlbumItem = {
  id: string
  title: string
  description: string
  scope: AlbumScope
  updatedAt: string
}

const initialCards: CardAlbumItem[] = [
  {
    id: 'public-1',
    title: '城市出行模板',
    description: '适合公共路线与常用地点的合集，便于快速复用。',
    scope: 'public',
    updatedAt: '2025-02-12',
  },
  {
    id: 'public-2',
    title: '合作伙伴清单',
    description: '对外展示的品牌与渠道卡片合集。',
    scope: 'public',
    updatedAt: '2025-02-10',
  },
  {
    id: 'personal-1',
    title: '我的收藏卡册',
    description: '私人保存的卡片组合，便于日常管理。',
    scope: 'personal',
    updatedAt: '2025-02-08',
  },
]

const CardAlbum = () => {
  const [activeTab, setActiveTab] = useState<AlbumScope>('public')
  const [cards, setCards] = useState<CardAlbumItem[]>(initialCards)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scope: 'public' as AlbumScope,
  })

  const filteredCards = useMemo(
    () => cards.filter((card) => card.scope === activeTab),
    [cards, activeTab]
  )

  const handleOpenAddModal = () => {
    setFormData({ title: '', description: '', scope: activeTab })
    setShowAddModal(true)
  }

  const handleAddCard = () => {
    if (!formData.title.trim()) {
      return
    }

    const newCard: CardAlbumItem = {
      id: `${formData.scope}-${Date.now()}`,
      title: formData.title.trim(),
      description: formData.description.trim() || '暂无描述',
      scope: formData.scope,
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    setCards((prev) => [newCard, ...prev])
    setShowAddModal(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="w-6 h-6 text-accent-yellow" />
            <span>卡册</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            统一管理公共与个人卡片内容
          </div>
        </div>
        <AnimatedButton className="gap-2" onClick={handleOpenAddModal}>
          <Plus className="w-4 h-4" />
          添加卡片
        </AnimatedButton>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="text-sm text-gray-500 dark:text-gray-400">
          当前共有 <span className="font-semibold text-soft-black dark:text-white">{filteredCards.length}</span> 张卡片
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center bg-white/50 dark:bg-slate-900/40">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-soft-black dark:text-white">暂时没有卡片</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            点击右上角“添加卡片”，将内容归档到公共或个人卡册。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="group rounded-2xl border border-white/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-soft hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-soft-black dark:text-white">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {card.description}
                  </p>
                </div>
                <span
                  className={clsx(
                    'text-xs font-semibold px-2 py-1 rounded-full',
                    card.scope === 'public'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-purple-50 text-purple-600'
                  )}
                >
                  {card.scope === 'public' ? '公共' : '个人'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                <span>更新于 {card.updatedAt}</span>
                <span className="text-accent-yellow font-medium">查看详情</span>
              </div>
            </div>
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
            <AnimatedButton onClick={handleAddCard} disabled={!formData.title.trim()}>
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
