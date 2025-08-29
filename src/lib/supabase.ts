import { createClient } from '@supabase/supabase-js'
import type { FeesConfiguration } from '@/types/fees'

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

// Database Types
export interface User {
  id: string
  email?: string
  created_at: string
  updated_at: string
  user_metadata?: {
    display_name?: string
    avatar_url?: string
    bio?: string
    [key: string]: string | number | boolean | null | undefined
  }
}

export interface POSMachine {
  id: string
  address: string
  latitude: number
  longitude: number
  merchant_name: string
  // 品牌信息
  brand_id?: string
  // 商家信息
  merchant_info?: {
    transaction_name?: string
    transaction_type?: string
  }
  basic_info: {
    model?: string
    acquiring_institution?: string
    checkout_location?: '自助收银' | '人工收银'
    supports_foreign_cards?: boolean
    supports_apple_pay?: boolean
    supports_google_pay?: boolean
    supports_contactless?: boolean
    supports_hce_simulation?: boolean
    supports_dcc?: boolean
    supports_edc?: boolean
    acquiring_modes?: string[]
    min_amount_no_pin?: number
    supported_card_networks?: string[]
  }
  // 验证模式
  verification_modes?: {
    small_amount_no_pin?: string[]
    small_amount_no_pin_unsupported?: boolean
    small_amount_no_pin_uncertain?: boolean
    requires_password?: string[]
    requires_password_unsupported?: boolean
    requires_password_uncertain?: boolean
    requires_signature?: string[]
    requires_signature_unsupported?: boolean
    requires_signature_uncertain?: boolean
  }
  // 尝试记录
  attempts?: {
    id?: string
    user: string
    result: 'success' | 'failure'
    timestamp: string
    card_name?: string
    payment_method?: string
  }[]
  remarks?: string
  custom_links?: {
    platform: string
    url: string
    title: string
  }[]
  fees?: FeesConfiguration
  extended_fields: Record<string, string | number | boolean | null>
  status: 'active' | 'inactive' | 'maintenance' | 'disabled'
  created_by?: string | null
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
  // 评价相关字段
  review_count?: number
}

export interface Review {
  id: string
  pos_machine_id: string
  user_id: string
  rating: number
  comment?: string
  verification_status: 'verified' | 'unverified' | 'disputed'
  created_at: string
  updated_at: string
}

export interface ExternalLink {
  id: string
  pos_machine_id: string
  platform: 'linuxdo' | 'xiaohongshu' | 'other'
  url: string
  title: string
  description?: string
  created_by: string
  created_at: string
}

export interface FieldConfig {
  id: string
  field_key: string
  field_name: string
  field_type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect'
  category: 'basic' | 'payment' | 'features' | 'technical'
  options?: string[]
  required: boolean
  validation_rules?: Record<string, string | number | boolean>
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}