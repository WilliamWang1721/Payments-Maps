import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not configured properly. Some features may not work.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'pos-maps-app'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
export type {
  AttemptAcquiringMode,
  AttemptCheckoutLocation,
  AttemptCvm,
  AttemptDeviceStatus,
  AttemptPaymentMethod,
  AttemptResult,
  ExternalLink,
  FieldConfig,
  POSAttempt,
  POSMachine,
  Review,
  User,
} from '@/types/database'
