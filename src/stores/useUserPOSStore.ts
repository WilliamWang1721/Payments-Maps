import { create } from 'zustand'
import { posService, type FavoriteWithPOS, type HistoryWithPOS } from '@/services/posService'
import type { POSMachine } from '@/types'
import { getFriendlyErrorMessage } from '@/lib/notify'

interface UserPOSState {
  favorites: FavoriteWithPOS[]
  history: HistoryWithPOS[]
  myPOSMachines: POSMachine[]
  favoritesLoading: boolean
  historyLoading: boolean
  myPOSLoading: boolean
  favoritesLoaded: boolean
  historyLoaded: boolean
  myPOSLoaded: boolean
  favoritesError: string | null
  historyError: string | null
  myPOSError: string | null
  loadFavorites: (userId: string) => Promise<void>
  removeFavorite: (favoriteId: string) => Promise<void>
  loadHistory: (userId: string, limit?: number) => Promise<void>
  clearHistory: (userId: string) => Promise<void>
  removeHistoryItem: (historyId: string) => Promise<void>
  loadMyPOSMachines: (userId: string) => Promise<void>
  removeMyPOSMachine: (posId: string) => Promise<void>
  reset: () => void
}

const initialState = {
  favorites: [] as FavoriteWithPOS[],
  history: [] as HistoryWithPOS[],
  myPOSMachines: [] as POSMachine[],
  favoritesLoading: false,
  historyLoading: false,
  myPOSLoading: false,
  favoritesLoaded: false,
  historyLoaded: false,
  myPOSLoaded: false,
  favoritesError: null as string | null,
  historyError: null as string | null,
  myPOSError: null as string | null,
}

export const useUserPOSStore = create<UserPOSState>((set) => ({
  ...initialState,

  loadFavorites: async (userId) => {
    set({ favoritesLoading: true, favoritesError: null })
    try {
      const favorites = await posService.listUserFavorites(userId)
      set({ favorites, favoritesError: null })
    } catch (error) {
      set({
        favoritesError: getFriendlyErrorMessage(
          error,
          '加载收藏列表失败，请稍后重试',
          '网络异常，收藏列表暂时无法加载'
        ),
      })
      throw error
    } finally {
      set({ favoritesLoading: false, favoritesLoaded: true })
    }
  },

  removeFavorite: async (favoriteId) => {
    try {
      await posService.removeFavoriteById(favoriteId)
      set((state) => ({
        favorites: state.favorites.filter((item) => item.id !== favoriteId),
        favoritesError: null,
      }))
    } catch (error) {
      set({
        favoritesError: getFriendlyErrorMessage(
          error,
          '取消收藏失败，请稍后重试',
          '网络异常，暂时无法取消收藏'
        ),
      })
      throw error
    }
  },

  loadHistory: async (userId, limit = 100) => {
    set({ historyLoading: true, historyError: null })
    try {
      const history = await posService.listUserHistory(userId, limit)
      set({ history, historyError: null })
    } catch (error) {
      set({
        historyError: getFriendlyErrorMessage(
          error,
          '加载浏览历史失败，请稍后重试',
          '网络异常，浏览历史暂时无法加载'
        ),
      })
      throw error
    } finally {
      set({ historyLoading: false, historyLoaded: true })
    }
  },

  clearHistory: async (userId) => {
    try {
      await posService.clearUserHistory(userId)
      set({ history: [], historyError: null })
    } catch (error) {
      set({
        historyError: getFriendlyErrorMessage(
          error,
          '清空历史失败，请稍后重试',
          '网络异常，暂时无法清空历史'
        ),
      })
      throw error
    }
  },

  removeHistoryItem: async (historyId) => {
    try {
      await posService.removeHistoryById(historyId)
      set((state) => ({
        history: state.history.filter((item) => item.id !== historyId),
        historyError: null,
      }))
    } catch (error) {
      set({
        historyError: getFriendlyErrorMessage(
          error,
          '删除历史记录失败，请稍后重试',
          '网络异常，暂时无法删除历史记录'
        ),
      })
      throw error
    }
  },

  loadMyPOSMachines: async (userId) => {
    set({ myPOSLoading: true, myPOSError: null })
    try {
      const myPOSMachines = await posService.listUserPOSMachines(userId)
      set({ myPOSMachines, myPOSError: null })
    } catch (error) {
      set({
        myPOSError: getFriendlyErrorMessage(
          error,
          '加载我的 POS 机失败，请稍后重试',
          '网络异常，我的 POS 列表暂时无法加载'
        ),
      })
      throw error
    } finally {
      set({ myPOSLoading: false, myPOSLoaded: true })
    }
  },

  removeMyPOSMachine: async (posId) => {
    try {
      await posService.removePOSMachineById(posId)
      set((state) => ({
        myPOSMachines: state.myPOSMachines.filter((item) => item.id !== posId),
        myPOSError: null,
      }))
    } catch (error) {
      set({
        myPOSError: getFriendlyErrorMessage(
          error,
          '删除 POS 机失败，请稍后重试',
          '网络异常，暂时无法删除 POS 机'
        ),
      })
      throw error
    }
  },

  reset: () => set(initialState),
}))
