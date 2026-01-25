import { create } from 'zustand'

export type AlbumScope = 'public' | 'personal'

export type CardAlbumItem = {
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

interface CardAlbumState {
  cards: CardAlbumItem[]
  addCard: (card: CardAlbumItem) => void
}

export const useCardAlbumStore = create<CardAlbumState>((set) => ({
  cards: initialCards,
  addCard: (card) =>
    set((state) => ({
      cards: [card, ...state.cards],
    })),
}))
