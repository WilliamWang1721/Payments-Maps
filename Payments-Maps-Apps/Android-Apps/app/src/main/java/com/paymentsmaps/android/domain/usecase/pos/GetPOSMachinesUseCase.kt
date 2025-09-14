package com.paymentsmaps.android.domain.usecase.pos

import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.repository.POSRepository
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * 获取POS机列表用例
 * 遵循Clean Architecture原则，封装业务逻辑
 */
class GetPOSMachinesUseCase @Inject constructor(
    private val posRepository: POSRepository
) {
    
    /**
     * 获取所有POS机
     */
    suspend operator fun invoke(): Flow<Result<List<POSMachine>>> {
        return posRepository.getAllPOSMachines()
    }
    
    /**
     * 根据商户ID获取POS机
     */
    suspend fun getByMerchantId(merchantId: String): Flow<Result<List<POSMachine>>> {
        return posRepository.getPOSMachinesByMerchantId(merchantId)
    }
    
    /**
     * 根据状态获取POS机
     */
    suspend fun getByStatus(status: com.paymentsmaps.android.domain.model.POSStatus): Flow<Result<List<POSMachine>>> {
        return posRepository.getPOSMachinesByStatus(status)
    }
    
    /**
     * 根据地理位置范围获取POS机
     */
    suspend fun getByLocationRange(
        centerLat: Double,
        centerLng: Double,
        radiusKm: Double
    ): Flow<Result<List<POSMachine>>> {
        return posRepository.getPOSMachinesInRange(centerLat, centerLng, radiusKm)
    }
    
    /**
     * 搜索POS机
     */
    suspend fun search(query: String): Flow<Result<List<POSMachine>>> {
        return posRepository.searchPOSMachines(query)
    }
}