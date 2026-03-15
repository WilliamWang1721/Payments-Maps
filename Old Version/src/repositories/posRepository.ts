import { supabase } from '@/lib/supabase'
import type { POSMachine } from '@/types'

export type POSContributionRecord = Pick<POSMachine, 'id' | 'merchant_name' | 'address' | 'status' | 'created_at'>

export const posRepository = {
  listByCreator(userId: string) {
    return supabase
      .from('pos_machines')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
  },

  listByStatus(status: POSMachine['status']) {
    return supabase
      .from('pos_machines')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
  },

  countByCreator(userId: string) {
    return supabase
      .from('pos_machines')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
  },

  listRecentByCreator(userId: string, limit: number) {
    return supabase
      .from('pos_machines')
      .select('id, merchant_name, address, status, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  },

  findById(posId: string) {
    return supabase
      .from('pos_machines')
      .select('*')
      .eq('id', posId)
      .maybeSingle()
  },

  updateById(posId: string, updates: Record<string, unknown>) {
    return supabase
      .from('pos_machines')
      .update(updates)
      .eq('id', posId)
  },

  updateAddressById(posId: string, address: string) {
    return supabase
      .from('pos_machines')
      .update({ address })
      .eq('id', posId)
  },

  deleteById(posId: string) {
    return supabase
      .from('pos_machines')
      .delete()
      .eq('id', posId)
  },

  deleteByIds(posIds: string[]) {
    return supabase
      .from('pos_machines')
      .delete()
      .in('id', posIds)
  },
}
