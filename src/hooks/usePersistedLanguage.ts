import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGE_STORAGE_KEY = 'language'

export const usePersistedLanguage = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage)
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && event.newValue && event.newValue !== i18n.language) {
        i18n.changeLanguage(event.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [i18n])
}

export default usePersistedLanguage
