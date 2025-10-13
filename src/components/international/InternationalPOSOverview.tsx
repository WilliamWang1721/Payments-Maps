import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Navigation,
  CreditCard,
  Shield,
  Smartphone,
  Globe2,
  Info,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { POSMachine } from '@/lib/supabase'
import AnimatedButton from '@/components/ui/AnimatedButton'
import AnimatedCard from '@/components/ui/AnimatedCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AnimatedTopNav } from '@/components/AnimatedNavigation'
import { useLocaleStore } from '@/stores/useLocaleStore'

export interface InternationalAttemptSummary {
  result: 'success' | 'failure' | 'unknown'
  card_name?: string
  payment_method?: string
  created_at?: string
}

interface InternationalPOSOverviewProps {
  pos: POSMachine
  isFavorite: boolean
  onToggleFavorite: () => void | Promise<void>
  onBack: () => void | Promise<void>
  successRate: number | null
  latestAttempt?: InternationalAttemptSummary
}

const InternationalPOSOverview: React.FC<InternationalPOSOverviewProps> = ({
  pos,
  isFavorite,
  onToggleFavorite,
  onBack,
  successRate,
  latestAttempt,
}) => {
  const { t } = useTranslation()
  const { setPreference } = useLocaleStore()

  const quickFacts = useMemo(() => [
    {
      icon: CreditCard,
      label: t('internationalPos.quickFacts.cards'),
      value: pos.basic_info?.supports_foreign_cards
        ? t('common.yes')
        : t('common.no'),
      helper: t('internationalPos.explanations.cards'),
    },
    {
      icon: Smartphone,
      label: t('internationalPos.quickFacts.contactless'),
      value: pos.basic_info?.supports_contactless
        ? t('common.yes')
        : t('common.no'),
      helper: t('internationalPos.explanations.contactless'),
    },
    {
      icon: Shield,
      label: t('internationalPos.quickFacts.dcc'),
      value: pos.basic_info?.supports_dcc
        ? t('internationalPos.quickFacts.dccEnabled')
        : t('internationalPos.quickFacts.dccDisabled'),
      helper: t('internationalPos.explanations.dcc'),
    },
    {
      icon: Globe2,
      label: t('internationalPos.quickFacts.language'),
      value: t('internationalPos.quickFacts.languageValue'),
      helper: t('internationalPos.explanations.language'),
    },
  ], [pos.basic_info, t])

  const supportedCards = pos.basic_info?.supported_card_networks || []
  const mobilePayments = useMemo(() => [
    {
      label: 'Apple Pay',
      supported: pos.basic_info?.supports_apple_pay,
    },
    {
      label: 'Google Pay',
      supported: pos.basic_info?.supports_google_pay,
    },
    {
      label: t('internationalPos.quickFacts.hce'),
      supported: pos.basic_info?.supports_hce_simulation,
    },
  ], [pos.basic_info, t])

  const travelTips = useMemo(() => {
    const tips = t('internationalPos.tips.items', { returnObjects: true })
    return Array.isArray(tips) ? tips : []
  }, [t])

  const explanationPoints = useMemo(() => {
    const items = t('internationalPos.explanations.items', { returnObjects: true })
    return Array.isArray(items) ? items : []
  }, [t])

  const handleSwitchToChinese = () => {
    setPreference('zh', 'domestic')
    toast.success(t('internationalPos.actions.switchSuccess'))
  }

  const renderAttemptStatus = () => {
    if (!latestAttempt) return null
    const statusMap: Record<InternationalAttemptSummary['result'], string> = {
      success: t('internationalPos.attempts.status.success'),
      failure: t('internationalPos.attempts.status.failure'),
      unknown: t('internationalPos.attempts.status.unknown'),
    }

    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">
          {t('internationalPos.attempts.latest')} — {statusMap[latestAttempt.result]}
        </p>
        <div className="mt-2 space-y-1 text-xs text-slate-500">
          {latestAttempt.card_name && (
            <p>{t('internationalPos.attempts.card', { card: latestAttempt.card_name })}</p>
          )}
          {latestAttempt.payment_method && (
            <p>{t('internationalPos.attempts.method', { method: latestAttempt.payment_method })}</p>
          )}
          {latestAttempt.created_at && (
            <p>{t('internationalPos.attempts.time', { time: new Date(latestAttempt.created_at).toLocaleString() })}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AnimatedTopNav title={pos.merchant_name} className="sticky top-0 z-10">
        <AnimatedButton onClick={onBack} variant="ghost" size="sm" className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </AnimatedButton>
        <div className="flex items-center gap-2">
          <AnimatedButton
            onClick={handleSwitchToChinese}
            variant="ghost"
            size="sm"
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"
          >
            {t('internationalPos.actions.switch')}
          </AnimatedButton>
          <AnimatedButton
            onClick={onToggleFavorite}
            variant="ghost"
            size="sm"
            className={`p-2 ${isFavorite ? 'text-rose-500' : 'text-slate-500'}`}
            title={isFavorite ? t('internationalPos.actions.removeFavorite') : t('internationalPos.actions.addFavorite')}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </AnimatedButton>
        </div>
      </AnimatedTopNav>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <AnimatedCard className="bg-white shadow-sm" variant="elevated" hoverable>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium uppercase tracking-wide text-blue-500">
                {t('internationalPos.header.badge')}
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                {t('internationalPos.header.title', { merchant: pos.merchant_name })}
              </h1>
              <p className="text-sm text-slate-500">
                {t('internationalPos.header.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                <MapPin className="h-4 w-4" />
                {pos.address || t('internationalPos.header.unknownAddress')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                <Navigation className="h-4 w-4" />
                {t('internationalPos.header.coordinates', {
                  lat: pos.latitude?.toFixed(4) ?? '--',
                  lng: pos.longitude?.toFixed(4) ?? '--',
                })}
              </span>
              {typeof successRate === 'number' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  <Shield className="h-4 w-4" />
                  {t('internationalPos.header.successRate', { rate: Math.round(successRate * 100) })}
                </span>
              )}
            </div>
          </CardContent>
        </AnimatedCard>

        <div className="grid gap-4 md:grid-cols-2">
          {quickFacts.map((fact, index) => (
            <AnimatedCard key={fact.label} className="bg-white" hoverable>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                      <fact.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{fact.label}</p>
                      <p className="text-lg font-bold text-slate-800">{fact.value}</p>
                    </div>
                  </div>
                </div>
                <p className="flex items-start gap-2 text-xs text-slate-500">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <span>{fact.helper}</span>
                </p>
              </CardContent>
            </AnimatedCard>
          ))}
        </div>

        <AnimatedCard className="bg-white" hoverable>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              {t('internationalPos.cards.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supportedCards.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {supportedCards.map((network) => (
                  <span
                    key={network}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    {network}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t('internationalPos.cards.unknown')}</p>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {t('internationalPos.cards.tipTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {t('internationalPos.cards.tipDescription')}
              </p>
            </div>
          </CardContent>
        </AnimatedCard>

        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard className="bg-white" hoverable>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">
                {t('internationalPos.mobile.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mobilePayments.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.supported ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {item.supported ? t('common.yes') : t('common.no')}
                  </span>
                </div>
              ))}
            </CardContent>
          </AnimatedCard>

          <AnimatedCard className="bg-white" hoverable>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                {t('internationalPos.tips.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              {travelTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-purple-400" />
                  <span>{tip}</span>
                </div>
              ))}
            </CardContent>
          </AnimatedCard>
        </div>

        <AnimatedCard className="bg-white" hoverable>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {t('internationalPos.explanations.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {explanationPoints.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <Info className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </AnimatedCard>

        {renderAttemptStatus()}
      </div>
    </div>
  )
}

export default InternationalPOSOverview
