import type { FeesConfiguration } from './fees'

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

export type AttemptResult = 'success' | 'failure' | 'unknown'
export type AttemptPaymentMethod = 'tap' | 'insert' | 'swipe' | 'apple_pay' | 'google_pay' | 'hce'
export type AttemptCvm = 'no_pin' | 'pin' | 'signature' | 'unknown'
export type AttemptAcquiringMode = 'DCC' | 'EDC' | 'unknown'
export type AttemptDeviceStatus = 'active' | 'inactive' | 'maintenance' | 'disabled'
export type AttemptCheckoutLocation = '自助收银' | '人工收银'

export interface POSAttempt {
  id: string
  pos_id: string
  user_id?: string | null
  attempt_number?: number | null
  result: AttemptResult
  card_network?: string | null
  payment_method?: AttemptPaymentMethod | null
  cvm?: AttemptCvm | null
  acquiring_mode?: AttemptAcquiringMode | null
  device_status?: AttemptDeviceStatus | null
  acquiring_institution?: string | null
  checkout_location?: AttemptCheckoutLocation | null
  card_album_card_id?: string | null
  card_name?: string | null
  notes?: string | null
  attempted_at?: string | null
  is_conclusive_failure?: boolean | null
  created_at: string
}

export interface POSMachine {
  id: string
  address: string
  address_en?: string
  address_pinyin?: string
  latitude: number
  longitude: number
  merchant_name: string
  merchant_name_en?: string
  merchant_name_pinyin?: string
  brand_id?: string
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
  attempts?: POSAttempt[]
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
