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
 * 隐私设置 UI 状态
 */
data class PrivacySettingsUiState(
    val isOfflineMode: Boolean = false,
    val lastSyncTime: Long = 0L
)

/**
 * 隐私设置 ViewModel
 */
@HiltViewModel
class PrivacySettingsViewModel @Inject constructor(
    private val userPreferencesManager: UserPreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(PrivacySettingsUiState())
    val uiState: StateFlow<PrivacySettingsUiState> = _uiState.asStateFlow()

    init {
        observePreferences()
    }

    private fun observePreferences() {
        viewModelScope.launch {
            combine(
                userPreferencesManager.isOfflineModeFlow,
                kotlinx.coroutines.flow.flow {
                    emit(userPreferencesManager.getLastSyncTime())
                }
            ) { offlineMode, lastSync ->
                PrivacySettingsUiState(
                    isOfflineMode = offlineMode,
                    lastSyncTime = lastSync
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    fun updateOfflineMode(enabled: Boolean) {
        viewModelScope.launch {
            userPreferencesManager.setOfflineMode(enabled)
        }
    }

    fun clearLocalData() {
        viewModelScope.launch {
            userPreferencesManager.clearAll()
        }
    }
}
