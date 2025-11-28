import { FormEvent, useMemo } from 'react'
import { Eye, EyeOff, Languages, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { triggerTranslation } from '@/lib/translationTrigger'

type ModernHeaderProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onFilterClick: () => void
  onLocate: () => void
  locating: boolean
  showLabels: boolean
  onToggleLabels: () => void
  hideControls?: boolean
}

const ModernHeader = ({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onFilterClick,
  onLocate,
  locating,
  showLabels,
  onToggleLabels,
  hideControls = false,
}: ModernHeaderProps) => {
  const { t, i18n } = useTranslation()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchSubmit()
  }

  const greetingKey = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    if (hour < 22) return 'evening'
    return 'night'
  }, [])

  const greetingText = t(`dashboardHeader.greeting.${greetingKey}`)
  const subtitle = t('dashboardHeader.subtitle')
  const shouldShowTranslateButton = useMemo(() => {
    if (!i18n.language) return false
    return !i18n.language.toLowerCase().startsWith('zh')
  }, [i18n.language])
  const showTranslateButton = shouldShowTranslateButton && !hideControls

  const handleTranslateClick = () => {
    triggerTranslation()
    toast.info(t('dashboardHeader.translationRefresh', '正在刷新翻译内容...'))
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-3xl font-bold text-soft-black dark:text-white tracking-tight">{greetingText}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">{subtitle}</p>
        </div>

        {!hideControls && (
          <div
            className="w-full md:w-auto animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="flex items-center gap-2 sm:gap-3 w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible no-scrollbar">
              <form onSubmit={handleSubmit} className="relative group flex-1 min-w-[160px] sm:min-w-[220px]">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-accent-yellow transition-colors pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search merchants or locations..."
                  className="bg-white dark:bg-slate-900 pl-10 pr-4 py-3 rounded-2xl text-sm w-full shadow-soft border border-transparent dark:border-slate-800 focus:border-accent-yellow/50 focus:outline-none focus:ring-4 focus:ring-accent-yellow/10 transition-all placeholder:text-gray-400 text-soft-black dark:text-gray-100"
                />
              </form>

              <button
                type="button"
                onClick={onLocate}
                disabled={locating}
                className="bg-soft-black text-white dark:bg-white dark:text-gray-900 px-3 sm:px-4 h-11 sm:h-12 rounded-2xl text-xs sm:text-sm font-medium hover:bg-accent-yellow dark:hover:bg-gray-100 transition-all hover:scale-105 shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0 min-w-[48px]"
                aria-label={t('dashboardHeader.locate', 'Locate me')}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">{locating ? 'Locating…' : 'Location'}</span>
                <span className="sr-only sm:hidden">{locating ? 'Locating…' : 'Location'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleLabels}
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-300 shadow-soft border border-transparent dark:border-slate-800 hover:border-gray-100 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center flex-shrink-0"
                aria-label="Toggle marker labels"
              >
                {showLabels ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={onFilterClick}
                className="bg-white dark:bg-slate-900 h-11 w-11 sm:h-12 sm:w-12 rounded-2xl shadow-soft text-gray-500 dark:text-gray-300 hover:text-accent-yellow hover:scale-105 transition-all active:scale-95 border border-transparent hover:border-gray-100 dark:border-slate-800 flex items-center justify-center flex-shrink-0"
                aria-label={t('common.filter')}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>

              {showTranslateButton && (
                <button
                  type="button"
                  onClick={handleTranslateClick}
                  className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-300 shadow-soft border border-transparent dark:border-slate-800 hover:border-gray-100 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center flex-shrink-0"
                  aria-label={t('common.translate', 'Translate content')}
                >
                  <Languages className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModernHeader
