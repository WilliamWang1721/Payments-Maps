import { create } from 'zustand'

export interface CriticalNotice {
  id: string
  title: string
  message: string
  details?: string
}

interface NotificationState {
  critical: CriticalNotice | null
  criticalQueue: CriticalNotice[]
  showCritical: (notice: Omit<CriticalNotice, 'id'> & { id?: string }) => void
  closeCritical: () => void
  clearAllCritical: () => void
}

function createNoticeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useNotificationStore = create<NotificationState>((set) => {
  return {
    critical: null,
    criticalQueue: [],

    showCritical: (notice) => {
      const payload: CriticalNotice = {
        id: notice.id ?? createNoticeId(),
        title: notice.title,
        message: notice.message,
        details: notice.details,
      }

      set((state) => {
        if (state.critical) {
          return { criticalQueue: [...state.criticalQueue, payload] }
        }

        return { critical: payload }
      })
    },

    closeCritical: () => {
      set((state) => {
        if (state.criticalQueue.length === 0) {
          return { critical: null }
        }

        const [next, ...rest] = state.criticalQueue
        return { critical: next, criticalQueue: rest }
      })
    },

    clearAllCritical: () => {
      set({ critical: null, criticalQueue: [] })
    },
  }
})

