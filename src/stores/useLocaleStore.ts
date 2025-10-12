import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { changeLanguage, defaultLanguage } from '@/lib/i18n'

export type ExperienceMode = 'domestic' | 'international'

interface LocaleState {
  language: string
  experience: ExperienceMode
  hasSelectedLanguage: boolean
  hasCompletedTour: boolean
  setPreference: (language: string, experience: ExperienceMode) => void
  markTourCompleted: () => void
  resetTour: () => void
  clearPreference: () => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      language: defaultLanguage,
      experience: 'international',
      hasSelectedLanguage: false,
      hasCompletedTour: false,
      setPreference: (language, experience) => {
        changeLanguage(language)
        set({
          language,
          experience,
          hasSelectedLanguage: true,
        })
      },
      markTourCompleted: () => set({ hasCompletedTour: true }),
      resetTour: () => set({ hasCompletedTour: false }),
      clearPreference: () =>
        set({
          language: defaultLanguage,
          experience: 'international',
          hasSelectedLanguage: false,
          hasCompletedTour: false,
        }),
    }),
    {
      name: 'locale-preference',
      partialize: (state) => ({
        language: state.language,
        experience: state.experience,
        hasSelectedLanguage: state.hasSelectedLanguage,
        hasCompletedTour: state.hasCompletedTour,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.hasSelectedLanguage && state.language) {
          changeLanguage(state.language)
        }
      },
    }
  )
)
