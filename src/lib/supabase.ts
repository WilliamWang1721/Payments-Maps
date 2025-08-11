import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    [key: string]: any
  }
}

export interface POSMachine {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  merchant_name: string
  basic_info: {
    model?: string
    acquiring_institution?: string
    supports_foreign_cards?: boolean
    supports_apple_pay?: boolean
    supports_google_pay?: boolean
    supports_contactless?: boolean
    min_amount_no_pin?: number
  }
  extended_fields: Record<string, any>
  status: 'active' | 'inactive' | 'pending_verification'
  created_by: string
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
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
  validation_rules?: Record<string, any>
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}