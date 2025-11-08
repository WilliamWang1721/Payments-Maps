// Exchange rate service for currency conversion
// Uses free tier of exchangerate-api.com or fallback rates

interface ExchangeRates {
  base: string
  rates: {
    USD: number
    EUR: number
    GBP: number
    JPY: number
    KRW: number
    SGD: number
    HKD: number
    AUD: number
    CAD: number
    CHF: number
  }
  lastUpdated: Date
}

// Fallback exchange rates (approximate as of 2024)
const FALLBACK_RATES = {
  base: 'CNY',
  rates: {
    USD: 0.14,   // 1 CNY = 0.14 USD
    EUR: 0.13,   // 1 CNY = 0.13 EUR
    GBP: 0.11,   // 1 CNY = 0.11 GBP
    JPY: 20.50,  // 1 CNY = 20.50 JPY
    KRW: 185.00, // 1 CNY = 185 KRW
    SGD: 0.19,   // 1 CNY = 0.19 SGD
    HKD: 1.10,   // 1 CNY = 1.10 HKD
    AUD: 0.21,   // 1 CNY = 0.21 AUD
    CAD: 0.19,   // 1 CNY = 0.19 CAD
    CHF: 0.12    // 1 CNY = 0.12 CHF
  },
  lastUpdated: new Date()
}

class ExchangeRateService {
  private rates: ExchangeRates = FALLBACK_RATES
  private lastFetch: Date | null = null
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes cache
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey
    this.loadFromLocalStorage()
  }

  // Load rates from localStorage
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('exchange_rates')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.lastUpdated) {
          parsed.lastUpdated = new Date(parsed.lastUpdated)
          const age = Date.now() - parsed.lastUpdated.getTime()
          if (age < this.cacheTimeout) {
            this.rates = parsed
            this.lastFetch = parsed.lastUpdated
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load exchange rates from localStorage:', error)
    }
  }

  // Save rates to localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('exchange_rates', JSON.stringify(this.rates))
    } catch (error) {
      console.warn('Failed to save exchange rates to localStorage:', error)
    }
  }

  // Check if cache is still valid
  private isCacheValid(): boolean {
    if (!this.lastFetch) return false
    const age = Date.now() - this.lastFetch.getTime()
    return age < this.cacheTimeout
  }

  // Fetch latest exchange rates
  async fetchRates(): Promise<ExchangeRates> {
    // Return cached rates if still valid
    if (this.isCacheValid()) {
      return this.rates
    }

    try {
      // Try to fetch from free API (no key required for basic access)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY', {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (response.ok) {
        const data = await response.json()

        this.rates = {
          base: 'CNY',
          rates: {
            USD: data.rates.USD || FALLBACK_RATES.rates.USD,
            EUR: data.rates.EUR || FALLBACK_RATES.rates.EUR,
            GBP: data.rates.GBP || FALLBACK_RATES.rates.GBP,
            JPY: data.rates.JPY || FALLBACK_RATES.rates.JPY,
            KRW: data.rates.KRW || FALLBACK_RATES.rates.KRW,
            SGD: data.rates.SGD || FALLBACK_RATES.rates.SGD,
            HKD: data.rates.HKD || FALLBACK_RATES.rates.HKD,
            AUD: data.rates.AUD || FALLBACK_RATES.rates.AUD,
            CAD: data.rates.CAD || FALLBACK_RATES.rates.CAD,
            CHF: data.rates.CHF || FALLBACK_RATES.rates.CHF
          },
          lastUpdated: new Date()
        }

        this.lastFetch = new Date()
        this.saveToLocalStorage()

        return this.rates
      }
    } catch (error) {
      console.warn('Failed to fetch exchange rates, using fallback rates:', error)
    }

    // Return fallback rates if API fails
    this.rates = { ...FALLBACK_RATES, lastUpdated: new Date() }
    this.lastFetch = new Date()
    this.saveToLocalStorage()

    return this.rates
  }

  // Convert amount from CNY to target currency
  convert(amountCNY: number, toCurrency: keyof ExchangeRates['rates']): number {
    const rate = this.rates.rates[toCurrency]
    if (!rate) {
      throw new Error(`Currency ${toCurrency} not supported`)
    }
    return amountCNY * rate
  }

  // Convert amount from foreign currency to CNY
  convertToCNY(amount: number, fromCurrency: keyof ExchangeRates['rates']): number {
    const rate = this.rates.rates[fromCurrency]
    if (!rate) {
      throw new Error(`Currency ${fromCurrency} not supported`)
    }
    return amount / rate
  }

  // Get current rates
  getCurrentRates(): ExchangeRates {
    return this.rates
  }

  // Get rate for specific currency
  getRate(currency: keyof ExchangeRates['rates']): number {
    return this.rates.rates[currency]
  }

  // Format currency amount with proper symbol and locale
  formatCurrency(amount: number, currency: keyof ExchangeRates['rates'] | 'CNY'): string {
    const formats: Record<string, { locale: string; currency: string; symbol?: string }> = {
      CNY: { locale: 'zh-CN', currency: 'CNY', symbol: '¥' },
      USD: { locale: 'en-US', currency: 'USD', symbol: '$' },
      EUR: { locale: 'de-DE', currency: 'EUR', symbol: '€' },
      GBP: { locale: 'en-GB', currency: 'GBP', symbol: '£' },
      JPY: { locale: 'ja-JP', currency: 'JPY', symbol: '¥' },
      KRW: { locale: 'ko-KR', currency: 'KRW', symbol: '₩' },
      SGD: { locale: 'en-SG', currency: 'SGD', symbol: 'S$' },
      HKD: { locale: 'zh-HK', currency: 'HKD', symbol: 'HK$' },
      AUD: { locale: 'en-AU', currency: 'AUD', symbol: 'A$' },
      CAD: { locale: 'en-CA', currency: 'CAD', symbol: 'C$' },
      CHF: { locale: 'de-CH', currency: 'CHF', symbol: 'CHF' }
    }

    const format = formats[currency] || formats.USD

    try {
      return new Intl.NumberFormat(format.locale, {
        style: 'currency',
        currency: format.currency,
        minimumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2
      }).format(amount)
    } catch {
      // Fallback formatting
      const symbol = format.symbol || '$'
      const formatted = amount.toFixed(currency === 'JPY' || currency === 'KRW' ? 0 : 2)
      return `${symbol}${formatted}`
    }
  }

  // Calculate fees for international transactions
  calculateInternationalFees(amountCNY: number, options: {
    dccEnabled?: boolean
    internationalCardFee?: number // percentage
    currencyConversionFee?: number // percentage
  } = {}): {
    baseCNY: number
    dccFee: number
    cardFee: number
    conversionFee: number
    totalCNY: number
  } {
    const {
      dccEnabled = false,
      internationalCardFee = 3.0, // Default 3% international card fee
      currencyConversionFee = 2.5 // Default 2.5% currency conversion fee
    } = options

    const dccFee = dccEnabled ? amountCNY * 0.03 : 0 // DCC typically adds ~3%
    const cardFee = amountCNY * (internationalCardFee / 100)
    const conversionFee = amountCNY * (currencyConversionFee / 100)

    return {
      baseCNY: amountCNY,
      dccFee,
      cardFee,
      conversionFee,
      totalCNY: amountCNY + dccFee + cardFee + conversionFee
    }
  }
}

// Create singleton instance
export const exchangeRateService = new ExchangeRateService()

// Export types and utilities
export type { ExchangeRates }
export { FALLBACK_RATES }