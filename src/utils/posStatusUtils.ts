import { supabase } from '@/lib/supabase'

// POS机状态类型
export type POSStatus = 'active' | 'inactive' | 'maintenance' | 'disabled'

// 成功率计算结果接口
export interface SuccessRateResult {
  posId: string
  totalAttempts: number
  successfulAttempts: number
  successRate: number
  shouldUpdateStatus: boolean
  recommendedStatus: POSStatus
}

/**
 * 计算单个POS机的成功率
 * @param posId POS机ID
 * @returns 成功率计算结果
 */
export async function calculatePOSSuccessRate(posId: string): Promise<SuccessRateResult> {
  try {
    // 获取该POS机的所有尝试记录
    const { data: attempts, error } = await supabase
      .from('pos_attempts')
      .select('result')
      .eq('pos_id', posId)
    
    if (error) {
      console.error('获取尝试记录失败:', error)
      throw error
    }
    
    const totalAttempts = attempts?.length || 0
    const successfulAttempts = attempts?.filter(attempt => attempt.result === 'success').length || 0
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0
    
    // 判断是否需要更新状态
    const shouldUpdateStatus = totalAttempts >= 5 && successRate < 50 // 至少5次尝试且成功率低于50%
    const recommendedStatus: POSStatus = shouldUpdateStatus ? 'inactive' : 'active'
    
    return {
      posId,
      totalAttempts,
      successfulAttempts,
      successRate,
      shouldUpdateStatus,
      recommendedStatus
    }
  } catch (error) {
    console.error('计算成功率失败:', error)
    throw error
  }
}

/**
 * 批量计算多个POS机的成功率
 * @param posIds POS机ID数组
 * @returns 成功率计算结果数组
 */
export async function calculateMultiplePOSSuccessRates(posIds: string[]): Promise<SuccessRateResult[]> {
  const results: SuccessRateResult[] = []
  
  for (const posId of posIds) {
    try {
      const result = await calculatePOSSuccessRate(posId)
      results.push(result)
    } catch (error) {
      console.error(`计算POS机 ${posId} 成功率失败:`, error)
      // 继续处理其他POS机，不中断整个流程
    }
  }
  
  return results
}

/**
 * 自动更新POS机状态
 * @param posId POS机ID
 * @param newStatus 新状态
 * @returns 是否更新成功
 */
export async function updatePOSStatus(posId: string, newStatus: POSStatus): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pos_machines')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', posId)
    
    if (error) {
      console.error('更新POS机状态失败:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('更新POS机状态失败:', error)
    return false
  }
}

/**
 * 检查并自动更新POS机状态（基于成功率）
 * @param posId POS机ID
 * @returns 是否进行了状态更新
 */
export async function checkAndUpdatePOSStatus(posId: string): Promise<boolean> {
  try {
    const successRateResult = await calculatePOSSuccessRate(posId)
    
    if (successRateResult.shouldUpdateStatus) {
      // 获取当前POS机状态
      const { data: posData, error: posError } = await supabase
        .from('pos_machines')
        .select('status')
        .eq('id', posId)
        .single()
      
      if (posError) {
        console.error('获取POS机状态失败:', posError)
        return false
      }
      
      // 只有当前状态为active时才自动设置为inactive
      if (posData.status === 'active') {
        const updated = await updatePOSStatus(posId, 'inactive')
        if (updated) {
          console.log(`POS机 ${posId} 因成功率低于50%自动设置为不可用状态`)
          return true
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('检查并更新POS机状态失败:', error)
    return false
  }
}

/**
 * 批量检查并更新多个POS机状态
 * @param posIds POS机ID数组
 * @returns 更新的POS机ID数组
 */
export async function batchCheckAndUpdatePOSStatus(posIds: string[]): Promise<string[]> {
  const updatedPosIds: string[] = []
  
  for (const posId of posIds) {
    try {
      const wasUpdated = await checkAndUpdatePOSStatus(posId)
      if (wasUpdated) {
        updatedPosIds.push(posId)
      }
    } catch (error) {
      console.error(`检查POS机 ${posId} 状态失败:`, error)
      // 继续处理其他POS机
    }
  }
  
  return updatedPosIds
}

/**
 * 获取需要状态检查的POS机列表（有尝试记录的POS机）
 * @returns POS机ID数组
 */
export async function getPOSMachinesForStatusCheck(): Promise<string[]> {
  try {
    const { data: posIds, error } = await supabase
      .from('pos_attempts')
      .select('pos_id')
      .not('pos_id', 'is', null)
    
    if (error) {
      console.error('获取需要检查的POS机列表失败:', error)
      return []
    }
    
    // 去重并返回POS机ID数组
    const uniquePosIds = [...new Set(posIds?.map(item => item.pos_id) || [])]
    return uniquePosIds
  } catch (error) {
    console.error('获取需要检查的POS机列表失败:', error)
    return []
  }
}



// 刷新地图和列表数据的函数
export const refreshMapData = async () => {
  try {
    // 动态导入useMapStore以避免循环依赖
    const { useMapStore } = await import('@/stores/useMapStore')
    const store = useMapStore.getState()
    
    // 重新加载POS机数据
    await store.loadPOSMachines()
    
    console.log('地图数据已刷新')
  } catch (error) {
    console.error('刷新地图数据失败:', error)
  }
}