import type { PostgrestError } from '@supabase/supabase-js'
import { normalizeSupabaseRelation } from '@/lib/supabaseRelations'
import { supabase } from '@/lib/supabase'
import {
  posAttemptRepository,
  type POSAttemptBatchInsertPayload,
  type POSAttemptInsertPayload,
  type POSAttemptOutcomeRow,
} from '@/repositories/posAttemptRepository'
import { posRepository, type POSContributionRecord } from '@/repositories/posRepository'
import type { POSAttempt, POSMachine } from '@/types'

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

    const { data, error } = await posRepository.listByCreator(normalizedUserId)

    throwIfSupabaseError(error)
    return (data || []) as POSMachine[]
  },

  async listPOSAttempts(posId: string): Promise<POSAttempt[]> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return []

    const { data, error } = await posAttemptRepository.listByPOSId(normalizedPosId)
    throwIfSupabaseError(error)
    return ((data || []) as POSAttempt[])
  },

  async probePOSAttemptsColumns(columns: string): Promise<{ ok: boolean; error: PostgrestError | null }> {
    const { error } = await posAttemptRepository.probeColumns(columns)
    return { ok: !error, error: error || null }
  },

  async listPOSAttemptsForRefresh(posId: string): Promise<POSAttempt[]> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return []

    const { data, error } = await posAttemptRepository.listByPOSIdForRefresh(normalizedPosId)
    throwIfSupabaseError(error)
    return ((data || []) as POSAttempt[])
  },

  async listPOSAttemptOutcomes(posIds: string[]): Promise<POSAttemptOutcomeRow[]> {
    const normalizedPosIds = Array.from(new Set(posIds.map(normalizeId).filter(Boolean)))
    if (normalizedPosIds.length === 0) return []

    const { data, error } = await posAttemptRepository.listOutcomesByPOSIds(normalizedPosIds)
    throwIfSupabaseError(error)
    return ((data || []) as POSAttemptOutcomeRow[])
  },

  async getNextPOSAttemptNumber(posId: string): Promise<number> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return 1

    const { data, error } = await posAttemptRepository.getLatestAttemptNumber(normalizedPosId)
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    const latestAttemptNumber = data?.attempt_number || 0
    return latestAttemptNumber + 1
  },

  async createPOSAttempt(payload: POSAttemptInsertPayload): Promise<POSAttempt> {
    const normalizedPosId = normalizeId(payload.pos_id)
    const normalizedUserId = normalizeId(payload.user_id)
    if (!normalizedPosId || !normalizedUserId) {
      throw new Error('POS ID 或用户 ID 无效')
    }

    const insertPayload: POSAttemptInsertPayload = {
      ...payload,
      pos_id: normalizedPosId,
      user_id: normalizedUserId,
      card_name: payload.card_name?.trim() || null,
      payment_method: payload.payment_method?.trim() || null,
      notes: payload.notes?.trim() || null,
      attempt_number: payload.attempt_number > 0 ? payload.attempt_number : 1,
    }

    const { data, error } = await posAttemptRepository.insertOne(insertPayload)
    throwIfSupabaseError(error)
    return data as POSAttempt
  },

  async createPOSAttempts(payloads: POSAttemptBatchInsertPayload[]): Promise<POSAttempt[]> {
    const normalizedPayloads = payloads
      .map((payload) => {
        const posId = normalizeId(String(payload.pos_id || ''))
        const userId = normalizeId(String(payload.user_id || ''))
        if (!posId || !userId) return null
        return {
          ...payload,
          pos_id: posId,
          user_id: userId,
        }
      })
      .filter(Boolean) as POSAttemptBatchInsertPayload[]

    if (normalizedPayloads.length === 0) return []

    const { data, error } = await posAttemptRepository.insertMany(normalizedPayloads)
    throwIfSupabaseError(error)
    return ((data || []) as POSAttempt[])
  },

  async removePOSAttemptByIdForUser(attemptId: string, userId: string): Promise<void> {
    const normalizedAttemptId = normalizeId(attemptId)
    const normalizedUserId = normalizeId(userId)
    if (!normalizedAttemptId || !normalizedUserId) return

    const { error } = await posAttemptRepository.deleteByIdAndUser(normalizedAttemptId, normalizedUserId)
    throwIfSupabaseError(error)
  },

  async listPOSMachinesByStatus(status: POSMachine['status'] = 'active'): Promise<POSMachine[]> {
    const { data, error } = await posRepository.listByStatus(status)

    throwIfSupabaseError(error)
    return (data || []) as POSMachine[]
  },

  async countUserPOSMachines(userId: string): Promise<number> {
    const normalizedUserId = normalizeId(userId)
    if (!normalizedUserId) return 0
    const { count, error } = await posRepository.countByCreator(normalizedUserId)

    throwIfSupabaseError(error)
    return count || 0
  },

  async listRecentUserContributions(userId: string, limit: number = 3): Promise<POSContributionSummary[]> {
    const normalizedUserId = normalizeId(userId)
    if (!normalizedUserId) return []
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 100)) : 3
    const { data, error } = await posRepository.listRecentByCreator(normalizedUserId, safeLimit)

    throwIfSupabaseError(error)
    return (data || []) as POSContributionRecord[]
  },

  async getPOSMachineById(posId: string): Promise<POSMachine | null> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return null
    const { data, error } = await posRepository.findById(normalizedPosId)

    throwIfSupabaseError(error)
    return (data as POSMachine | null) || null
  },

  async updatePOSMachineById(posId: string, updates: Record<string, unknown>): Promise<void> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return
    const { error } = await posRepository.updateById(normalizedPosId, updates)

    throwIfSupabaseError(error)
  },

  async updatePOSMachineAddress(posId: string, address: string): Promise<void> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return
    const normalizedAddress = address?.trim()
    if (!normalizedAddress) return
    const { error } = await posRepository.updateAddressById(normalizedPosId, normalizedAddress)

    throwIfSupabaseError(error)
  },

  async removePOSMachinesByIds(posIds: string[]): Promise<void> {
    const normalizedPosIds = Array.from(new Set(posIds.map(normalizeId).filter(Boolean)))
    if (normalizedPosIds.length === 0) return
    const { error } = await posRepository.deleteByIds(normalizedPosIds)

    throwIfSupabaseError(error)
  },

  async removePOSMachineById(posId: string): Promise<void> {
    const normalizedPosId = normalizeId(posId)
    if (!normalizedPosId) return

    const { error } = await posRepository.deleteById(normalizedPosId)

    throwIfSupabaseError(error)
  },
}
