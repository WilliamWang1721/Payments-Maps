package com.paymentsmaps.android.data.remote.dto

import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.repository.POSMachineStats
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * POS机数据传输对象
 * 用于网络传输和数据库存储
 */
@Serializable
data class POSMachineDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("serial_number")
    val serialNumber: String,
    
    @SerialName("merchant_id")
    val merchantId: String,
    
    @SerialName("location_latitude")
    val locationLatitude: Double,
    
    @SerialName("location_longitude")
    val locationLongitude: Double,
    
    @SerialName("location_address")
    val locationAddress: String? = null,
    
    @SerialName("location_city")
    val locationCity: String? = null,
    
    @SerialName("location_country")
    val locationCountry: String? = null,
    
    @SerialName("status")
    val status: String,
    
    @SerialName("type")
    val type: String,
    
    @SerialName("model")
    val model: String? = null,
    
    @SerialName("manufacturer")
    val manufacturer: String? = null,
    
    @SerialName("firmware_version")
    val firmwareVersion: String? = null,
    
    @SerialName("payment_methods")
    val paymentMethods: List<String> = emptyList(),
    
    @SerialName("daily_transaction_limit")
    val dailyTransactionLimit: Double? = null,
    
    @SerialName("daily_transaction_count")
    val dailyTransactionCount: Int = 0,
    
    @SerialName("daily_transaction_amount")
    val dailyTransactionAmount: Double = 0.0,
    
    @SerialName("last_transaction_at")
    val lastTransactionAt: String? = null,
    
    @SerialName("last_maintenance_at")
    val lastMaintenanceAt: String? = null,
    
    @SerialName("next_maintenance_due")
    val nextMaintenanceDue: String? = null,
    
    @SerialName("installation_date")
    val installationDate: String? = null,
    
    @SerialName("warranty_expiry")
    val warrantyExpiry: String? = null,
    
    @SerialName("is_active")
    val isActive: Boolean = true,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String,
    
    // 关联数据
    @SerialName("merchant")
    val merchant: MerchantDto? = null,
    
    @SerialName("device_info")
    val deviceInfo: DeviceInfoDto? = null,
    
    @SerialName("compliance_info")
    val complianceInfo: ComplianceInfoDto? = null
)

/**
 * 设备信息DTO
 */
@Serializable
data class DeviceInfoDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("pos_machine_id")
    val posMachineId: String,
    
    @SerialName("hardware_version")
    val hardwareVersion: String? = null,
    
    @SerialName("software_version")
    val softwareVersion: String? = null,
    
    @SerialName("os_version")
    val osVersion: String? = null,
    
    @SerialName("memory_total")
    val memoryTotal: Long? = null,
    
    @SerialName("memory_available")
    val memoryAvailable: Long? = null,
    
    @SerialName("storage_total")
    val storageTotal: Long? = null,
    
    @SerialName("storage_available")
    val storageAvailable: Long? = null,
    
    @SerialName("battery_level")
    val batteryLevel: Int? = null,
    
    @SerialName("signal_strength")
    val signalStrength: Int? = null,
    
    @SerialName("network_type")
    val networkType: String? = null,
    
    @SerialName("last_heartbeat")
    val lastHeartbeat: String? = null,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * 合规信息DTO
 */
@Serializable
data class ComplianceInfoDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("pos_machine_id")
    val posMachineId: String,
    
    @SerialName("certification_number")
    val certificationNumber: String? = null,
    
    @SerialName("certification_authority")
    val certificationAuthority: String? = null,
    
    @SerialName("certification_expiry")
    val certificationExpiry: String? = null,
    
    @SerialName("pci_compliance_level")
    val pciComplianceLevel: String? = null,
    
    @SerialName("last_security_audit")
    val lastSecurityAudit: String? = null,
    
    @SerialName("next_security_audit")
    val nextSecurityAudit: String? = null,
    
    @SerialName("encryption_standard")
    val encryptionStandard: String? = null,
    
    @SerialName("tamper_evident")
    val tamperEvident: Boolean = false,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * POS机统计信息DTO
 */
@Serializable
data class POSMachineStatsDto(
    @SerialName("total_machines")
    val totalMachines: Int,
    
    @SerialName("active_machines")
    val activeMachines: Int,
    
    @SerialName("inactive_machines")
    val inactiveMachines: Int,
    
    @SerialName("maintenance_required")
    val maintenanceRequired: Int,
    
    @SerialName("offline_machines")
    val offlineMachines: Int,
    
    @SerialName("total_transactions_today")
    val totalTransactionsToday: Int,
    
    @SerialName("total_amount_today")
    val totalAmountToday: Double,
    
    @SerialName("average_transaction_amount")
    val averageTransactionAmount: Double,
    
    @SerialName("peak_hour")
    val peakHour: Int? = null,
    
    @SerialName("busiest_location")
    val busiestLocation: String? = null
)

/**
 * DTO转换扩展函数
 */
fun POSMachineDto.toDomain(): POSMachine {
    return POSMachine(
        id = id,
        serialNumber = serialNumber,
        merchantId = merchantId,
        merchantName = merchant?.businessName ?: "未知商户",
        location = Location(
            latitude = locationLatitude,
            longitude = locationLongitude,
            address = locationAddress ?: "",
            city = locationCity ?: "",
            province = "",
            postalCode = "",
            country = locationCountry ?: "CN"
        ),
        status = POSStatus.valueOf(status.uppercase()),
        type = POSType.valueOf(type.uppercase()),
        model = model ?: "",
        manufacturer = manufacturer ?: "",
        installationDate = parseInstant(installationDate ?: createdAt),
        lastMaintenanceDate = lastMaintenanceAt?.let { parseInstant(it) },
        nextMaintenanceDate = nextMaintenanceDue?.let { parseInstant(it) },
        supportedPaymentMethods = paymentMethods.mapNotNull { 
            try { PaymentMethod.valueOf(it.uppercase()) } catch (e: Exception) { null }
        },
        dailyTransactionLimit = dailyTransactionLimit ?: 0.0,
        currentDailyVolume = dailyTransactionAmount,
        monthlyTransactionLimit = (dailyTransactionLimit ?: 0.0) * 30,
        currentMonthlyVolume = 0.0,
        feeRate = 0.006,
        isActive = isActive,
        notes = null,
        createdAt = parseInstant(createdAt),
        updatedAt = parseInstant(updatedAt)
    )
}

fun POSMachine.toDto(): POSMachineDto {
    return POSMachineDto(
        id = id,
        serialNumber = serialNumber,
        merchantId = merchantId,
        locationLatitude = location.latitude,
        locationLongitude = location.longitude,
        locationAddress = location.address,
        locationCity = location.city,
        locationCountry = location.country,
        status = status.name.lowercase(),
        type = type.name.lowercase(),
        model = model,
        manufacturer = manufacturer,
        paymentMethods = supportedPaymentMethods.map { it.name.lowercase() },
        dailyTransactionLimit = dailyTransactionLimit,
        dailyTransactionAmount = currentDailyVolume,
        lastMaintenanceAt = lastMaintenanceDate?.let { formatInstant(it) },
        nextMaintenanceDue = nextMaintenanceDate?.let { formatInstant(it) },
        installationDate = formatInstant(installationDate),
        isActive = isActive,
        createdAt = formatInstant(createdAt),
        updatedAt = formatInstant(updatedAt)
    )
}

fun POSMachineStatsDto.toDomain(): POSMachineStats {
    return POSMachineStats(
        totalCount = totalMachines,
        activeCount = activeMachines,
        inactiveCount = inactiveMachines,
        maintenanceCount = maintenanceRequired,
        errorCount = 0,
        pendingCount = 0,
        averageTransactionVolume = averageTransactionAmount,
        topPerformingMachines = emptyList(),
        recentlyAddedCount = 0,
        maintenanceDueCount = maintenanceRequired
    )
}

/**
 * 时间转换工具函数
 */
private fun parseInstant(dateString: String): LocalDateTime {
    return try {
        LocalDateTime.ofInstant(
            Instant.parse(dateString),
            ZoneId.systemDefault()
        )
    } catch (e: Exception) {
        LocalDateTime.now()
    }
}

private fun formatInstant(dateTime: LocalDateTime): String {
    return dateTime.atZone(ZoneId.systemDefault()).toInstant().toString()
}