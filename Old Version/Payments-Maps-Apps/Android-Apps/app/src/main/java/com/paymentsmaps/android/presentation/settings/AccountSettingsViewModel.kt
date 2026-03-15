package com.paymentsmaps.android.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import com.paymentsmaps.android.domain.model.User
import com.paymentsmaps.android.domain.usecase.UserManagementUseCase
import com.paymentsmaps.android.domain.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * 账户设置 UI 状态
 */
data class AccountSettingsUiState(
    val isLoading: Boolean = true,
    val user: User? = null,
    val error: String? = null,
    val biometricLogin: Boolean = false,
    val rememberDevice: Boolean = true,
    val twoFactorEnabled: Boolean = false,
    val autoLogoutMinutes: Int = 30,
    val statusMessage: String? = null
)

/**
 * 账户设置 ViewModel
 */
@HiltViewModel
class AccountSettingsViewModel @Inject constructor(
    private val userManagementUseCase: UserManagementUseCase,
    private val userPreferencesManager: UserPreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountSettingsUiState())
    val uiState: StateFlow<AccountSettingsUiState> = _uiState.asStateFlow()

    init {
        observeAccount()
    }

    private fun observeAccount() {
        viewModelScope.launch {
            // 监听安全设置
            val securityFlow = combine(
                userPreferencesManager.biometricLoginFlow,
                userPreferencesManager.rememberDeviceFlow,
                userPreferencesManager.twoFactorEnabledFlow,
                userPreferencesManager.autoLogoutMinutesFlow
            ) { biometric, remember, twoFactor, autoLogout ->
                Quadruple(biometric, remember, twoFactor, autoLogout)
            }

            combine(
                userManagementUseCase.getCurrentUser(),
                securityFlow
            ) { userResult, security ->
                Pair(userResult, security)
            }.collect { (userResult, security) ->
                val (biometric, rememberDevice, twoFactor, autoLogout) = security
                when (userResult) {
                    is Result.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            user = userResult.data,
                            error = null,
                            biometricLogin = biometric,
                            rememberDevice = rememberDevice,
                            twoFactorEnabled = twoFactor,
                            autoLogoutMinutes = autoLogout
                        )
                    }

                    is Result.Error -> {
                        Timber.e(userResult.exception, "Failed to load account info")
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = userResult.exception.message ?: "加载账户信息失败",
                            biometricLogin = biometric,
                            rememberDevice = rememberDevice,
                            twoFactorEnabled = twoFactor,
                            autoLogoutMinutes = autoLogout
                        )
                    }

                    is Result.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true)
                    }
                }
            }
        }
    }

    fun clearMessage() {
        if (_uiState.value.statusMessage != null) {
            _uiState.value = _uiState.value.copy(statusMessage = null)
        }
    }

    fun updateSecuritySettings(
        biometricLogin: Boolean? = null,
        rememberDevice: Boolean? = null,
        twoFactorEnabled: Boolean? = null,
        autoLogoutMinutes: Int? = null
    ) {
        val current = _uiState.value
        viewModelScope.launch {
            try {
                userPreferencesManager.saveAccountSecuritySettings(
                    biometricLogin = biometricLogin ?: current.biometricLogin,
                    rememberDevice = rememberDevice ?: current.rememberDevice,
                    twoFactorEnabled = twoFactorEnabled ?: current.twoFactorEnabled,
                    autoLogoutMinutes = autoLogoutMinutes ?: current.autoLogoutMinutes
                )
                _uiState.value = _uiState.value.copy(statusMessage = "账户安全设置已更新")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update security settings")
                _uiState.value = _uiState.value.copy(statusMessage = "更新安全设置失败")
            }
        }
    }

    private data class Quadruple<A, B, C, D>(
        val first: A,
        val second: B,
        val third: C,
        val fourth: D
    )
}
