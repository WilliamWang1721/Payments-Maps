export type DefaultLocationOption = {
  key: string
  label: string
  longitude: number
  latitude: number
}

export const DEFAULT_LOCATION_OPTIONS: DefaultLocationOption[] = [
  { key: 'guangzhou', label: '广州', longitude: 113.264385, latitude: 23.129112 },
  { key: 'shanghai', label: '上海', longitude: 121.473667, latitude: 31.230525 },
  { key: 'shenzhen', label: '深圳', longitude: 114.057939, latitude: 22.543527 },
  { key: 'hangzhou', label: '杭州', longitude: 120.15507, latitude: 30.274084 },
  { key: 'chengdu', label: '成都', longitude: 104.066541, latitude: 30.572269 },
  { key: 'beijing', label: '北京', longitude: 116.407387, latitude: 39.904179 },
]

const FALLBACK_LOCATION_KEY = 'guangzhou'
const STORAGE_KEY = 'payments_maps_default_location_by_user_v1'

const getStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const parseStorage = (): Record<string, string> => {
  const storage = getStorage()
  if (!storage) return {}

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [userId, value]) => {
      if (typeof value === 'string' && value.trim()) {
        acc[userId] = value
      }
      return acc
    }, {})
  } catch {
    return {}
  }
}

const writeStorage = (value: Record<string, string>) => {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore storage write errors
  }
}

const getFallbackLocation = () => {
  return (
    DEFAULT_LOCATION_OPTIONS.find((item) => item.key === FALLBACK_LOCATION_KEY) ||
    DEFAULT_LOCATION_OPTIONS[0]
  )
}

export const getDefaultLocationByKey = (key?: string | null): DefaultLocationOption => {
  if (!key) return getFallbackLocation()
  return DEFAULT_LOCATION_OPTIONS.find((item) => item.key === key) || getFallbackLocation()
}

export const getUserDefaultLocationKey = (userId?: string | null): string => {
  if (!userId) return FALLBACK_LOCATION_KEY
  const map = parseStorage()
  const savedKey = map[userId]
  return getDefaultLocationByKey(savedKey).key
}

export const getUserDefaultLocation = (userId?: string | null): DefaultLocationOption => {
  return getDefaultLocationByKey(getUserDefaultLocationKey(userId))
}

export const saveUserDefaultLocationKey = (userId: string, key: string) => {
  if (!userId) return
  const map = parseStorage()
  map[userId] = getDefaultLocationByKey(key).key
  writeStorage(map)
}

export const FALLBACK_DEFAULT_LOCATION = getFallbackLocation()
