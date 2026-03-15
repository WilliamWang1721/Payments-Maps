package com.paymentsmaps.android.data.preferences

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 用户偏好设置管理器
 * 使用 DataStore 进行持久化存储
 */
@Singleton
class UserPreferencesManager @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    
    companion object {
        // 用户基本信息
        private val USER_ID = stringPreferencesKey("user_id")
        private val USER_EMAIL = stringPreferencesKey("user_email")
        private val USER_NAME = stringPreferencesKey("user_name")
        private val USER_AVATAR = stringPreferencesKey("user_avatar")
        private val IS_LOGGED_IN = booleanPreferencesKey("is_logged_in")
        
        // 用户偏好设置
        private val LANGUAGE = stringPreferencesKey("language")
        private val THEME_MODE = stringPreferencesKey("theme_mode")
        private val CURRENCY = stringPreferencesKey("currency")
        private val TIMEZONE = stringPreferencesKey("timezone")
        private val DATE_FORMAT = stringPreferencesKey("date_format")
        private val TIME_FORMAT = stringPreferencesKey("time_format")
        
        // 通知设置
        private val EMAIL_NOTIFICATIONS = booleanPreferencesKey("email_notifications")
        private val PUSH_NOTIFICATIONS = booleanPreferencesKey("push_notifications")
        private val SMS_NOTIFICATIONS = booleanPreferencesKey("sms_notifications")
        private val MARKETING_EMAILS = booleanPreferencesKey("marketing_emails")
        private val SECURITY_ALERTS = booleanPreferencesKey("security_alerts")
        private val TRANSACTION_ALERTS = booleanPreferencesKey("transaction_alerts")
        private val MAINTENANCE_ALERTS = booleanPreferencesKey("maintenance_alerts")
        
        // 地图设置
        private val MAP_DEFAULT_ZOOM = intPreferencesKey("map_default_zoom")
        private val MAP_DEFAULT_LAT = stringPreferencesKey("map_default_lat")
        private val MAP_DEFAULT_LNG = stringPreferencesKey("map_default_lng")
        private val MAP_CLUSTER_POS = booleanPreferencesKey("map_cluster_pos")
        private val MAP_SHOW_STATUS = booleanPreferencesKey("map_show_status")
        private val AUTO_REFRESH_INTERVAL = intPreferencesKey("auto_refresh_interval")
        
        // 仪表板设置
        private val DASHBOARD_LAYOUT = stringPreferencesKey("dashboard_layout")
        private val ITEMS_PER_PAGE = intPreferencesKey("items_per_page")
        
        // 应用状态
        private val FIRST_RUN = booleanPreferencesKey("first_run")
        private val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
        private val APP_VERSION = stringPreferencesKey("app_version")
        private val LAST_SYNC_TIME = longPreferencesKey("last_sync_time")
        
        // 缓存控制
        private val CACHE_EXPIRY_TIME = longPreferencesKey("cache_expiry_time")
        private val OFFLINE_MODE = booleanPreferencesKey("offline_mode")
        private val BIOMETRIC_LOGIN = booleanPreferencesKey("biometric_login")
        private val REMEMBER_DEVICE = booleanPreferencesKey("remember_device")
        private val TWO_FACTOR_ENABLED = booleanPreferencesKey("two_factor_enabled")
        private val AUTO_LOGOUT_MINUTES = intPreferencesKey("auto_logout_minutes")
        private val ANALYTICS_OPT_IN = booleanPreferencesKey("analytics_opt_in")
        private val LOCATION_SHARING = booleanPreferencesKey("location_sharing")
        private val PERSONALIZED_CONTENT = booleanPreferencesKey("personalized_content")
    }
    
    // ========== 用户基本信息 ==========
    
    /**
     * 保存用户基本信息
     */
    suspend fun saveUserInfo(
        userId: String,
        email: String,
        name: String? = null,
        avatar: String? = null
    ) {
        try {
            dataStore.edit { preferences ->
                preferences[USER_ID] = userId
                preferences[USER_EMAIL] = email
                preferences[IS_LOGGED_IN] = true
                name?.let { preferences[USER_NAME] = it }
                avatar?.let { preferences[USER_AVATAR] = it }
            }
            Timber.d("User info saved: $email")
        } catch (e: Exception) {
            Timber.e(e, "Failed to save user info")
        }
    }
    
    /**
     * 获取用户ID
     */
    suspend fun getUserId(): String? {
        return try {
            dataStore.data.first()[USER_ID]
        } catch (e: Exception) {
            Timber.e(e, "Failed to get user ID")
            null
        }
    }
    
    /**
     * 获取用户邮箱
     */
    suspend fun getUserEmail(): String? {
        return try {
            dataStore.data.first()[USER_EMAIL]
        } catch (e: Exception) {
            Timber.e(e, "Failed to get user email")
            null
        }
    }
    
    /**
     * 获取登录状态
     */
    val isLoggedInFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[IS_LOGGED_IN] ?: false
        }
    
    suspend fun isLoggedIn(): Boolean {
        return try {
            isLoggedInFlow.first()
        } catch (e: Exception) {
            Timber.e(e, "Failed to check login status")
            false
        }
    }
    
    /**
     * 清除用户信息（登出）
     */
    suspend fun clearUserInfo() {
        try {
            dataStore.edit { preferences ->
                preferences.remove(USER_ID)
                preferences.remove(USER_EMAIL)
                preferences.remove(USER_NAME)
                preferences.remove(USER_AVATAR)
                preferences[IS_LOGGED_IN] = false
            }
            Timber.d("User info cleared")
        } catch (e: Exception) {
            Timber.e(e, "Failed to clear user info")
        }
    }
    
    // ========== 用户偏好设置 ==========
    
    /**
     * 保存语言设置
     */
    suspend fun saveLanguage(language: String) {
        try {
            dataStore.edit { preferences ->
                preferences[LANGUAGE] = language
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save language preference")
        }
    }
    
    /**
     * 获取语言设置
     */
    val languageFlow: Flow<String> = dataStore.data
        .map { preferences ->
            preferences[LANGUAGE] ?: "zh-CN"
        }
    
    /**
     * 保存主题设置
     */
    suspend fun saveThemeMode(themeMode: String) {
        try {
            dataStore.edit { preferences ->
                preferences[THEME_MODE] = themeMode
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save theme mode")
        }
    }
    
    /**
     * 获取主题设置
     */
    val themeModeFlow: Flow<String> = dataStore.data
        .map { preferences ->
            preferences[THEME_MODE] ?: "system"
        }
    
    /**
     * 保存货币设置
     */
    suspend fun saveCurrency(currency: String) {
        try {
            dataStore.edit { preferences ->
                preferences[CURRENCY] = currency
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save currency")
        }
    }
    
    /**
     * 获取货币设置
     */
    val currencyFlow: Flow<String> = dataStore.data
        .map { preferences ->
            preferences[CURRENCY] ?: "CNY"
        }
    
    // ========== 通知设置 ==========
    
    /**
     * 保存通知设置
     */
    suspend fun saveNotificationSettings(
        emailNotifications: Boolean = true,
        pushNotifications: Boolean = true,
        smsNotifications: Boolean = false,
        marketingEmails: Boolean = false,
        securityAlerts: Boolean = true,
        transactionAlerts: Boolean = true,
        maintenanceAlerts: Boolean = true
    ) {
        try {
            dataStore.edit { preferences ->
                preferences[EMAIL_NOTIFICATIONS] = emailNotifications
                preferences[PUSH_NOTIFICATIONS] = pushNotifications
                preferences[SMS_NOTIFICATIONS] = smsNotifications
                preferences[MARKETING_EMAILS] = marketingEmails
                preferences[SECURITY_ALERTS] = securityAlerts
                preferences[TRANSACTION_ALERTS] = transactionAlerts
                preferences[MAINTENANCE_ALERTS] = maintenanceAlerts
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save notification settings")
        }
    }
    
    /**
     * 获取推送通知设置
     */
    val pushNotificationsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[PUSH_NOTIFICATIONS] ?: true
        }
    
    /**
     * 获取邮件通知设置
     */
    val emailNotificationsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[EMAIL_NOTIFICATIONS] ?: true
        }

    /**
     * 获取短信通知设置
     */
    val smsNotificationsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[SMS_NOTIFICATIONS] ?: false
        }

    /**
     * 获取营销邮件设置
     */
    val marketingEmailsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[MARKETING_EMAILS] ?: false
        }

    /**
     * 获取安全告警设置
     */
    val securityAlertsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[SECURITY_ALERTS] ?: true
        }

    /**
     * 获取交易告警设置
     */
    val transactionAlertsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[TRANSACTION_ALERTS] ?: true
        }

    /**
     * 获取维护提醒设置
     */
    val maintenanceAlertsFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[MAINTENANCE_ALERTS] ?: true
        }
    
    // ========== 地图设置 ==========
    
    /**
     * 保存地图设置
     */
    suspend fun saveMapSettings(
        defaultZoom: Int = 12,
        defaultLat: Double? = null,
        defaultLng: Double? = null,
        clusterPOS: Boolean = true,
        showStatus: Boolean = true,
        autoRefreshInterval: Int = 30
    ) {
        try {
            dataStore.edit { preferences ->
                preferences[MAP_DEFAULT_ZOOM] = defaultZoom
                preferences[MAP_CLUSTER_POS] = clusterPOS
                preferences[MAP_SHOW_STATUS] = showStatus
                preferences[AUTO_REFRESH_INTERVAL] = autoRefreshInterval
                
                defaultLat?.let { preferences[MAP_DEFAULT_LAT] = it.toString() }
                defaultLng?.let { preferences[MAP_DEFAULT_LNG] = it.toString() }
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save map settings")
        }
    }
    
    /**
     * 获取地图默认缩放级别
     */
    val mapDefaultZoomFlow: Flow<Int> = dataStore.data
        .map { preferences ->
            preferences[MAP_DEFAULT_ZOOM] ?: 12
        }
    
    // ========== 应用状态 ==========
    
    /**
     * 标记首次运行完成
     */
    suspend fun markFirstRunCompleted() {
        try {
            dataStore.edit { preferences ->
                preferences[FIRST_RUN] = false
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to mark first run completed")
        }
    }
    
    /**
     * 检查是否为首次运行
     */
    val isFirstRunFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[FIRST_RUN] ?: true
        }
    
    /**
     * 标记引导完成
     */
    suspend fun markOnboardingCompleted() {
        try {
            dataStore.edit { preferences ->
                preferences[ONBOARDING_COMPLETED] = true
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to mark onboarding completed")
        }
    }
    
    /**
     * 检查引导是否完成
     */
    val isOnboardingCompletedFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[ONBOARDING_COMPLETED] ?: false
        }
    
    /**
     * 保存应用版本
     */
    suspend fun saveAppVersion(version: String) {
        try {
            dataStore.edit { preferences ->
                preferences[APP_VERSION] = version
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save app version")
        }
    }
    
    /**
     * 更新最后同步时间
     */
    suspend fun updateLastSyncTime() {
        try {
            dataStore.edit { preferences ->
                preferences[LAST_SYNC_TIME] = System.currentTimeMillis()
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to update last sync time")
        }
    }
    
    /**
     * 获取最后同步时间
     */
    suspend fun getLastSyncTime(): Long {
        return try {
            dataStore.data.first()[LAST_SYNC_TIME] ?: 0L
        } catch (e: Exception) {
            Timber.e(e, "Failed to get last sync time")
            0L
        }
    }
    
    // ========== 缓存管理 ==========
    
    /**
     * 设置离线模式
     */
    suspend fun setOfflineMode(offline: Boolean) {
        try {
            dataStore.edit { preferences ->
                preferences[OFFLINE_MODE] = offline
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to set offline mode")
        }
    }
    
    /**
     * 获取离线模式设置
     */
    val isOfflineModeFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[OFFLINE_MODE] ?: false
        }

    /**
     * 获取生物识别登录设置
     */
    val biometricLoginFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[BIOMETRIC_LOGIN] ?: false
        }

    /**
     * 获取记住设备设置
     */
    val rememberDeviceFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[REMEMBER_DEVICE] ?: true
        }

    /**
     * 获取两步验证设置
     */
    val twoFactorEnabledFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[TWO_FACTOR_ENABLED] ?: false
        }

    /**
     * 获取自动登出时间（分钟）
     */
    val autoLogoutMinutesFlow: Flow<Int> = dataStore.data
        .map { preferences ->
            preferences[AUTO_LOGOUT_MINUTES] ?: 30
        }

    /**
     * 隐私设置相关 Flow
     */
    val analyticsOptInFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[ANALYTICS_OPT_IN] ?: true
        }

    val locationSharingFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[LOCATION_SHARING] ?: true
        }

    val personalizedContentFlow: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[PERSONALIZED_CONTENT] ?: true
        }

    /**
     * 保存账户安全设置
     */
    suspend fun saveAccountSecuritySettings(
        biometricLogin: Boolean,
        rememberDevice: Boolean,
        twoFactorEnabled: Boolean,
        autoLogoutMinutes: Int
    ) {
        try {
            dataStore.edit { preferences ->
                preferences[BIOMETRIC_LOGIN] = biometricLogin
                preferences[REMEMBER_DEVICE] = rememberDevice
                preferences[TWO_FACTOR_ENABLED] = twoFactorEnabled
                preferences[AUTO_LOGOUT_MINUTES] = autoLogoutMinutes
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save account security settings")
        }
    }

    /**
     * 保存隐私设置
     */
    suspend fun savePrivacySettings(
        analyticsEnabled: Boolean,
        locationSharing: Boolean,
        personalizedContent: Boolean
    ) {
        try {
            dataStore.edit { preferences ->
                preferences[ANALYTICS_OPT_IN] = analyticsEnabled
                preferences[LOCATION_SHARING] = locationSharing
                preferences[PERSONALIZED_CONTENT] = personalizedContent
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to save privacy settings")
        }
    }
    
    /**
     * 清除所有偏好设置
     */
    suspend fun clearAll() {
        try {
            dataStore.edit { preferences ->
                preferences.clear()
            }
            Timber.d("All preferences cleared")
        } catch (e: Exception) {
            Timber.e(e, "Failed to clear all preferences")
        }
    }
    
    /**
     * 重置到默认设置（保留用户信息）
     */
    suspend fun resetToDefaults() {
        try {
            val userId = getUserId()
            val userEmail = getUserEmail()
            val isLoggedIn = isLoggedIn()
            
            dataStore.edit { preferences ->
                preferences.clear()
                
                // 恢复用户信息
                userId?.let { preferences[USER_ID] = it }
                userEmail?.let { preferences[USER_EMAIL] = it }
                preferences[IS_LOGGED_IN] = isLoggedIn
                
                // 设置默认偏好
                preferences[LANGUAGE] = "zh-CN"
                preferences[THEME_MODE] = "system"
                preferences[CURRENCY] = "CNY"
                preferences[EMAIL_NOTIFICATIONS] = true
                preferences[PUSH_NOTIFICATIONS] = true
                preferences[SMS_NOTIFICATIONS] = false
                preferences[MAP_DEFAULT_ZOOM] = 12
                preferences[AUTO_REFRESH_INTERVAL] = 30
            }
            
            Timber.d("Preferences reset to defaults")
        } catch (e: Exception) {
            Timber.e(e, "Failed to reset to defaults")
        }
    }
}
