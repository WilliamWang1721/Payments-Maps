package com.paymentsmaps.android.data.remote.dto

import com.paymentsmaps.android.domain.model.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

/**
 * 商户数据传输对象
 */
@Serializable
data class MerchantDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("merchant_code")
    val merchantCode: String,
    
    @SerialName("business_name")
    val businessName: String,
    
    @SerialName("legal_name")
    val legalName: String? = null,
    
    @SerialName("dba_name")
    val dbaName: String? = null,
    
    @SerialName("status")
    val status: String,
    
    @SerialName("tier")
    val tier: String,
    
    @SerialName("industry")
    val industry: String,
    
    @SerialName("business_type")
    val businessType: String,
    
    @SerialName("tax_id")
    val taxId: String? = null,
    
    @SerialName("registration_number")
    val registrationNumber: String? = null,
    
    @SerialName("website")
    val website: String? = null,
    
    @SerialName("logo_url")
    val logoUrl: String? = null,
    
    @SerialName("description")
    val description: String? = null,
    
    @SerialName("established_date")
    val establishedDate: String? = null,
    
    @SerialName("onboarding_completed_at")
    val onboardingCompletedAt: String? = null,
    
    @SerialName("last_transaction_at")
    val lastTransactionAt: String? = null,
    
    @SerialName("is_active")
    val isActive: Boolean = true,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String,
    
    // 关联数据
    @SerialName("contact_info")
    val contactInfo: ContactInfoDto? = null,
    
    @SerialName("business_info")
    val businessInfo: BusinessInfoDto? = null,
    
    @SerialName("financial_info")
    val financialInfo: FinancialInfoDto? = null,
    
    @SerialName("operating_hours")
    val operatingHours: List<OperatingHoursDto> = emptyList(),
    
    @SerialName("pos_machines")
    val posMachines: List<POSMachineDto> = emptyList()
)

/**
 * 联系信息DTO
 */
@Serializable
data class ContactInfoDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("merchant_id")
    val merchantId: String,
    
    @SerialName("primary_contact_name")
    val primaryContactName: String,
    
    @SerialName("primary_contact_title")
    val primaryContactTitle: String? = null,
    
    @SerialName("primary_email")
    val primaryEmail: String,
    
    @SerialName("primary_phone")
    val primaryPhone: String,
    
    @SerialName("secondary_email")
    val secondaryEmail: String? = null,
    
    @SerialName("secondary_phone")
    val secondaryPhone: String? = null,
    
    @SerialName("support_email")
    val supportEmail: String? = null,
    
    @SerialName("support_phone")
    val supportPhone: String? = null,
    
    @SerialName("billing_email")
    val billingEmail: String? = null,
    
    @SerialName("address_line_1")
    val addressLine1: String,
    
    @SerialName("address_line_2")
    val addressLine2: String? = null,
    
    @SerialName("city")
    val city: String,
    
    @SerialName("state")
    val state: String,
    
    @SerialName("postal_code")
    val postalCode: String,
    
    @SerialName("country")
    val country: String = "CN",
    
    @SerialName("timezone")
    val timezone: String = "Asia/Shanghai",
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * 业务信息DTO
 */
@Serializable
data class BusinessInfoDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("merchant_id")
    val merchantId: String,
    
    @SerialName("legal_name")
    val legalName: String,
    
    @SerialName("annual_revenue")
    val annualRevenue: String? = null,
    
    @SerialName("monthly_transaction_volume")
    val monthlyTransactionVolume: String? = null,
    
    @SerialName("average_transaction_amount")
    val averageTransactionAmount: String? = null,
    
    @SerialName("peak_transaction_months")
    val peakTransactionMonths: List<Int> = emptyList(),
    
    @SerialName("business_model")
    val businessModel: String? = null,
    
    @SerialName("target_market")
    val targetMarket: String? = null,
    
    @SerialName("competitive_advantages")
    val competitiveAdvantages: List<String> = emptyList(),
    
    @SerialName("risk_level")
    val riskLevel: String,
    
    @SerialName("compliance_status")
    val complianceStatus: String,
    
    @SerialName("kyc_status")
    val kycStatus: String,
    
    @SerialName("aml_status")
    val amlStatus: String,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * 财务信息DTO
 */
@Serializable
data class FinancialInfoDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("merchant_id")
    val merchantId: String,
    
    @SerialName("bank_name")
    val bankName: String,
    
    @SerialName("account_number")
    val accountNumber: String,
    
    @SerialName("routing_number")
    val routingNumber: String? = null,
    
    @SerialName("account_type")
    val accountType: String,
    
    @SerialName("account_holder_name")
    val accountHolderName: String,
    
    @SerialName("swift_code")
    val swiftCode: String? = null,
    
    @SerialName("iban")
    val iban: String? = null,
    
    @SerialName("currency")
    val currency: String = "CNY",
    
    @SerialName("settlement_frequency")
    val settlementFrequency: String,
    
    @SerialName("processing_fee_rate")
    val processingFeeRate: Double,
    
    @SerialName("transaction_fee_flat")
    val transactionFeeFlat: String? = null,
    
    @SerialName("monthly_fee")
    val monthlyFee: String? = null,
    
    @SerialName("setup_fee")
    val setupFee: String? = null,
    
    @SerialName("chargeback_fee")
    val chargebackFee: String? = null,
    
    @SerialName("refund_fee")
    val refundFee: String? = null,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * 营业时间DTO
 */
@Serializable
data class OperatingHoursDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("merchant_id")
    val merchantId: String,
    
    @SerialName("day_of_week")
    val dayOfWeek: Int, // 1-7 (周一到周日)
    
    @SerialName("open_time")
    val openTime: String, // "09:00"
    
    @SerialName("close_time")
    val closeTime: String, // "18:00"
    
    @SerialName("is_open")
    val isOpen: Boolean = true,
    
    @SerialName("special_hours")
    val specialHours: String? = null,
    
    @SerialName("timezone")
    val timezone: String = "Asia/Shanghai",
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)


/**
 * DTO转换扩展函数
 */
fun MerchantDto.toDomain(): Merchant {
    return Merchant(
        id = id,
        merchantCode = merchantCode,
        businessName = businessName,
        legalName = legalName ?: businessName,
        businessType = BusinessType.valueOf(businessType.uppercase()),
        industry = Industry.valueOf(industry.uppercase()),
        status = MerchantStatus.valueOf(status.uppercase()),
        tier = MerchantTier.valueOf(tier.uppercase()),
        contactInfo = createDefaultContactInfo(),
        businessInfo = createDefaultBusinessInfo(),
        financialInfo = createDefaultFinancialInfo(),
        complianceInfo = createDefaultComplianceInfo(),
        settings = createDefaultMerchantSettings(),
        location = createDefaultLocation(),
        operatingHours = operatingHours.map { it.toDomain() },
        lastTransactionAt = lastTransactionAt?.let { parseInstantToLocalDateTime(it) },
        onboardedAt = parseInstantToLocalDateTime(createdAt),
        activatedAt = if (isActive) {
            onboardingCompletedAt?.let { parseInstantToLocalDateTime(it) }
        } else null,
        createdAt = parseInstantToLocalDateTime(createdAt),
        updatedAt = parseInstantToLocalDateTime(updatedAt)
    )
}

fun Merchant.toDto(): MerchantDto {
    return MerchantDto(
        id = id,
        merchantCode = merchantCode,
        businessName = businessName,
        legalName = legalName,
        status = status.name.lowercase(),
        tier = tier.name.lowercase(),
        industry = industry.name.lowercase(),
        businessType = businessType.name.lowercase(),
        createdAt = formatInstant(createdAt),
        updatedAt = formatInstant(updatedAt)
    )
}

/**
 * 时间转换工具函数
 */
private fun parseInstant(dateString: String): Instant {
    return try {
        Instant.parse(dateString)
    } catch (e: Exception) {
        Instant.now()
    }
}

private fun parseInstantToLocalDateTime(dateString: String): LocalDateTime {
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

/**
 * 默认值构造器扩展函数
 */
fun createDefaultContactInfo(): ContactInfo {
    return ContactInfo(
        primaryContact = createDefaultContact(),
        billingContact = null,
        technicalContact = null,
        emergencyContact = null
    )
}

fun createDefaultContact(): Contact {
    return Contact(
        name = "默认联系人",
        title = null,
        email = "default@example.com",
        phone = "000-0000-0000",
        mobile = null,
        fax = null,
        preferredContactMethod = ContactMethod.EMAIL
    )
}

fun createDefaultBusinessInfo(): BusinessInfo {
    return BusinessInfo(
        businessLicense = "默认营业执照",
        taxId = "000000000000000000",
        organizationCode = null,
        registrationDate = LocalDateTime.now(),
        registeredCapital = null,
        employeeCount = null,
        website = null,
        description = null,
        businessScope = "一般经营项目",
        registeredAddress = "默认注册地址",
        operatingAddress = null
    )
}

fun createDefaultFinancialInfo(): FinancialInfo {
    return FinancialInfo(
        bankAccount = createDefaultBankAccount(),
        settlementAccount = null,
        creditLimit = null,
        securityDeposit = null,
        feeStructure = createDefaultFeeStructure(),
        riskLevel = RiskLevel.LOW,
        monthlyVolumeLimit = null,
        dailyVolumeLimit = null,
        transactionLimit = null
    )
}

fun createDefaultBankAccount(): BankAccount {
    return BankAccount(
        accountNumber = "000000000000000000",
        accountName = "默认账户",
        bankName = "默认银行",
        bankCode = "000000",
        branchName = null,
        swiftCode = null,
        accountType = AccountType.BUSINESS
    )
}

fun createDefaultFeeStructure(): FeeStructure {
    return FeeStructure(
        transactionFeeRate = 0.006,
        monthlyFee = null,
        setupFee = null,
        chargebackFee = null,
        refundFee = null,
        minimumMonthlyFee = null,
        volumeDiscounts = emptyList()
    )
}

fun createDefaultComplianceInfo(): ComplianceInfo {
    return ComplianceInfo(
        kycStatus = KYCStatus.NOT_STARTED,
        amlStatus = AMLStatus.CLEAR,
        pciCompliance = false,
        lastComplianceCheck = null,
        nextComplianceReview = null,
        requiredDocuments = emptyList(),
        submittedDocuments = emptyList()
    )
}

fun createDefaultMerchantSettings(): MerchantSettings {
    return MerchantSettings()
}

fun createDefaultLocation(): com.paymentsmaps.android.domain.model.Location {
    return com.paymentsmaps.android.domain.model.Location(
        latitude = 0.0,
        longitude = 0.0,
        address = "默认地址",
        city = "默认城市",
        province = "默认省份",
        postalCode = "000000",
        country = "CN"
    )
}

fun OperatingHoursDto.toDomain(): OperatingHour {
    return OperatingHour(
        dayOfWeek = dayOfWeek,
        openTime = openTime,
        closeTime = closeTime,
        isOpen = isOpen
    )
}