package com.paymentsmaps.android.domain.usecase

import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.repository.POSRepository
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * POS机管理用例
 * 处理POS机的创建、更新、删除等管理业务逻辑
 */
@Singleton
class ManagePOSMachinesUseCase @Inject constructor(
    private val posRepository: POSRepository
) {
    
    /**
     * 创建POS机
     * @param posMachine POS机信息
     * @return 创建结果
     */
    fun createPOSMachine(posMachine: POSMachine): Flow<Result<POSMachine>> = flow {
        emit(Result.Loading)
        try {
            val result = posRepository.createPOSMachine(posMachine)
            emit(result)
        } catch (e: Exception) {
            emit(Result.Error(e))
        }
    }
    
    /**
     * 更新POS机信息
     * @param posMachine POS机信息
     * @return 更新结果
     */
    fun updatePOSMachine(posMachine: POSMachine): Flow<Result<POSMachine>> = flow {
        emit(Result.Loading)
        try {
            val result = posRepository.updatePOSMachine(posMachine)
            emit(result)
        } catch (e: Exception) {
            emit(Result.Error(e))
        }
    }
    
    /**
     * 更新POS机状态
     * @param id POS机ID
     * @param status 新状态
     * @return 更新结果
     */
    fun updatePOSMachineStatus(id: String, status: POSStatus): Flow<Result<POSMachine>> = flow {
        emit(Result.Loading)
        try {
            val result = posRepository.updatePOSMachineStatus(id, status)
            emit(result)
        } catch (e: Exception) {
            emit(Result.Error(e))
        }
    }
    
    /**
     * 删除POS机
     * @param id POS机ID
     * @return 删除结果
     */
    fun deletePOSMachine(id: String): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            val result = posRepository.deletePOSMachine(id)
            emit(result)
        } catch (e: Exception) {
            emit(Result.Error(e))
        }
    }
    
    /**
     * 激活POS机
     * @param id POS机ID
     * @return 激活结果
     */
    fun activatePOSMachine(id: String): Flow<Result<POSMachine>> {
        return updatePOSMachineStatus(id, POSStatus.ACTIVE)
    }
    
    /**
     * 停用POS机
     * @param id POS机ID
     * @return 停用结果
     */
    fun deactivatePOSMachine(id: String): Flow<Result<POSMachine>> {
        return updatePOSMachineStatus(id, POSStatus.INACTIVE)
    }
    
    /**
     * 设置POS机为维护状态
     * @param id POS机ID
     * @return 设置结果
     */
    fun setMaintenanceMode(id: String): Flow<Result<POSMachine>> {
        return updatePOSMachineStatus(id, POSStatus.MAINTENANCE)
    }
    
    /**
     * 设置POS机为离线状态
     * @param id POS机ID
     * @return 设置结果
     */
    fun setOfflineMode(id: String): Flow<Result<POSMachine>> {
        return updatePOSMachineStatus(id, POSStatus.OFFLINE)
    }
    
    /**
     * 验证POS机信息
     * @param posMachine POS机信息
     * @return 验证结果
     */
    fun validatePOSMachine(posMachine: POSMachine): ValidationResult {
        val errors = mutableListOf<String>()
        
        // 验证序列号
        if (posMachine.serialNumber.isBlank()) {
            errors.add("序列号不能为空")
        }
        
        // 验证商户ID
        if (posMachine.merchantId.isBlank()) {
            errors.add("商户ID不能为空")
        }
        
        // 验证位置信息
        if (posMachine.location.latitude < -90 || posMachine.location.latitude > 90) {
            errors.add("纬度必须在-90到90之间")
        }
        
        if (posMachine.location.longitude < -180 || posMachine.location.longitude > 180) {
            errors.add("经度必须在-180到180之间")
        }
        
        // 验证地址信息
        if (posMachine.location.address.isBlank()) {
            errors.add("地址信息不能为空")
        }
        
        // 验证城市信息
        if (posMachine.location.city.isBlank()) {
            errors.add("城市信息不能为空")
        }
        
        return if (errors.isEmpty()) {
            ValidationResult.Success
        } else {
            ValidationResult.Error(errors)
        }
    }
    
    /**
     * 检查POS机是否可以删除
     * @param posMachine POS机信息
     * @return 是否可以删除
     */
    fun canDeletePOSMachine(posMachine: POSMachine): Boolean {
        // 只有非活跃状态的POS机才能删除
        return posMachine.status != POSStatus.ACTIVE
    }
    
    /**
     * 检查POS机是否需要维护
     * @param posMachine POS机信息
     * @return 是否需要维护
     */
    fun needsMaintenance(posMachine: POSMachine): Boolean {
        return posMachine.needsMaintenance
    }
    
    /**
     * 检查POS机是否超过每日限额
     * @param posMachine POS机信息
     * @return 是否超过限额
     */
    fun isOverDailyLimit(posMachine: POSMachine): Boolean {
        return posMachine.isOverDailyLimit
    }
    
    /**
     * 获取POS机状态描述
     * @param status POS机状态
     * @return 状态描述
     */
    fun getStatusDescription(status: POSStatus): String {
        return when (status) {
            POSStatus.ACTIVE -> "活跃"
            POSStatus.INACTIVE -> "非活跃"
            POSStatus.MAINTENANCE -> "维护中"
            POSStatus.OFFLINE -> "离线"
            POSStatus.ERROR -> "错误"
            POSStatus.PENDING -> "待处理"
        }
    }
    
    /**
     * 获取POS机类型描述
     * @param type POS机类型
     * @return 类型描述
     */
    fun getTypeDescription(type: POSType): String {
        return when (type) {
            POSType.FIXED -> "固定式"
            POSType.MOBILE -> "移动式"
            POSType.WIRELESS -> "无线式"
            POSType.VIRTUAL -> "虚拟式"
            POSType.COUNTERTOP -> "台式"
            POSType.PORTABLE -> "便携式"
        }
    }
}

/**
 * 验证结果封装类
 */
sealed class ValidationResult {
    object Success : ValidationResult()
    data class Error(val errors: List<String>) : ValidationResult()
}