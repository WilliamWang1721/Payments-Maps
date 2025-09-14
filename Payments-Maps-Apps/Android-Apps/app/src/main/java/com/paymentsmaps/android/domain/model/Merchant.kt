package com.paymentsmaps.android.domain.model

import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * 商户核心实体模型
 * 遵循Clean Architecture原则，独立于外部框架
 */
data class Merchant(
    val id: String = UUID.randomUUID().toString(),
    val merchantCode: String,
    val businessName: String,
    val legalName: String,
    val businessType: BusinessType,
    val industry: Industry,
    val status: MerchantStatus,
    val tier: MerchantTier,
    val contactInfo: ContactInfo,
    val businessInfo: BusinessInfo,
    val financialInfo: FinancialInfo,
    val complianceInfo: ComplianceInfo,
    val settings: MerchantSettings,
    val location: Location,
    val operatingHours: List<OperatingHour>,
    val posCount: Int = 0,
    val activePosCount: Int = 0,
    val totalTransactionVolume: BigDecimal = BigDecimal.ZERO,
    val monthlyTransactionVolume: BigDecimal = BigDecimal.ZERO,
    val averageTransactionAmount: BigDecimal = BigDecimal.ZERO,
    val lastTransactionAt: LocalDateTime?,
    val onboardedAt: LocalDateTime,
    val activatedAt: LocalDateTime?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)

/**
 * 商户状态枚举
 */
enum class MerchantStatus {
    PENDING,        // 待审核
    ACTIVE,         // 活跃
    INACTIVE,       // 非活跃
    SUSPENDED,      // 暂停
    TERMINATED,     // 终止
    UNDER_REVIEW,   // 审核中
    REJECTED        // 已拒绝
}

/**
 * 商户等级枚举
 */
enum class MerchantTier {
    BRONZE,         // 铜牌
    SILVER,         // 银牌
    GOLD,           // 金牌
    PLATINUM,       // 白金
    DIAMOND,        // 钻石
    ENTERPRISE      // 企业级
}

/**
 * 业务类型枚举
 */
enum class BusinessType {
    SOLE_PROPRIETORSHIP,    // 个体工商户
    LIMITED_COMPANY,        // 有限责任公司
    JOINT_STOCK_COMPANY,    // 股份有限公司
    PARTNERSHIP,            // 合伙企业
    BRANCH_OFFICE,          // 分公司
    REPRESENTATIVE_OFFICE,  // 代表处
    FOREIGN_ENTERPRISE,     // 外商投资企业
    STATE_OWNED,           // 国有企业
    COLLECTIVE,            // 集体企业
    OTHER                  // 其他
}

/**
 * 行业分类枚举
 */
enum class Industry {
    RETAIL,                 // 零售
    RESTAURANT,             // 餐饮
    HOTEL,                  // 酒店
    SUPERMARKET,            // 超市
    GAS_STATION,            // 加油站
    PHARMACY,               // 药店
    HOSPITAL,               // 医院
    EDUCATION,              // 教育
    ENTERTAINMENT,          // 娱乐
    BEAUTY_SALON,           // 美容美发
    AUTOMOTIVE,             // 汽车服务
    REAL_ESTATE,            // 房地产
    FINANCIAL_SERVICES,     // 金融服务
    PROFESSIONAL_SERVICES,  // 专业服务
    TRANSPORTATION,         // 交通运输
    LOGISTICS,              // 物流
    MANUFACTURING,          // 制造业
    AGRICULTURE,            // 农业
    CONSTRUCTION,           // 建筑业
    TECHNOLOGY,             // 科技
    TELECOMMUNICATIONS,     // 电信
    UTILITIES,              // 公用事业
    GOVERNMENT,             // 政府机构
    NON_PROFIT,            // 非营利组织
    OTHER                  // 其他
}

/**
 * 联系信息
 */
data class ContactInfo(
    val primaryContact: Contact,
    val billingContact: Contact?,
    val technicalContact: Contact?,
    val emergencyContact: Contact?
)

/**
 * 联系人信息
 */
data class Contact(
    val name: String,
    val title: String?,
    val email: String,
    val phone: String,
    val mobile: String?,
    val fax: String?,
    val preferredContactMethod: ContactMethod = ContactMethod.EMAIL
)

/**
 * 联系方式枚举
 */
enum class ContactMethod {
    EMAIL,
    PHONE,
    MOBILE,
    FAX,
    SMS
}

/**
 * 业务信息
 */
data class BusinessInfo(
    val businessLicense: String,
    val taxId: String,
    val organizationCode: String?,
    val registrationDate: LocalDateTime,
    val registeredCapital: BigDecimal?,
    val employeeCount: Int?,
    val website: String?,
    val description: String?,
    val businessScope: String,
    val registeredAddress: String,
    val operatingAddress: String?
)

/**
 * 财务信息
 */
data class FinancialInfo(
    val bankAccount: BankAccount,
    val settlementAccount: BankAccount?,
    val creditLimit: BigDecimal?,
    val securityDeposit: BigDecimal?,
    val feeStructure: FeeStructure,
    val riskLevel: RiskLevel,
    val monthlyVolumeLimit: BigDecimal?,
    val dailyVolumeLimit: BigDecimal?,
    val transactionLimit: BigDecimal?
)

/**
 * 银行账户信息
 */
data class BankAccount(
    val accountNumber: String,
    val accountName: String,
    val bankName: String,
    val bankCode: String,
    val branchName: String?,
    val swiftCode: String?,
    val accountType: AccountType
)

/**
 * 账户类型枚举
 */
enum class AccountType {
    CHECKING,       // 支票账户
    SAVINGS,        // 储蓄账户
    BUSINESS,       // 企业账户
    ESCROW         // 托管账户
}

/**
 * 费率结构
 */
data class FeeStructure(
    val transactionFeeRate: Double,
    val monthlyFee: BigDecimal?,
    val setupFee: BigDecimal?,
    val chargebackFee: BigDecimal?,
    val refundFee: BigDecimal?,
    val minimumMonthlyFee: BigDecimal?,
    val volumeDiscounts: List<VolumeDiscount> = emptyList()
)

/**
 * 交易量折扣
 */
data class VolumeDiscount(
    val minimumVolume: BigDecimal,
    val discountRate: Double,
    val description: String
)

/**
 * 风险等级枚举
 */
enum class RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}

/**
 * 合规信息
 */
data class ComplianceInfo(
    val kycStatus: KYCStatus,
    val amlStatus: AMLStatus,
    val pciCompliance: Boolean,
    val lastComplianceCheck: LocalDateTime?,
    val nextComplianceReview: LocalDateTime?,
    val requiredDocuments: List<RequiredDocument>,
    val submittedDocuments: List<SubmittedDocument>
)

/**
 * KYC状态枚举
 */
enum class KYCStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED,
    FAILED,
    EXPIRED
}

/**
 * AML状态枚举
 */
enum class AMLStatus {
    CLEAR,
    UNDER_REVIEW,
    FLAGGED,
    BLOCKED
}

/**
 * 必需文档
 */
data class RequiredDocument(
    val type: DocumentType,
    val description: String,
    val required: Boolean,
    val expiryDate: LocalDateTime?
)

/**
 * 已提交文档
 */
data class SubmittedDocument(
    val type: DocumentType,
    val fileName: String,
    val uploadedAt: LocalDateTime,
    val status: DocumentStatus,
    val reviewedBy: String?,
    val reviewedAt: LocalDateTime?,
    val comments: String?
)

/**
 * 文档类型枚举
 */
enum class DocumentType {
    BUSINESS_LICENSE,
    TAX_CERTIFICATE,
    BANK_STATEMENT,
    ID_CARD,
    PASSPORT,
    UTILITY_BILL,
    FINANCIAL_STATEMENT,
    AUTHORIZATION_LETTER,
    OTHER
}

/**
 * 文档状态枚举
 */
enum class DocumentStatus {
    PENDING,
    APPROVED,
    REJECTED,
    EXPIRED
}

/**
 * 商户设置
 */
data class MerchantSettings(
    val autoSettlement: Boolean = true,
    val settlementFrequency: SettlementFrequency = SettlementFrequency.DAILY,
    val notificationPreferences: MerchantNotificationPreferences = MerchantNotificationPreferences(),
    val securitySettings: SecuritySettings = SecuritySettings(),
    val apiSettings: ApiSettings = ApiSettings()
)

/**
 * 结算频率枚举
 */
enum class SettlementFrequency {
    DAILY,
    WEEKLY,
    MONTHLY,
    ON_DEMAND
}

/**
 * 商户通知偏好
 */
data class MerchantNotificationPreferences(
    val transactionAlerts: Boolean = true,
    val settlementNotifications: Boolean = true,
    val chargebackAlerts: Boolean = true,
    val systemMaintenanceNotices: Boolean = true,
    val promotionalEmails: Boolean = false
)

/**
 * 安全设置
 */
data class SecuritySettings(
    val twoFactorAuth: Boolean = false,
    val ipWhitelist: List<String> = emptyList(),
    val sessionTimeout: Int = 30, // 分钟
    val passwordPolicy: PasswordPolicy = PasswordPolicy()
)

/**
 * 密码策略
 */
data class PasswordPolicy(
    val minLength: Int = 8,
    val requireUppercase: Boolean = true,
    val requireLowercase: Boolean = true,
    val requireNumbers: Boolean = true,
    val requireSpecialChars: Boolean = true,
    val expiryDays: Int = 90
)

/**
 * API设置
 */
data class ApiSettings(
    val webhookUrl: String? = null,
    val apiKey: String? = null,
    val rateLimitPerMinute: Int = 100,
    val enableWebhooks: Boolean = false
)

/**
 * 营业时间
 */
data class OperatingHour(
    val dayOfWeek: Int, // 1-7 (Monday-Sunday)
    val openTime: String, // HH:mm format
    val closeTime: String, // HH:mm format
    val isOpen: Boolean = true
)

/**
 * 商户扩展属性
 */
val Merchant.isActive: Boolean
    get() = status == MerchantStatus.ACTIVE

val Merchant.isOperational: Boolean
    get() = isActive && activePosCount > 0

val Merchant.displayName: String
    get() = businessName.ifBlank { legalName }

val Merchant.shortCode: String
    get() = merchantCode.takeLast(6)

val Merchant.primaryContactEmail: String
    get() = contactInfo.primaryContact.email

val Merchant.primaryContactPhone: String
    get() = contactInfo.primaryContact.phone

val Merchant.riskLevelDisplay: String
    get() = when (financialInfo.riskLevel) {
        RiskLevel.LOW -> "低风险"
        RiskLevel.MEDIUM -> "中等风险"
        RiskLevel.HIGH -> "高风险"
        RiskLevel.CRITICAL -> "极高风险"
    }

val Merchant.tierDisplay: String
    get() = when (tier) {
        MerchantTier.BRONZE -> "铜牌商户"
        MerchantTier.SILVER -> "银牌商户"
        MerchantTier.GOLD -> "金牌商户"
        MerchantTier.PLATINUM -> "白金商户"
        MerchantTier.DIAMOND -> "钻石商户"
        MerchantTier.ENTERPRISE -> "企业级商户"
    }

val Merchant.statusDisplay: String
    get() = when (status) {
        MerchantStatus.PENDING -> "待审核"
        MerchantStatus.ACTIVE -> "活跃"
        MerchantStatus.INACTIVE -> "非活跃"
        MerchantStatus.SUSPENDED -> "暂停"
        MerchantStatus.TERMINATED -> "终止"
        MerchantStatus.UNDER_REVIEW -> "审核中"
        MerchantStatus.REJECTED -> "已拒绝"
    }