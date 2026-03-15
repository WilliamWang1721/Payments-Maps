package com.paymentsmaps.android.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 通知设置 UI 状态
 */
data class NotificationSettingsUiState(
    val emailNotifications: Boolean = true,
    val pushNotifications: Boolean = true,
    val smsNotifications: Boolean = false,
    val marketingEmails: Boolean = false,
    val securityAlerts: Boolean = true,
    val transactionAlerts: Boolean = true,
    val maintenanceAlerts: Boolean = true
)

/**
 * 通知设置 ViewModel
 */
@HiltViewModel
class NotificationSettingsViewModel @Inject constructor(
    private val userPreferencesManager: UserPreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationSettingsUiState())
    val uiState: StateFlow<NotificationSettingsUiState> = _uiState.asStateFlow()

    init {
        observePreferences()
    }

    private fun observePreferences() {
        viewModelScope.launch {
            combine(
                userPreferencesManager.emailNotificationsFlow,
                userPreferencesManager.pushNotificationsFlow,
                userPreferencesManager.smsNotificationsFlow,
                userPreferencesManager.marketingEmailsFlow,
                userPreferencesManager.securityAlertsFlow,
                userPreferencesManager.transactionAlertsFlow,
                userPreferencesManager.maintenanceAlertsFlow
            ) { values: Array<Boolean> ->
                NotificationSettingsUiState(
                    emailNotifications = values[0],
                    pushNotifications = values[1],
                    smsNotifications = values[2],
                    marketingEmails = values[3],
                    securityAlerts = values[4],
                    transactionAlerts = values[5],
                    maintenanceAlerts = values[6]
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    private fun persist(state: NotificationSettingsUiState) {
        viewModelScope.launch {
            userPreferencesManager.saveNotificationSettings(
                emailNotifications = state.emailNotifications,
                pushNotifications = state.pushNotifications,
                smsNotifications = state.smsNotifications,
                marketingEmails = state.marketingEmails,
                securityAlerts = state.securityAlerts,
                transactionAlerts = state.transactionAlerts,
                maintenanceAlerts = state.maintenanceAlerts
            )
        }
    }

    fun updateEmailNotifications(enabled: Boolean) {
        val newState = _uiState.value.copy(emailNotifications = enabled)
        _uiState.value = newState
        persist(newState)
    }

    fun updatePushNotifications(enabled: Boolean) {
        val newState = _uiState.value.copy(pushNotifications = enabled)
        _uiState.value = newState
        persist(newState)
    }

    fun updateSmsNotifications(enabled: Boolean) {
        val newState = _uiState.value.copy(smsNotifications = enabled)
        _uiState.value = newState
        persist(newState)
    }

    fun updateMarketingEmails(enabled: Boolean) {
        val newState = _uiState.value.copy(marketingEmails = enabled)
        _uiState.value = newState
        persist(newState)
    }

    fun updateSecurityAlerts(enabled: Boolean) {
        val newState = _uiState.value.copy(securityAlerts = enabled)
        _uiState.value = newState
        persist(newState)
    }

    fun updateTransactionAlerts(enabled: Boolean) {
        val newState = _uiState.value.copy(transactionAlerts = enabled)
        _uiState.value = newState
        persist(newState)
    }

    fun updateMaintenanceAlerts(enabled: Boolean) {
        val newState = _uiState.value.copy(maintenanceAlerts = enabled)
        _uiState.value = newState
        persist(newState)
    }
}
