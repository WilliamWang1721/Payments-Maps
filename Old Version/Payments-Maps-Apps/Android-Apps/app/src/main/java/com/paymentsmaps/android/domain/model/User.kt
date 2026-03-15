package com.paymentsmaps.android.domain.model

import java.time.LocalDateTime
import java.util.UUID

/**
 * 用户核心实体模型
 * 遵循Clean Architecture原则，独立于外部框架
 */
data class User(
    val id: String = UUID.randomUUID().toString(),
    val email: String,
    val username: String?,
    val displayName: String,
    val avatar: String?,
    val phone: String?,
    val role: UserRole,
    val status: UserStatus,
    val preferences: UserPreferences,
    val profile: UserProfile,
    val permissions: Set<Permission>,
    val lastLoginAt: LocalDateTime?,
    val emailVerifiedAt: LocalDateTime?,
    val phoneVerifiedAt: LocalDateTime?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
) {
    
    /**
     * 用户扩展属性
     */
    val isVerified: Boolean
        get() = emailVerifiedAt != null

    val isPhoneVerified: Boolean
        get() = phoneVerifiedAt != null

    val isFullyVerified: Boolean
        get() = isVerified && isPhoneVerified

    val canManagePOS: Boolean
        get() = permissions.any { 
            it in setOf(
                Permission.POS_CREATE, 
                Permission.POS_EDIT, 
                Permission.POS_DELETE,
                Permission.POS_ACTIVATE,
                Permission.POS_DEACTIVATE
            )
        }

    val canViewReports: Boolean
        get() = permissions.contains(Permission.REPORT_VIEW)

    val isAdmin: Boolean
        get() = role in setOf(UserRole.SUPER_ADMIN, UserRole.ADMIN)

    val fullName: String
        get() = when {
            profile.firstName != null && profile.lastName != null -> 
                "${profile.firstName} ${profile.lastName}"
            profile.firstName != null -> profile.firstName
            profile.lastName != null -> profile.lastName
            else -> displayName
        }

    val initials: String
        get() = when {
            profile.firstName != null && profile.lastName != null -> 
                "${profile.firstName.first()}${profile.lastName.first()}".uppercase()
            displayName.isNotBlank() -> {
                val parts = displayName.split(" ")
                if (parts.size >= 2) {
                    "${parts[0].first()}${parts[1].first()}".uppercase()
                } else {
                    displayName.take(2).uppercase()
                }
            }
            else -> "U"
        }
    
    companion object {
        /**
         * 创建默认用户实例
         */
        fun createDefault(id: String = UUID.randomUUID().toString(), email: String = "user@example.com"): User {
            return User(
                id = id,
                email = email,
                username = email.substringBefore("@"),
                displayName = email.substringBefore("@"),
                avatar = null,
                phone = null,
                role = UserRole.USER,
                status = UserStatus.ACTIVE,
                preferences = UserPreferences(
                    language = "zh-CN",
                    theme = ThemeMode.SYSTEM,
                    currency = "CNY",
                    timezone = "Asia/Shanghai",
                    dateFormat = "yyyy-MM-dd",
                    timeFormat = "24h",
                    notifications = NotificationPreferences(
                        emailNotifications = true,
                        pushNotifications = true,
                        smsNotifications = false,
                        posStatusAlerts = true,
                        transactionAlerts = true,
                        maintenanceReminders = true,
                        securityAlerts = true,
                        marketingEmails = false
                    ),
                    mapSettings = MapPreferences(
                        defaultZoomLevel = 10,
                        clusterPOSMachines = true,
                        showPOSStatus = true,
                        autoRefreshInterval = 30
                    ),
                    dashboardLayout = DashboardLayout.DEFAULT
                ),
                profile = UserProfile(
                    firstName = null,
                    lastName = null,
                    company = null,
                    department = null,
                    position = null,
                    address = null,
                    city = "北京",
                    province = "北京市",
                    country = "中国",
                    postalCode = null,
                    website = null,
                    bio = null,
                    socialLinks = emptyMap()
                ),
                permissions = emptySet(),
                lastLoginAt = null,
                emailVerifiedAt = null,
                phoneVerifiedAt = null,
                createdAt = LocalDateTime.now(),
                updatedAt = LocalDateTime.now()
            )
        }
    }
}

/**
 * 用户角色枚举
 */
enum class UserRole {
    SUPER_ADMIN,     // 超级管理员
    ADMIN,           // 管理员
    MANAGER,         // 经理
    OPERATOR,        // 操作员
    VIEWER,          // 查看者
    MERCHANT,        // 商户
    TECHNICIAN,      // 技术员
    CUSTOMER_SERVICE,// 客服
    USER             // 普通用户
}

/**
 * 用户状态枚举
 */
enum class UserStatus {
    ACTIVE,          // 活跃
    INACTIVE,        // 非活跃
    SUSPENDED,       // 暂停
    PENDING,         // 待审核
    BLOCKED          // 封禁
}

/**
 * 用户权限枚举
 */
enum class Permission {
    // POS机管理权限
    POS_VIEW,
    POS_CREATE,
    POS_EDIT,
    POS_DELETE,
    POS_ACTIVATE,
    POS_DEACTIVATE,
    
    // 商户管理权限
    MERCHANT_VIEW,
    MERCHANT_CREATE,
    MERCHANT_EDIT,
    MERCHANT_DELETE,
    
    // 用户管理权限
    USER_VIEW,
    USER_CREATE,
    USER_EDIT,
    USER_DELETE,
    USER_MANAGE_ROLES,
    
    // 交易管理权限
    TRANSACTION_VIEW,
    TRANSACTION_EXPORT,
    TRANSACTION_REFUND,
    
    // 报表权限
    REPORT_VIEW,
    REPORT_EXPORT,
    REPORT_ADVANCED,
    
    // 系统管理权限
    SYSTEM_CONFIG,
    SYSTEM_BACKUP,
    SYSTEM_LOGS,
    
    // 地图权限
    MAP_VIEW,
    MAP_EDIT_LOCATIONS,
    
    // 通知权限
    NOTIFICATION_SEND,
    NOTIFICATION_MANAGE
}

/**
 * 用户偏好设置
 */
data class UserPreferences(
    val language: String = "zh-CN",
    val theme: ThemeMode = ThemeMode.SYSTEM,
    val currency: String = "CNY",
    val timezone: String = "Asia/Shanghai",
    val dateFormat: String = "yyyy-MM-dd",
    val timeFormat: String = "HH:mm:ss",
    val notifications: NotificationPreferences = NotificationPreferences(),
    val mapSettings: MapPreferences = MapPreferences(),
    val dashboardLayout: DashboardLayout = DashboardLayout.DEFAULT
)

/**
 * 主题模式枚举
 */
enum class ThemeMode {
    LIGHT,   // 浅色主题
    DARK,    // 深色主题
    SYSTEM   // 跟随系统
}

/**
 * 通知偏好设置
 */
data class NotificationPreferences(
    val emailNotifications: Boolean = true,
    val pushNotifications: Boolean = true,
    val smsNotifications: Boolean = false,
    val posStatusAlerts: Boolean = true,
    val transactionAlerts: Boolean = true,
    val maintenanceReminders: Boolean = true,
    val securityAlerts: Boolean = true,
    val marketingEmails: Boolean = false
)

/**
 * 地图偏好设置
 */
data class MapPreferences(
    val defaultMapType: MapType = MapType.STANDARD,
    val showTraffic: Boolean = false,
    val showSatellite: Boolean = false,
    val defaultZoomLevel: Int = 12,
    val clusterPOSMachines: Boolean = true,
    val showPOSStatus: Boolean = true,
    val autoRefreshInterval: Int = 30 // 秒
)

/**
 * 地图类型枚举
 */
enum class MapType {
    STANDARD,    // 标准地图
    SATELLITE,   // 卫星地图
    TERRAIN,     // 地形地图
    HYBRID       // 混合地图
}

/**
 * 仪表板布局枚举
 */
enum class DashboardLayout {
    DEFAULT,     // 默认布局
    COMPACT,     // 紧凑布局
    DETAILED,    // 详细布局
    CUSTOM       // 自定义布局
}

/**
 * 用户档案信息
 */
data class UserProfile(
    val firstName: String?,
    val lastName: String?,
    val company: String?,
    val department: String?,
    val position: String?,
    val address: String?,
    val city: String?,
    val province: String?,
    val country: String = "中国",
    val postalCode: String?,
    val website: String?,
    val bio: String?,
    val socialLinks: Map<String, String> = emptyMap()
)