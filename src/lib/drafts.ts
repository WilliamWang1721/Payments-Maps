const STORAGE_KEY = 'payments_maps_pos_drafts'

export type DraftRecord<T = any> = {
  id: string
  title: string
  savedAt: string
  data: T
  step?: number
}

const safeParse = (): DraftRecord[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

const persist = (drafts: DraftRecord[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
}

export const listDrafts = <T = any>(): DraftRecord<T>[] => safeParse()

export const getDraft = <T = any>(id: string): DraftRecord<T> | undefined =>
  safeParse().find((draft) => draft.id === id)

export const saveDraft = <T = any>(draft: Omit<DraftRecord<T>, 'id' | 'savedAt'> & { id?: string }) => {
  const drafts = safeParse()
  const now = new Date().toISOString()
  const existingIndex = draft.id ? drafts.findIndex((d) => d.id === draft.id) : -1
  const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const record: DraftRecord<T> = {
    id: draft.id || generateId(),
    title: draft.title || '未命名草稿',
    savedAt: now,
    data: draft.data,
    step: draft.step,
  }

  if (existingIndex >= 0) {
    drafts[existingIndex] = record
  } else {
    drafts.unshift(record)
  }

  persist(drafts)
  return record
}

export const deleteDraft = (id: string) => {
  const drafts = safeParse().filter((d) => d.id !== id)
  persist(drafts)
}
