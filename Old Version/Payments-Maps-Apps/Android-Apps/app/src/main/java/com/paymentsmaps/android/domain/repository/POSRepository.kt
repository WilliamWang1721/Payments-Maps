package com.paymentsmaps.android.domain.repository

import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.Flow

/**
 * POS机仓库接口
 * 遵循Clean Architecture原则，定义数据访问抽象
 */
interface POSRepository {
    
    /**
     * 获取所有POS机
     */
    suspend fun getAllPOSMachines(): Flow<Result<List<POSMachine>>>
    
    /**
     * 根据ID获取POS机
     */
    suspend fun getPOSMachineById(id: String): Flow<Result<POSMachine?>>
    
    /**
     * 根据商户ID获取POS机列表
     */
    suspend fun getPOSMachinesByMerchantId(merchantId: String): Flow<Result<List<POSMachine>>>
    
    /**
     * 根据状态获取POS机列表
     */
    suspend fun getPOSMachinesByStatus(status: POSStatus): Flow<Result<List<POSMachine>>>
    
    /**
     * 根据地理位置范围获取POS机
     */
    suspend fun getPOSMachinesInRange(
        centerLat: Double,
        centerLng: Double,
        radiusKm: Double
    ): Flow<Result<List<POSMachine>>>
    
    /**
     * 搜索POS机
     */
    suspend fun searchPOSMachines(query: String): Flow<Result<List<POSMachine>>>
    
    /**
     * 创建POS机
     */
    suspend fun createPOSMachine(posMachine: POSMachine): Result<POSMachine>
    
    /**
     * 更新POS机
     */
    suspend fun updatePOSMachine(posMachine: POSMachine): Result<POSMachine>
    
    /**
     * 删除POS机
     */
    suspend fun deletePOSMachine(id: String): Result<Unit>
    
    /**
     * 激活POS机
     */
    suspend fun activatePOSMachine(id: String): Result<POSMachine>
    
    /**
     * 停用POS机
     */
    suspend fun deactivatePOSMachine(id: String): Result<POSMachine>
    
    /**
     * 更新POS机状态
     */
    suspend fun updatePOSMachineStatus(id: String, status: POSStatus): Result<POSMachine>
    
    /**
     * 更新POS机位置
     */
    suspend fun updatePOSMachineLocation(
        id: String,
        latitude: Double,
        longitude: Double,
        address: String
    ): Result<POSMachine>
    
    /**
     * 获取需要维护的POS机
     */
    suspend fun getPOSMachinesNeedingMaintenance(): Flow<Result<List<POSMachine>>>
    
    /**
     * 获取POS机统计信息
     */
    suspend fun getPOSMachineStats(): Flow<Result<POSMachineStats>>
}

/**
 * POS机统计信息
 */
data class POSMachineStats(
    val totalCount: Int,
    val activeCount: Int,
    val inactiveCount: Int,
    val maintenanceCount: Int,
    val errorCount: Int,
    val pendingCount: Int,
    val averageTransactionVolume: Double,
    val topPerformingMachines: List<POSMachine>,
    val recentlyAddedCount: Int,
    val maintenanceDueCount: Int
)