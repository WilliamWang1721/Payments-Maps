import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { useLocaleStore } from '@/stores/useLocaleStore'

interface ExperienceOption {
  key: 'domestic' | 'international'
  language: string
}

const experienceOptions: ExperienceOption[] = [
  { key: 'domestic', language: 'zh' },
  { key: 'international', language: 'en' },
]

const InitialExperiencePrompt = () => {
  const { t } = useTranslation()
  const {
    hasSelectedLanguage,
    setPreference,
    language,
    experience,
  } = useLocaleStore()
  const [shouldRender, setShouldRender] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setShouldRender(true)
  }, [])

  const activeKey = useMemo(() => experience, [experience])

  const promoPoints = useMemo(() => {
    const items = t('experiencePrompt.promo.points', { returnObjects: true })
    return Array.isArray(items) ? items : []
  }, [t])

  if (!shouldRender || hasSelectedLanguage || dismissed) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex flex-col"
      >
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="relative mx-auto mt-6 w-[min(96vw,720px)] rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-500">
                  {t('experiencePrompt.badge')}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {t('experiencePrompt.title')}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {t('experiencePrompt.subtitle')}
                </p>
              </div>
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Globe2 className="h-8 w-8" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {experienceOptions.map((option) => {
                const isActive = activeKey === option.key && language === option.language
                const label = t(`experiencePrompt.options.${option.key}.title`)
                const description = t(`experiencePrompt.options.${option.key}.description`)

                return (
                  <motion.button
                    key={option.key}
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group flex h-full flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-lg'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
                    }`}
                    onClick={() => {
                      setPreference(option.language, option.key)
                      setDismissed(true)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold ${
                          isActive
                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                            : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t(`experiencePrompt.options.${option.key}.short`)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t(`experiencePrompt.options.${option.key}.hint`)}
                        </p>
                      </div>
                    </div>
                    <p className="flex-1 text-sm text-slate-600">
                      {description}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                      <Sparkles className="h-4 w-4" />
                      <span>{t(`experiencePrompt.options.${option.key}.cta`)}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-blue-100 p-2 text-blue-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {t('experiencePrompt.promo.title')}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {promoPoints.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {t('experiencePrompt.footer')}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InitialExperiencePrompt
