package com.paymentsmaps.android.data.remote.dto

import com.paymentsmaps.android.domain.model.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * 用户数据传输对象
 */
@Serializable
data class UserDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("email")
    val email: String,
    
    @SerialName("role")
    val role: String,
    
    @SerialName("status")
    val status: String,
    
    @SerialName("permissions")
    val permissions: List<String> = emptyList(),
    
    @SerialName("merchant_id")
    val merchantId: String? = null,
    
    @SerialName("last_login_at")
    val lastLoginAt: String? = null,
    
    @SerialName("email_verified_at")
    val emailVerifiedAt: String? = null,
    
    @SerialName("phone_verified_at")
    val phoneVerifiedAt: String? = null,
    
    @SerialName("two_factor_enabled")
    val twoFactorEnabled: Boolean = false,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String,
    
    // 关联数据
    @SerialName("profile")
    val profile: UserProfileDto? = null,
    
    @SerialName("preferences")
    val preferences: UserPreferencesDto? = null,
    
    @SerialName("merchant")
    val merchant: MerchantDto? = null
)

/**
 * 用户资料DTO
 */
@Serializable
data class UserProfileDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("user_id")
    val userId: String,
    
    @SerialName("first_name")
    val firstName: String? = null,
    
    @SerialName("last_name")
    val lastName: String? = null,
    
    @SerialName("display_name")
    val displayName: String? = null,
    
    @SerialName("avatar_url")
    val avatarUrl: String? = null,
    
    @SerialName("phone_number")
    val phoneNumber: String? = null,
    
    @SerialName("date_of_birth")
    val dateOfBirth: String? = null,
    
    @SerialName("gender")
    val gender: String? = null,
    
    @SerialName("address")
    val address: String? = null,
    
    @SerialName("city")
    val city: String? = null,
    
    @SerialName("country")
    val country: String? = null,
    
    @SerialName("postal_code")
    val postalCode: String? = null,
    
    @SerialName("timezone")
    val timezone: String? = null,
    
    @SerialName("locale")
    val locale: String? = null,
    
    @SerialName("bio")
    val bio: String? = null,
    
    @SerialName("website")
    val website: String? = null,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * 用户偏好设置DTO
 */
@Serializable
data class UserPreferencesDto(
    @SerialName("id")
    val id: String,
    
    @SerialName("user_id")
    val userId: String,
    
    @SerialName("language")
    val language: String = "en",
    
    @SerialName("theme")
    val theme: String = "system",
    
    @SerialName("currency")
    val currency: String = "USD",
    
    @SerialName("date_format")
    val dateFormat: String = "MM/dd/yyyy",
    
    @SerialName("time_format")
    val timeFormat: String = "12h",
    
    @SerialName("number_format")
    val numberFormat: String = "en-US",
    
    @SerialName("notifications_enabled")
    val notificationsEnabled: Boolean = true,
    
    @SerialName("email_notifications")
    val emailNotifications: Boolean = true,
    
    @SerialName("push_notifications")
    val pushNotifications: Boolean = true,
    
    @SerialName("sms_notifications")
    val smsNotifications: Boolean = false,
    
    @SerialName("marketing_emails")
    val marketingEmails: Boolean = false,
    
    @SerialName("security_alerts")
    val securityAlerts: Boolean = true,
    
    @SerialName("transaction_alerts")
    val transactionAlerts: Boolean = true,
    
    @SerialName("maintenance_alerts")
    val maintenanceAlerts: Boolean = true,
    
    @SerialName("map_default_zoom")
    val mapDefaultZoom: Int = 10,
    
    @SerialName("map_default_latitude")
    val mapDefaultLatitude: Double? = null,
    
    @SerialName("map_default_longitude")
    val mapDefaultLongitude: Double? = null,
    
    @SerialName("dashboard_layout")
    val dashboardLayout: String = "default",
    
    @SerialName("items_per_page")
    val itemsPerPage: Int = 20,
    
    @SerialName("auto_refresh_interval")
    val autoRefreshInterval: Int = 30,
    
    @SerialName("created_at")
    val createdAt: String,
    
    @SerialName("updated_at")
    val updatedAt: String
)

/**
 * 登录响应DTO
 */
@Serializable
data class LoginResponseDto(
    @SerialName("access_token")
    val accessToken: String,
    
    @SerialName("refresh_token")
    val refreshToken: String,
    
    @SerialName("token_type")
    val tokenType: String = "Bearer",
    
    @SerialName("expires_in")
    val expiresIn: Long,
    
    @SerialName("user")
    val user: UserDto
)

/**
 * 登录请求DTO
 */
@Serializable
data class LoginRequestDto(
    @SerialName("email")
    val email: String,
    
    @SerialName("password")
    val password: String,
    
    @SerialName("remember_me")
    val rememberMe: Boolean = false
)

/**
 * 注册请求DTO
 */
@Serializable
data class RegisterRequestDto(
    @SerialName("email")
    val email: String,
    
    @SerialName("password")
    val password: String,
    
    @SerialName("first_name")
    val firstName: String? = null,
    
    @SerialName("last_name")
    val lastName: String? = null,
    
    @SerialName("phone_number")
    val phoneNumber: String? = null,
    
    @SerialName("merchant_id")
    val merchantId: String? = null
)

/**
 * 密码重置请求DTO
 */
@Serializable
data class PasswordResetRequestDto(
    @SerialName("email")
    val email: String
)

/**
 * 密码更新请求DTO
 */
@Serializable
data class PasswordUpdateRequestDto(
    @SerialName("current_password")
    val currentPassword: String,
    
    @SerialName("new_password")
    val newPassword: String
)

/**
 * DTO转换扩展函数
 */
fun UserDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        username = null,
        displayName = email.substringBefore("@"),
        avatar = null,
        phone = null,
        role = UserRole.valueOf(role.uppercase()),
        status = UserStatus.valueOf(status.uppercase()),
        permissions = permissions.mapNotNull { 
            try { Permission.valueOf(it.uppercase()) } catch (e: Exception) { null }
        }.toSet(),
        preferences = UserPreferences(),
        profile = UserProfile(
            firstName = null,
            lastName = null,
            company = null,
            department = null,
            position = null,
            address = null,
            city = null,
            province = null,
            postalCode = null,
            website = null,
            bio = null
        ),
        lastLoginAt = lastLoginAt?.let { parseInstant(it) },
        emailVerifiedAt = emailVerifiedAt?.let { parseInstant(it) },
        phoneVerifiedAt = phoneVerifiedAt?.let { parseInstant(it) },
        createdAt = parseInstant(createdAt),
        updatedAt = parseInstant(updatedAt)
    )
}

fun User.toDto(): UserDto {
    return UserDto(
        id = id,
        email = email,
        role = role.name.lowercase(),
        status = status.name.lowercase(),
        permissions = permissions.map { it.name.lowercase() },
        lastLoginAt = lastLoginAt?.let { formatInstant(it) },
        emailVerifiedAt = emailVerifiedAt?.let { formatInstant(it) },
        phoneVerifiedAt = phoneVerifiedAt?.let { formatInstant(it) },
        createdAt = formatInstant(createdAt),
        updatedAt = formatInstant(updatedAt)
    )
}

fun UserProfileDto.toDomain(): UserProfile {
    return UserProfile(
        firstName = firstName,
        lastName = lastName,
        company = null,
        department = null,
        position = null,
        address = address,
        city = city,
        province = null,
        country = country ?: "中国",
        postalCode = postalCode,
        website = website,
        bio = bio,
        socialLinks = emptyMap()
    )
}

fun UserProfile.toDto(): UserProfileDto {
    return UserProfileDto(
        id = "",
        userId = "",
        firstName = firstName,
        lastName = lastName,
        displayName = "${firstName ?: ""} ${lastName ?: ""}".trim(),
        avatarUrl = null,
        phoneNumber = null,
        dateOfBirth = null,
        gender = null,
        address = address,
        city = city,
        country = country,
        postalCode = postalCode,
        timezone = "Asia/Shanghai",
        locale = "zh-CN",
        bio = bio,
        website = website,
        createdAt = "",
        updatedAt = ""
    )
}

fun UserPreferencesDto.toDomain(): UserPreferences {
    return UserPreferences(
        language = language,
        theme = try { ThemeMode.valueOf(theme.uppercase()) } catch (e: Exception) { ThemeMode.SYSTEM },
        currency = currency,
        timezone = "Asia/Shanghai",
        dateFormat = dateFormat,
        timeFormat = timeFormat,
        notifications = NotificationPreferences(
            emailNotifications = emailNotifications,
            pushNotifications = pushNotifications,
            smsNotifications = smsNotifications,
            posStatusAlerts = true,
            transactionAlerts = transactionAlerts,
            maintenanceReminders = maintenanceAlerts,
            securityAlerts = securityAlerts,
            marketingEmails = marketingEmails
        ),
        mapSettings = MapPreferences(
            defaultZoomLevel = mapDefaultZoom,
            clusterPOSMachines = true,
            showPOSStatus = true,
            autoRefreshInterval = autoRefreshInterval
        ),
        dashboardLayout = try { DashboardLayout.valueOf(dashboardLayout.uppercase()) } catch (e: Exception) { DashboardLayout.DEFAULT }
    )
}

fun UserPreferences.toDto(): UserPreferencesDto {
    return UserPreferencesDto(
        id = "",
        userId = "",
        language = language,
        theme = theme.name.lowercase(),
        currency = currency,
        dateFormat = dateFormat,
        timeFormat = timeFormat,
        numberFormat = "en-US",
        notificationsEnabled = true,
        emailNotifications = notifications.emailNotifications,
        pushNotifications = notifications.pushNotifications,
        smsNotifications = notifications.smsNotifications,
        marketingEmails = notifications.marketingEmails,
        securityAlerts = notifications.securityAlerts,
        transactionAlerts = notifications.transactionAlerts,
        maintenanceAlerts = notifications.maintenanceReminders,
        mapDefaultZoom = mapSettings.defaultZoomLevel,
        mapDefaultLatitude = null,
        mapDefaultLongitude = null,
        dashboardLayout = dashboardLayout.name.lowercase(),
        itemsPerPage = 20,
        autoRefreshInterval = mapSettings.autoRefreshInterval,
        createdAt = "",
        updatedAt = ""
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