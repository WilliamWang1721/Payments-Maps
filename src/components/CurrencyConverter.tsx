import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, Euro, PoundSterling, Banknote, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

interface CurrencyConverterProps {
  amount: number
  fromCurrency?: 'CNY'
  className?: string
}

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY';

interface CurrencyRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
}

interface ExchangeRatesData {
  rates: CurrencyRates;
  lastUpdated: Date;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  amount,
  fromCurrency = 'CNY',
  className = ''
}) => {
  const { t, i18n } = useTranslation()
  const [exchangeData, setExchangeData] = useState<ExchangeRatesData>({
    rates: {
      USD: 0.14,  // Default approximate rates
      EUR: 0.13,
      GBP: 0.11,
      JPY: 20.5,
    },
    lastUpdated: new Date()
  })
  const [loading, setLoading] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD')

  // Currency symbols and icons
  const currencies = {
    USD: { symbol: '$', icon: DollarSign, name: 'US Dollar' },
    EUR: { symbol: '€', icon: Euro, name: 'Euro' },
    GBP: { symbol: '£', icon: PoundSterling, name: 'British Pound' },
    JPY: { symbol: '¥', icon: Banknote, name: 'Japanese Yen' }
  }

  // Fetch exchange rates (in production, this would call a real API)
  const fetchExchangeRates = async () => {
    setLoading(true)
    try {
      // In production, replace with actual API call
      // const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY')
      // const data = await response.json()

      // Simulated rates for now
      setExchangeData({
        rates: {
          USD: 0.14 + (Math.random() - 0.5) * 0.005,
          EUR: 0.13 + (Math.random() - 0.5) * 0.005,
          GBP: 0.11 + (Math.random() - 0.5) * 0.005,
          JPY: 20.5 + (Math.random() - 0.5) * 0.5,
        },
        lastUpdated: new Date()
      })
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExchangeRates()
    // Refresh rates every 5 minutes
    const interval = setInterval(fetchExchangeRates, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const convertedAmount = amount * exchangeData.rates[selectedCurrency]
  const CurrencyIcon = currencies[selectedCurrency].icon

  // Determine if rate went up or down (mock for now)
  const rateChange = Math.random() > 0.5 ? 'up' : 'down'

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('pos.currency_conversion', { defaultValue: 'Currency Conversion' })}
        </h3>
        <button
          onClick={fetchExchangeRates}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 transition-colors"
          title={t('common.refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Amount in CNY */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <span>¥</span>
          <span>{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-sm font-normal text-gray-500">CNY</span>
        </div>
      </div>

      {/* Currency selector */}
      <div className="flex gap-2 mb-3">
        {Object.entries(currencies).map(([code, info]) => (
          <button
            key={code}
            onClick={() => setSelectedCurrency(code as CurrencyCode)}
            className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
              selectedCurrency === code
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <info.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{code}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Converted amount */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyIcon className="w-5 h-5 text-gray-600" />
            <span className="text-xl font-bold text-gray-900">
              {currencies[selectedCurrency].symbol}
              {convertedAmount.toLocaleString('en-US', {
                minimumFractionDigits: selectedCurrency === 'JPY' ? 0 : 2,
                maximumFractionDigits: selectedCurrency === 'JPY' ? 0 : 2
              })}
            </span>
            <span className="text-sm text-gray-500">
              {selectedCurrency}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {rateChange === 'up' ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Exchange rate info */}
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>
              1 CNY = {exchangeData.rates[selectedCurrency].toFixed(selectedCurrency === 'JPY' ? 2 : 4)} {selectedCurrency}
            </span>
            <span>
              {t('common.updated', { defaultValue: 'Updated' })}: {new Date(exchangeData.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
        <p className="text-xs text-amber-700">
          ⚠️ {t('pos.exchange_rate_disclaimer', {
            defaultValue: 'Exchange rates are approximate. Actual rates may vary. Additional fees may apply for international transactions.'
          })}
        </p>
      </div>
    </div>
  )
}

export default CurrencyConverter