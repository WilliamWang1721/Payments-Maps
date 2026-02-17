import type { PostgrestError } from '@supabase/supabase-js'
import { normalizeSupabaseRelation } from '@/lib/supabaseRelations'
import { supabase } from '@/lib/supabase'
import type { POSMachine } from '@/types'

type POSListItem = Pick<
  POSMachine,
  'id' | 'merchant_name' | 'address' | 'latitude' | 'longitude' | 'basic_info' | 'status' | 'created_at'
>

export type POSContributionSummary = Pick<POSMachine, 'id' | 'merchant_name' | 'address' | 'status' | 'created_at'>

export interface FavoriteWithPOS {
  id: string
  user_id: string
  pos_id: string
  created_at: string
  pos_machines: POSListItem | null
}

export interface HistoryWithPOS {
  id: string
  user_id: string
  pos_machine_id: string
  visited_at: string
  created_at: string
  pos_machines: POSListItem | null
}

interface FavoriteWithPOSRaw extends Omit<FavoriteWithPOS, 'pos_machines'> {
  pos_machines: POSListItem | POSListItem[] | null
}

interface HistoryWithPOSRaw extends Omit<HistoryWithPOS, 'pos_machines'> {
  pos_machines: POSListItem | POSListItem[] | null
}

const FAVORITE_POS_SELECT = `
  id,
  user_id,
  pos_id,
  created_at,
  pos_machines (
    id,
    merchant_name,
    address,
    latitude,
    longitude,
    basic_info,
    status,
    created_at
  )
`

const HISTORY_POS_SELECT = `
  id,
  user_id,
  pos_machine_id,
  visited_at,
  created_at,
  pos_machines (
    id,
    merchant_name,
    address,
    latitude,
    longitude,
    basic_info,
    status,
    created_at
  )
`

const throwIfSupabaseError = (error: PostgrestError | null) => {
  if (error) {
    throw error
  }
}

const normalizeFavorites = (rows: FavoriteWithPOSRaw[] | null | undefined): FavoriteWithPOS[] => {
  return normalizeSupabaseRelation(rows, 'pos_machines') as FavoriteWithPOS[]
}

const normalizeHistory = (rows: HistoryWithPOSRaw[] | null | undefined): HistoryWithPOS[] => {
  return normalizeSupabaseRelation(rows, 'pos_machines') as HistoryWithPOS[]
}

const normalizeId = (value: string | null | undefined) => value?.trim() || ''

export const posService = {
  async listUserFavorites(userId: string): Promise<FavoriteWithPOS[]> {
    const normalizedUserId = normalizeId(userId)
    if (!normalizedUserId) return []

    const { data, error } = await supabase
      .from('user_favorites')
      .select(FAVORITE_POS_SELECT)
      .eq('user_id', normalizedUserId)
      .order('created_at', { ascending: false })

    throwIfSupabaseError(error)
    return normalizeFavorites(data as FavoriteWithPOSRaw[] | null)
  },

  async removeFavoriteById(favoriteId: string): Promise<void> {
    const normalizedFavoriteId = normalizeId(favoriteId)
    if (!normalizedFavoriteId) return

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', normalizedFavoriteId)

    throwIfSupabaseError(error)
  },

  async getFavoriteStatus(userId: string, posMachineId: string): Promise<{ isFavorite: boolean; featureAvailable: boolean }> {
    const normalizedUserId = normalizeId(userId)
    const normalizedPosMachineId = normalizeId(posMachineId)

    if (!normalizedUserId || !normalizedPosMachineId) {
      return { isFavorite: false, featureAvailable: true }
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', normalizedUserId)
      .eq('pos_machine_id', normalizedPosMachineId)
      .single()

    if (error) {
      if (error.code === 'PGRST205' || error.code === '406') {
        return { isFavorite: false, featureAvailable: false }
      }
      if (error.code === 'PGRST116') {
        return { isFavorite: false, featureAvailable: true }
      }
      throw error
    }

    return { isFavorite: Boolean(data), featureAvailable: true }
  },

  async addFavorite(userId: string, posMachineId: string): Promise<{ featureAvailable: boolean }> {
    const normalizedUserId = normalizeId(userId)
    const normalizedPosMachineId = normalizeId(posMachineId)

    if (!normalizedUserId || !normalizedPosMachineId) {
      return { featureAvailable: true }
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: normalizedUserId,
        pos_machine_id: normalizedPosMachineId,
      })

    if (error) {
      if (error.code === 'PGRST205' || error.code === '406') {
        return { featureAvailable: false }
      }
      throw error
    }

    return { featureAvailable: true }
  },

  async removeFavorite(userId: string, posMachineId: string): Promise<{ featureAvailable: boolean }> {
    const normalizedUserId = normalizeId(userId)
    const normalizedPosMachineId = normalizeId(posMachineId)

    if (!normalizedUserId || !normalizedPosMachineId) {
      return { featureAvailable: true }
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', normalizedUserId)
      .eq('pos_machine_id', normalizedPosMachineId)

    if (error) {
      if (error.code === 'PGRST205' || error.code === '406') {
        return { featureAvailable: false }
      }
      throw error
    }

    return { featureAvailable: true }
  },

  async listUserHistory(userId: string, limit: number = 100): Promise<HistoryWithPOS[]> {
    const normalizedUserId = normalizeId(userId)
    if (!normalizedUserId) return []

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 500)) : 100

    const { data, error } = await supabase
      .from('user_history')
      .select(HISTORY_POS_SELECT)
      .eq('user_id', normalizedUserId)
      .order('visited_at', { ascending: false })
      .limit(safeLimit)

    throwIfSupabaseError(error)
    return normalizeHistory(data as HistoryWithPOSRaw[] | null)
  },

  async clearUserHistory(userId: string): Promise<void> {
    const normalizedUserId = normalizeId(userId)
    if (!normalizedUserId) return

    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('user_id', normalizedUserId)

    throwIfSupabaseError(error)
  },

  async removeHistoryById(historyId: string): Promise<void> {
    const normalizedHistoryId = normalizeId(historyId)
    if (!normalizedHistoryId) return

    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('id', normalizedHistoryId)

    throwIfSupabaseError(error)
  },

  async recordUserHistoryVisit(userId: string, posMachineId: string): Promise<void> {
    const normalizedUserId = normalizeId(userId)
    const normalizedPosMachineId = normalizeId(posMachineId)
    if (!normalizedUserId || !normalizedPosMachineId) return

    const { error } = await supabase.rpc('upsert_user_history', {
      p_user_id: normalizedUserId,
      p_pos_machine_id: normalizedPosMachineId,
    })

    throwIfSupabaseError(error)
  },

  async listUserPOSMachines(userId: string): Promise<POSMachine[]> {
    const normalizedUserId = normalizeId(userId)
    if (!normalizedUserId) return []

    const { data, error } = await supabase
      .from('pos_machines')
      .select('*')
      .eq('created_by', normalizedUserId)
      .order('created_at', { ascending: false })

    throwIfSupabaseError(error)
    return (data || []) as POSMachine[]
  },

  async listPOSMachinesByStatus(status: POSMachine['status'] = 'active'): Promise<POSMachine[]> {
    const { data, error } = await supabase
      .from('pos_machines')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    throwIfSupabaseError(error)
    return (data || []) as POSMachine[]
  },

  async countUserPOSMachines(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pos_machines')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)

    throwIfSupabaseError(error)
    return count || 0
  },

  async listRecentUserContributions(userId: string, limit: number = 3): Promise<POSContributionSummary[]> {
    const { data, error } = await supabase
      .from('pos_machines')
      .select('id, merchant_name, address, status, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    throwIfSupabaseError(error)
    return ((data || []) as POSContributionSummary[])
  },

  async getPOSMachineById(posId: string): Promise<POSMachine | null> {
    const { data, error } = await supabase
      .from('pos_machines')
      .select('*')
      .eq('id', posId)
      .maybeSingle()

    throwIfSupabaseError(error)
    return (data as POSMachine | null) || null
  },

  async updatePOSMachineById(posId: string, updates: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from('pos_machines')
      .update(updates)
      .eq('id', posId)

    throwIfSupabaseError(error)
  },

  async updatePOSMachineAddress(posId: string, address: string): Promise<void> {
    const { error } = await supabase
      .from('pos_machines')
      .update({ address })
      .eq('id', posId)

    throwIfSupabaseError(error)
  },

  async removePOSMachinesByIds(posIds: string[]): Promise<void> {
    if (posIds.length === 0) return
    const { error } = await supabase
      .from('pos_machines')
      .delete()
      .in('id', posIds)

    throwIfSupabaseError(error)
  },

  async removePOSMachineById(posId: string): Promise<void> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return

    const { error } = await supabase
      .from('pos_machines')
      .delete()
      .eq('id', normalizedPosId)

    throwIfSupabaseError(error)
  },
}
