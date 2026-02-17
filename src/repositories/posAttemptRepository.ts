import { supabase } from '@/lib/supabase'

export type POSAttemptOutcomeRow = {
  pos_id: string
  result: string
}

export type POSAttemptInsertPayload = {
  pos_id: string
  user_id: string
  result: 'success' | 'failure' | 'unknown'
  card_name?: string | null
  payment_method?: string | null
  notes?: string | null
  attempt_number: number
}

export type POSAttemptBatchInsertPayload = Record<string, unknown>

export const posAttemptRepository = {
  listByPOSId(posId: string) {
    return supabase
      .from('pos_attempts')
      .select('*')
      .eq('pos_id', posId)
      .order('created_at', { ascending: false })
  },

  probeColumns(columns: string) {
    return supabase
      .from('pos_attempts')
      .select(columns)
      .limit(1)
  },

  listByPOSIdForRefresh(posId: string) {
    return supabase
      .from('pos_attempts')
      .select('*')
      .eq('pos_id', posId)
      .order('attempted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
  },

  listOutcomesByPOSIds(posIds: string[]) {
    return supabase
      .from('pos_attempts')
      .select('pos_id, result')
      .in('pos_id', posIds)
  },

  getLatestAttemptNumber(posId: string) {
    return supabase
      .from('pos_attempts')
      .select('attempt_number')
      .eq('pos_id', posId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle()
  },

  insertOne(payload: POSAttemptInsertPayload) {
    return supabase
      .from('pos_attempts')
      .insert(payload)
      .select()
      .single()
  },

  insertMany(payloads: POSAttemptBatchInsertPayload[]) {
    return supabase
      .from('pos_attempts')
      .insert(payloads)
      .select()
  },

  deleteByIdAndUser(attemptId: string, userId: string) {
    return supabase
      .from('pos_attempts')
      .delete()
      .eq('id', attemptId)
      .eq('user_id', userId)
  },
}
