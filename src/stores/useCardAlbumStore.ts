import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const CARD_ALBUM_STORAGE_KEY = 'card-album-store'

const TAB_OPTIONS = [
  { key: 'public', label: '公共卡册' },
  { key: 'personal', label: '个人卡册' },
] as const

export type AlbumScope = (typeof TAB_OPTIONS)[number]['key']

export type CardAlbumItem = {
  id: string
  issuer: string
  title: string
  bin: string
  organization: string
  secondaryOrganization?: string
  isDualNetwork?: boolean
  level: string
  // 兼容旧数据，迁移后可删除
  group?: string
  description: string
  isCoBranded?: boolean
  hasPointsProgram?: boolean
  pointsProgramName?: string
  hasClubPoints?: boolean
  clubPointsProgram?: string
  scope: AlbumScope
  updatedAt: string
}

const defaultCards: CardAlbumItem[] = [
  {
    id: 'public-1',
    issuer: '招商银行',
    title: '银联高端卡',
    bin: '622848',
    organization: 'UnionPay',
    secondaryOrganization: '',
    isDualNetwork: false,
    level: '白金卡',
    description: '适合公共展示的高端权益卡片。',
    isCoBranded: false,
    hasPointsProgram: true,
    pointsProgramName: '银联尊享积分',
    hasClubPoints: false,
    clubPointsProgram: '',
    scope: 'public',
    updatedAt: '2025-02-12',
  },
  {
    id: 'public-2',
    issuer: '中国建设银行',
    title: '旅行白金卡',
    bin: '436742',
    organization: 'Visa',
    secondaryOrganization: '',
    isDualNetwork: false,
    level: 'Infinite',
    description: '公共卡册中的旅行主题卡片模板。',
    isCoBranded: true,
    hasPointsProgram: true,
    pointsProgramName: 'Travel Rewards',
    hasClubPoints: true,
    clubPointsProgram: '航司里程计划',
    scope: 'public',
    updatedAt: '2025-02-10',
  },
  {
    id: 'personal-1',
    issuer: '中国工商银行',
    title: '环球通卡',
    bin: '621226',
    organization: 'Mastercard',
    secondaryOrganization: '',
    isDualNetwork: false,
    level: 'World',
    description: '个人卡册中常用的银行卡片。',
    isCoBranded: false,
    hasPointsProgram: false,
    pointsProgramName: '',
    hasClubPoints: false,
    clubPointsProgram: '',
    scope: 'personal',
    updatedAt: '2025-02-08',
  },
]

type CardAlbumState = {
  cards: CardAlbumItem[]
  addCard: (card: CardAlbumItem) => void
  addToPersonal: (card: CardAlbumItem) => { added: boolean }
  updateCard: (card: CardAlbumItem) => void
  removeCard: (cardId: string) => void
}

export const useCardAlbumStore = create<CardAlbumState>()(
  persist(
    (set, get) => ({
      cards: defaultCards,
      addCard: (card) => {
        set((state) => ({ cards: [card, ...state.cards] }))
      },
      addToPersonal: (card) => {
        const { cards } = get()
        const alreadyAdded = cards.some(
          (item) => item.scope === 'personal' && item.bin === card.bin && item.title === card.title && item.issuer === card.issuer
        )
        if (alreadyAdded) {
          return { added: false }
        }
        const newCard: CardAlbumItem = {
          ...card,
          id: `personal-${Date.now()}`,
          scope: 'personal',
          updatedAt: new Date().toISOString().slice(0, 10),
        }
        set((state) => ({ cards: [newCard, ...state.cards] }))
        return { added: true }
      },
      updateCard: (card) => {
        set((state) => ({
          cards: state.cards.map((item) => (item.id === card.id ? card : item)),
        }))
      },
      removeCard: (cardId) => {
        set((state) => ({
          cards: state.cards.filter((item) => item.id !== cardId),
        }))
      },
    }),
    {
      name: CARD_ALBUM_STORAGE_KEY,
      version: 3,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as CardAlbumState
        }

        const state = persistedState as {
          cards?: Array<CardAlbumItem & { group?: string; secondaryOrganization?: string; isDualNetwork?: boolean }>
        }
        if (!Array.isArray(state.cards)) {
          return persistedState as CardAlbumState
        }

        return {
          ...state,
          cards: state.cards.map((card) => ({
            ...card,
            level: card.level || card.group || '未知等级',
            secondaryOrganization: card.secondaryOrganization || '',
            isDualNetwork: Boolean(card.isDualNetwork && card.secondaryOrganization),
          })),
        } as CardAlbumState
      },
    }
  )
)

export const getAlbumScopeLabel = (scope: AlbumScope) => {
  return scope === 'public' ? '公共卡册' : '个人卡册'
}
