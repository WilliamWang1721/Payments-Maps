import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeLanguage, translateText } from '@/lib/autoTranslate'
import { subscribeTranslationTrigger } from '@/lib/translationTrigger'

type TextMap<T extends Record<string, string>> = {
  [K in keyof T]: T[K]
}

export const useAutoTranslatedText = (text: string) => {
  const { i18n } = useTranslation()
  const [translated, setTranslated] = useState(text)
  const [triggerCount, setTriggerCount] = useState(0)

  useEffect(() => {
    return subscribeTranslationTrigger(() => {
      setTriggerCount(prev => prev + 1)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const targetLang = normalizeLanguage(i18n.language)

    if (!text) {
      setTranslated('')
      return
    }

    if (targetLang === 'zh-CN') {
      setTranslated(text)
      return
    }

    const performTranslation = async () => {
      try {
        const result = await translateText(text, targetLang)
        if (!cancelled) {
          setTranslated(result)
        }
      } catch (error) {
        console.error('[useAutoTranslatedText] Failed to translate text:', error)
        if (!cancelled) {
          setTranslated(text)
        }
      }
    }

    performTranslation()

    return () => {
      cancelled = true
    }
  }, [text, i18n.language, triggerCount])

  return translated
}

export const useAutoTranslatedTextMap = <T extends Record<string, string>>(textMap: T): TextMap<T> => {
  const { i18n } = useTranslation()
  const stableMap = useMemo(() => textMap, [textMap])
  const [translatedMap, setTranslatedMap] = useState<TextMap<T>>(stableMap)
  const [triggerCount, setTriggerCount] = useState(0)

  useEffect(() => {
    return subscribeTranslationTrigger(() => {
      setTriggerCount(prev => prev + 1)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const targetLang = normalizeLanguage(i18n.language)

    if (targetLang === 'zh-CN') {
      setTranslatedMap(stableMap)
      return
    }

    const entries = Object.entries(stableMap)
    if (entries.length === 0) {
      setTranslatedMap(stableMap)
      return
    }

    const translateEntries = async () => {
      try {
        const translatedEntries = await Promise.all(
          entries.map(async ([key, value]) => {
            if (!value) return [key, value] as const
            const translatedValue = await translateText(value, targetLang)
            return [key, translatedValue] as const
          })
        )

        if (cancelled) return
        setTranslatedMap(Object.fromEntries(translatedEntries) as TextMap<T>)
      } catch (error) {
        console.error('[useAutoTranslatedTextMap] Failed to translate map:', error)
        if (!cancelled) {
          setTranslatedMap(stableMap)
        }
      }
    }

    translateEntries()

    return () => {
      cancelled = true
    }
  }, [stableMap, i18n.language, triggerCount])

  return translatedMap
}
