package com.paymentsmaps.android.data.remote

import com.paymentsmaps.android.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage
import javax.inject.Singleton

/**
 * Supabase配置类
 * 提供Supabase客户端实例和相关配置
 */
@Singleton
object SupabaseConfig {
    
    /**
     * Supabase客户端实例
     */
    val client: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            // 安装Auth模块用于身份验证
            install(Auth)
            
            // 安装Postgrest模块用于数据库操作
            install(Postgrest)
            
            // 安装Storage模块用于文件存储
            install(Storage)
            
            // 安装Realtime模块用于实时订阅
            install(Realtime)
        }
    }
    
    /**
     * 数据库表名常量
     */
    object Tables {
        const val POS_MACHINES = "pos_machines"
        const val MERCHANTS = "merchants"
        const val TRANSACTIONS = "transactions"
        const val USERS = "users"
        const val USER_PROFILES = "user_profiles"
        const val MERCHANT_CONTACTS = "merchant_contacts"
        const val OPERATING_HOURS = "operating_hours"
        const val TRANSACTION_FEES = "transaction_fees"
        const val DEVICE_INFO = "device_info"
        const val COMPLIANCE_INFO = "compliance_info"
        const val DOCUMENTS = "documents"
        const val NOTIFICATIONS = "notifications"
        const val AUDIT_LOGS = "audit_logs"
    }
    
    /**
     * Storage桶名常量
     */
    object Buckets {
        const val AVATARS = "avatars"
        const val DOCUMENTS = "documents"
        const val RECEIPTS = "receipts"
        const val MERCHANT_LOGOS = "merchant-logos"
        const val POS_IMAGES = "pos-images"
    }
    
    /**
     * 实时订阅频道常量
     */
    object Channels {
        const val POS_UPDATES = "pos_updates"
        const val TRANSACTION_UPDATES = "transaction_updates"
        const val MERCHANT_UPDATES = "merchant_updates"
        const val USER_NOTIFICATIONS = "user_notifications"
        const val SYSTEM_ALERTS = "system_alerts"
    }
    
    /**
     * RPC函数名常量
     */
    object Functions {
        const val GET_POS_IN_RANGE = "get_pos_in_range"
        const val CALCULATE_TRANSACTION_STATS = "calculate_transaction_stats"
        const val UPDATE_POS_STATUS = "update_pos_status"
        const val GENERATE_REPORT = "generate_report"
        const val SEND_NOTIFICATION = "send_notification"
        const val VALIDATE_MERCHANT = "validate_merchant"
        const val PROCESS_PAYMENT = "process_payment"
        const val CALCULATE_FEES = "calculate_fees"
    }
    
    /**
     * 错误代码常量
     */
    object ErrorCodes {
        const val UNAUTHORIZED = "UNAUTHORIZED"
        const val FORBIDDEN = "FORBIDDEN"
        const val NOT_FOUND = "NOT_FOUND"
        const val VALIDATION_ERROR = "VALIDATION_ERROR"
        const val NETWORK_ERROR = "NETWORK_ERROR"
        const val SERVER_ERROR = "SERVER_ERROR"
        const val RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
        const val INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    }
    
    /**
     * 配置验证
     */
    fun isConfigured(): Boolean {
        return BuildConfig.SUPABASE_URL.isNotBlank() && 
               BuildConfig.SUPABASE_ANON_KEY.isNotBlank() &&
               BuildConfig.SUPABASE_URL != "YOUR_SUPABASE_URL" &&
               BuildConfig.SUPABASE_ANON_KEY != "YOUR_SUPABASE_ANON_KEY"
    }
    
    /**
     * 获取配置状态
     */
    fun getConfigStatus(): ConfigStatus {
        return when {
            !isConfigured() -> ConfigStatus.NOT_CONFIGURED
            else -> ConfigStatus.CONFIGURED
        }
    }
}

/**
 * 配置状态枚举
 */
enum class ConfigStatus {
    NOT_CONFIGURED,
    CONFIGURED,
    ERROR
}