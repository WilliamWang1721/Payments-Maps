const GOOGLE_TRANSLATE_STORAGE_KEY = 'payments-maps.translation-cache.v1'

type TranslationCacheRecord = Record<string, string>

const memoryCache = new Map<string, string>()
let cacheHydrated = false
let persistTimer: number | null = null

const loadCacheFromStorage = () => {
  if (cacheHydrated) return
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(GOOGLE_TRANSLATE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TranslationCacheRecord
      Object.entries(parsed).forEach(([key, value]) => {
        memoryCache.set(key, value)
      })
    }
  } catch (error) {
    console.warn('[autoTranslate] Failed to hydrate cache from storage:', error)
  } finally {
    cacheHydrated = true
  }
}

const persistCacheToStorage = () => {
  if (typeof window === 'undefined') return

  if (persistTimer) {
    window.clearTimeout(persistTimer)
  }

  persistTimer = window.setTimeout(() => {
    try {
      const snapshot: TranslationCacheRecord = {}
      memoryCache.forEach((value, key) => {
        snapshot[key] = value
      })
      window.localStorage.setItem(GOOGLE_TRANSLATE_STORAGE_KEY, JSON.stringify(snapshot))
    } catch (error) {
      console.warn('[autoTranslate] Failed to persist cache:', error)
    }
  }, 200)
}

const getCacheKey = (text: string, targetLang: string) => `${targetLang}::${text}`

const resolveFromCache = (text: string, targetLang: string): string | undefined => {
  loadCacheFromStorage()
  const key = getCacheKey(text, targetLang)
  return memoryCache.get(key)
}

const saveToCache = (text: string, translated: string, targetLang: string) => {
  const key = getCacheKey(text, targetLang)
  memoryCache.set(key, translated)
  persistCacheToStorage()
}

const GOOGLE_LANG_MAP: Record<string, string> = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  ru: 'ru',
  de: 'de'
}

export const normalizeLanguage = (lang?: string) => {
  if (!lang) return 'zh-CN'
  const normalized = lang.toLowerCase()
  if (GOOGLE_LANG_MAP[normalized]) {
    return GOOGLE_LANG_MAP[normalized]
  }
  const short = normalized.split('-')[0]
  return GOOGLE_LANG_MAP[short] || short || 'en'
}

const translateViaPublicEndpoint = async (text: string, targetLang: string) => {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: targetLang,
    dt: 't',
    q: text
  })

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[autoTranslate] Public API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0]
      .map((segment: unknown) => Array.isArray(segment) ? segment[0] : '')
      .join('')
    if (translated) {
      return translated
    }
  }

  throw new Error('[autoTranslate] Public API returned unexpected format')
}

export const translateText = async (text: string, targetLang: string) => {
  if (!text) return ''
  const normalizedTarget = normalizeLanguage(targetLang)
  if (normalizedTarget === 'zh-CN') return text

  const cached = resolveFromCache(text, normalizedTarget)
  if (cached) return cached

  try {
    const translated = await translateViaPublicEndpoint(text, normalizedTarget)

    saveToCache(text, translated, normalizedTarget)
    return translated
  } catch (error) {
    console.error('[autoTranslate] Translation failed:', error)
    // 失败时返回原始文本，避免阻塞
    saveToCache(text, text, normalizedTarget)
    return text
  }
}

export const translateTextBatch = async (texts: string[], targetLang: string) => {
  const normalizedTarget = normalizeLanguage(targetLang)
  if (normalizedTarget === 'zh-CN') return texts

  const results: string[] = []
  for (const text of texts) {
    results.push(await translateText(text, normalizedTarget))
  }
  return results
}
