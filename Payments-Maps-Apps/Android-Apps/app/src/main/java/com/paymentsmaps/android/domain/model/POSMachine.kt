package com.paymentsmaps.android.domain.model

import java.time.LocalDateTime
import java.util.UUID

/**
 * POS机核心实体模型
 * 遵循Clean Architecture原则，独立于外部框架
 */
data class POSMachine(
    val id: String = UUID.randomUUID().toString(),
    val serialNumber: String,
    val merchantId: String,
    val merchantName: String,
    val location: Location,
    val status: POSStatus,
    val type: POSType,
    val model: String,
    val manufacturer: String,
    val installationDate: LocalDateTime,
    val lastMaintenanceDate: LocalDateTime?,
    val nextMaintenanceDate: LocalDateTime?,
    val supportedPaymentMethods: List<PaymentMethod>,
    val dailyTransactionLimit: Double,
    val currentDailyVolume: Double,
    val monthlyTransactionLimit: Double,
    val currentMonthlyVolume: Double,
    val feeRate: Double,
    val isActive: Boolean,
    val notes: String?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)

/**
 * POS机地理位置信息
 */
data class Location(
    val latitude: Double,
    val longitude: Double,
    val address: String,
    val city: String,
    val province: String,
    val postalCode: String?,
    val country: String = "中国",
    val landmark: String? = null
) {
    /**
     * 计算与另一个位置的距离（公里）
     */
    fun distanceTo(other: Location): Double {
        val earthRadius = 6371.0 // 地球半径（公里）
        val lat1Rad = Math.toRadians(latitude)
        val lat2Rad = Math.toRadians(other.latitude)
        val deltaLatRad = Math.toRadians(other.latitude - latitude)
        val deltaLonRad = Math.toRadians(other.longitude - longitude)
        
        val a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        
        return earthRadius * c
    }
}

/**
 * POS机状态枚举
 */
enum class POSStatus {
    ACTIVE,      // 正常运行
    INACTIVE,    // 停用
    MAINTENANCE, // 维护中
    ERROR,       // 故障
    PENDING,     // 待激活
    OFFLINE      // 离线
}

/**
 * POS机类型枚举
 */
enum class POSType {
    FIXED,       // 固定式
    MOBILE,      // 移动式
    WIRELESS,    // 无线式
    COUNTERTOP,  // 台式
    PORTABLE,    // 便携式
    VIRTUAL      // 虚拟式
}

/**
 * 支付方式枚举
 */
enum class PaymentMethod {
    BANK_CARD,           // 银行卡
    CREDIT_CARD,         // 信用卡
    DEBIT_CARD,          // 借记卡
    WECHAT_PAY,          // 微信支付
    ALIPAY,              // 支付宝
    UNION_PAY,           // 银联
    DIGITAL_CURRENCY,    // 数字货币
    NFC,                 // 近场通信
    QR_CODE,             // 二维码
    CASH,                // 现金（某些POS机支持现金管理）
    CONTACTLESS,         // 非接触式
    MOBILE_PAYMENT       // 移动支付
}

/**
 * POS机扩展属性
 */
val POSMachine.isOverDailyLimit: Boolean
    get() = currentDailyVolume >= dailyTransactionLimit

val POSMachine.isOverMonthlyLimit: Boolean
    get() = currentMonthlyVolume >= monthlyTransactionLimit

val POSMachine.needsMaintenance: Boolean
    get() = nextMaintenanceDate?.let { it.isBefore(LocalDateTime.now()) } ?: false

val POSMachine.isOperational: Boolean
    get() = isActive && status == POSStatus.ACTIVE && !isOverDailyLimit

val POSMachine.displayName: String
    get() = "$manufacturer $model ($serialNumber)"

val POSMachine.shortAddress: String
    get() = "${location.city}, ${location.address}"