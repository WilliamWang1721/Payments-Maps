package com.paymentsmaps.android.domain.model

import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * 交易核心实体模型
 * 遵循Clean Architecture原则，独立于外部框架
 */
data class Transaction(
    val id: String = UUID.randomUUID().toString(),
    val posId: String,
    val merchantId: String,
    val transactionNumber: String,
    val amount: BigDecimal,
    val currency: String = "CNY",
    val paymentMethod: PaymentMethod,
    val status: TransactionStatus,
    val type: TransactionType,
    val description: String?,
    val customerInfo: CustomerInfo?,
    val cardInfo: CardInfo?,
    val fees: TransactionFees,
    val location: Location?,
    val deviceInfo: DeviceInfo,
    val receiptNumber: String?,
    val authorizationCode: String?,
    val referenceNumber: String?,
    val batchNumber: String?,
    val terminalId: String?,
    val acquirerInfo: AcquirerInfo?,
    val riskScore: Double?,
    val metadata: Map<String, String> = emptyMap(),
    val processedAt: LocalDateTime,
    val settledAt: LocalDateTime?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)

/**
 * 交易状态枚举
 */
enum class TransactionStatus {
    PENDING,        // 待处理
    PROCESSING,     // 处理中
    AUTHORIZED,     // 已授权
    CAPTURED,       // 已捕获
    SETTLED,        // 已结算
    FAILED,         // 失败
    CANCELLED,      // 已取消
    REFUNDED,       // 已退款
    PARTIALLY_REFUNDED, // 部分退款
    DISPUTED,       // 争议
    CHARGEBACK,     // 退单
    EXPIRED         // 已过期
}

/**
 * 交易类型枚举
 */
enum class TransactionType {
    SALE,           // 销售
    REFUND,         // 退款
    VOID,           // 撤销
    PREAUTH,        // 预授权
    CAPTURE,        // 捕获
    ADJUSTMENT,     // 调整
    REVERSAL,       // 冲正
    INQUIRY,        // 查询
    BALANCE_INQUIRY // 余额查询
}

/**
 * 客户信息
 */
data class CustomerInfo(
    val customerId: String?,
    val name: String?,
    val email: String?,
    val phone: String?,
    val loyaltyNumber: String?,
    val vipLevel: String?
)

/**
 * 银行卡信息
 */
data class CardInfo(
    val maskedNumber: String,        // 脱敏卡号
    val cardType: CardType,
    val brand: CardBrand,
    val issuerBank: String?,
    val expiryMonth: Int?,
    val expiryYear: Int?,
    val holderName: String?,
    val isChipCard: Boolean = false,
    val isContactless: Boolean = false
)

/**
 * 卡片类型枚举
 */
enum class CardType {
    CREDIT,         // 信用卡
    DEBIT,          // 借记卡
    PREPAID,        // 预付卡
    GIFT,           // 礼品卡
    CORPORATE,      // 企业卡
    UNKNOWN         // 未知
}

/**
 * 卡片品牌枚举
 */
enum class CardBrand {
    VISA,
    MASTERCARD,
    UNIONPAY,       // 银联
    AMEX,           // 美国运通
    DISCOVER,
    JCB,
    DINERS,
    MAESTRO,
    OTHER,
    UNKNOWN
}

/**
 * 交易费用信息
 */
data class TransactionFees(
    val merchantFee: BigDecimal = BigDecimal.ZERO,
    val processingFee: BigDecimal = BigDecimal.ZERO,
    val networkFee: BigDecimal = BigDecimal.ZERO,
    val interchangeFee: BigDecimal = BigDecimal.ZERO,
    val totalFees: BigDecimal = BigDecimal.ZERO,
    val feeRate: Double = 0.0,
    val currency: String = "CNY"
)

/**
 * 设备信息
 */
data class DeviceInfo(
    val deviceId: String,
    val deviceType: String,
    val manufacturer: String?,
    val model: String?,
    val serialNumber: String?,
    val softwareVersion: String?,
    val firmwareVersion: String?,
    val batteryLevel: Int?,
    val signalStrength: Int?,
    val connectionType: ConnectionType
)

/**
 * 连接类型枚举
 */
enum class ConnectionType {
    WIFI,
    ETHERNET,
    CELLULAR_4G,
    CELLULAR_5G,
    BLUETOOTH,
    USB,
    SERIAL,
    UNKNOWN
}

/**
 * 收单机构信息
 */
data class AcquirerInfo(
    val acquirerId: String,
    val acquirerName: String,
    val merchantId: String,
    val terminalId: String,
    val batchNumber: String?,
    val settlementDate: LocalDateTime?
)

/**
 * 交易扩展属性
 */
val Transaction.isSuccessful: Boolean
    get() = status in setOf(
        TransactionStatus.AUTHORIZED,
        TransactionStatus.CAPTURED,
        TransactionStatus.SETTLED
    )

val Transaction.isFailed: Boolean
    get() = status in setOf(
        TransactionStatus.FAILED,
        TransactionStatus.CANCELLED,
        TransactionStatus.EXPIRED
    )

val Transaction.isPending: Boolean
    get() = status in setOf(
        TransactionStatus.PENDING,
        TransactionStatus.PROCESSING
    )

val Transaction.isRefunded: Boolean
    get() = status in setOf(
        TransactionStatus.REFUNDED,
        TransactionStatus.PARTIALLY_REFUNDED
    )

val Transaction.canBeRefunded: Boolean
    get() = isSuccessful && type == TransactionType.SALE

val Transaction.canBeCancelled: Boolean
    get() = isPending

val Transaction.netAmount: BigDecimal
    get() = amount - fees.totalFees

val Transaction.displayAmount: String
    get() = "¥${amount.setScale(2)}"

val Transaction.displayFees: String
    get() = "¥${fees.totalFees.setScale(2)}"

val Transaction.displayNetAmount: String
    get() = "¥${netAmount.setScale(2)}"

val Transaction.shortTransactionNumber: String
    get() = transactionNumber.takeLast(8)

val Transaction.maskedCardNumber: String?
    get() = cardInfo?.maskedNumber

val Transaction.paymentMethodDisplay: String
    get() = when (paymentMethod) {
        PaymentMethod.BANK_CARD -> cardInfo?.brand?.name ?: "银行卡"
        PaymentMethod.CREDIT_CARD -> "信用卡"
        PaymentMethod.DEBIT_CARD -> "借记卡"
        PaymentMethod.WECHAT_PAY -> "微信支付"
        PaymentMethod.ALIPAY -> "支付宝"
        PaymentMethod.UNION_PAY -> "银联"
        PaymentMethod.DIGITAL_CURRENCY -> "数字货币"
        PaymentMethod.NFC -> "NFC支付"
        PaymentMethod.QR_CODE -> "二维码支付"
        PaymentMethod.CASH -> "现金"
        PaymentMethod.CONTACTLESS -> "非接触支付"
        PaymentMethod.MOBILE_PAYMENT -> "移动支付"
    }

val Transaction.statusDisplay: String
    get() = when (status) {
        TransactionStatus.PENDING -> "待处理"
        TransactionStatus.PROCESSING -> "处理中"
        TransactionStatus.AUTHORIZED -> "已授权"
        TransactionStatus.CAPTURED -> "已捕获"
        TransactionStatus.SETTLED -> "已结算"
        TransactionStatus.FAILED -> "失败"
        TransactionStatus.CANCELLED -> "已取消"
        TransactionStatus.REFUNDED -> "已退款"
        TransactionStatus.PARTIALLY_REFUNDED -> "部分退款"
        TransactionStatus.DISPUTED -> "争议"
        TransactionStatus.CHARGEBACK -> "退单"
        TransactionStatus.EXPIRED -> "已过期"
    }