package com.paymentsmaps.android.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import com.paymentsmaps.android.domain.model.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * 设置页面 UI 状态
 */
data class SettingsUiState(
    val language: String = "zh-CN",
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val currency: String = "CNY",
    val pushNotifications: Boolean = true,
    val emailNotifications: Boolean = true,
    val smsNotifications: Boolean = false,
    val marketingEmails: Boolean = false,
    val securityAlerts: Boolean = true,
    val transactionAlerts: Boolean = true,
    val maintenanceAlerts: Boolean = true,
    val isOfflineMode: Boolean = false,
    val analyticsEnabled: Boolean = true,
    val locationSharing: Boolean = true,
    val personalizedContent: Boolean = true,
    val availableLanguages: List<String> = listOf("zh-CN", "en", "ja", "es"),
    val availableCurrencies: List<String> = listOf("CNY", "USD", "EUR", "JPY"),
    val availableThemes: List<ThemeMode> = ThemeMode.values().toList(),
    val statusMessage: String? = null
)

/**
 * 设置页面 ViewModel
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferencesManager: UserPreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        observePreferences()
    }

    private fun observePreferences() {
        viewModelScope.launch {
            val basicFlow = combine(
                userPreferencesManager.languageFlow,
                userPreferencesManager.themeModeFlow,
                userPreferencesManager.currencyFlow
            ) { language, theme, currency ->
                BasicPreferenceSnapshot(language, theme, currency)
            }

            val notificationFlow = combine(
                userPreferencesManager.emailNotificationsFlow,
                userPreferencesManager.pushNotificationsFlow,
                userPreferencesManager.smsNotificationsFlow,
                userPreferencesManager.marketingEmailsFlow,
                userPreferencesManager.securityAlertsFlow,
                userPreferencesManager.transactionAlertsFlow,
                userPreferencesManager.maintenanceAlertsFlow
            ) { values: Array<Boolean> ->
                NotificationPreferenceSnapshot(
                    email = values[0],
                    push = values[1],
                    sms = values[2],
                    marketing = values[3],
                    security = values[4],
                    transaction = values[5],
                    maintenance = values[6]
                )
            }

            val privacyFlow = combine(
                userPreferencesManager.isOfflineModeFlow,
                userPreferencesManager.analyticsOptInFlow,
                userPreferencesManager.locationSharingFlow,
                userPreferencesManager.personalizedContentFlow
            ) { offline, analytics, location, personalized ->
                PrivacyPreferenceSnapshot(
                    offline = offline,
                    analyticsEnabled = analytics,
                    locationSharing = location,
                    personalizedContent = personalized
                )
            }

            combine(basicFlow, notificationFlow, privacyFlow) { basic, notifications, privacy ->
                SettingsUiState(
                    language = basic.language,
                    themeMode = parseThemeMode(basic.themeMode),
                    currency = basic.currency,
                    pushNotifications = notifications.push,
                    emailNotifications = notifications.email,
                    smsNotifications = notifications.sms,
                    marketingEmails = notifications.marketing,
                    securityAlerts = notifications.security,
                    transactionAlerts = notifications.transaction,
                    maintenanceAlerts = notifications.maintenance,
                    isOfflineMode = privacy.offline,
                    analyticsEnabled = privacy.analyticsEnabled,
                    locationSharing = privacy.locationSharing,
                    personalizedContent = privacy.personalizedContent,
                    availableLanguages = _uiState.value.availableLanguages,
                    availableCurrencies = _uiState.value.availableCurrencies,
                    availableThemes = _uiState.value.availableThemes,
                    statusMessage = _uiState.value.statusMessage
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    private fun parseThemeMode(value: String): ThemeMode {
        return when (value.lowercase()) {
            "light" -> ThemeMode.LIGHT
            "dark" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    fun clearStatusMessage() {
        if (_uiState.value.statusMessage != null) {
            _uiState.value = _uiState.value.copy(statusMessage = null)
        }
    }

    fun updateLanguage(language: String) {
        viewModelScope.launch {
            try {
                userPreferencesManager.saveLanguage(language)
                setMessage("语言已更新为 $language")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update language")
                setMessage("更新语言失败")
            }
        }
    }

    fun updateTheme(themeMode: ThemeMode) {
        viewModelScope.launch {
            try {
                userPreferencesManager.saveThemeMode(themeMode.name.lowercase())
                setMessage("主题已切换")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update theme")
                setMessage("切换主题失败")
            }
        }
    }

    fun updateCurrency(currency: String) {
        viewModelScope.launch {
            try {
                userPreferencesManager.saveCurrency(currency)
                setMessage("货币单位已更新为 $currency")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update currency")
                setMessage("更新货币设置失败")
            }
        }
    }

    fun updateNotificationSettings(
        email: Boolean? = null,
        push: Boolean? = null,
        sms: Boolean? = null,
        marketing: Boolean? = null,
        security: Boolean? = null,
        transaction: Boolean? = null,
        maintenance: Boolean? = null
    ) {
        val current = _uiState.value
        viewModelScope.launch {
            try {
                userPreferencesManager.saveNotificationSettings(
                    emailNotifications = email ?: current.emailNotifications,
                    pushNotifications = push ?: current.pushNotifications,
                    smsNotifications = sms ?: current.smsNotifications,
                    marketingEmails = marketing ?: current.marketingEmails,
                    securityAlerts = security ?: current.securityAlerts,
                    transactionAlerts = transaction ?: current.transactionAlerts,
                    maintenanceAlerts = maintenance ?: current.maintenanceAlerts
                )
                setMessage("通知偏好已更新")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update notification settings")
                setMessage("更新通知设置失败")
            }
        }
    }

    fun setOfflineMode(enabled: Boolean) {
        viewModelScope.launch {
            try {
                userPreferencesManager.setOfflineMode(enabled)
                setMessage(if (enabled) "已启用离线模式" else "已关闭离线模式")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update offline mode")
                setMessage("更新离线模式失败")
            }
        }
    }

    fun updatePrivacySettings(
        analytics: Boolean? = null,
        location: Boolean? = null,
        personalized: Boolean? = null
    ) {
        val current = _uiState.value
        viewModelScope.launch {
            try {
                userPreferencesManager.savePrivacySettings(
                    analyticsEnabled = analytics ?: current.analyticsEnabled,
                    locationSharing = location ?: current.locationSharing,
                    personalizedContent = personalized ?: current.personalizedContent
                )
                setMessage("隐私偏好已更新")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update privacy settings")
                setMessage("更新隐私设置失败")
            }
        }
    }

    private fun setMessage(message: String) {
        _uiState.value = _uiState.value.copy(statusMessage = message)
    }
}

private data class BasicPreferenceSnapshot(
    val language: String,
    val themeMode: String,
    val currency: String
)

private data class NotificationPreferenceSnapshot(
    val email: Boolean,
    val push: Boolean,
    val sms: Boolean,
    val marketing: Boolean,
    val security: Boolean,
    val transaction: Boolean,
    val maintenance: Boolean
)

private data class PrivacyPreferenceSnapshot(
    val offline: Boolean,
    val analyticsEnabled: Boolean,
    val locationSharing: Boolean,
    val personalizedContent: Boolean
)
