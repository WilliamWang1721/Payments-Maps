package com.paymentsmaps.android.presentation.usercenter

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.data.state.AppState
import com.paymentsmaps.android.data.state.AppStateManager
import com.paymentsmaps.android.domain.model.ThemeMode
import com.paymentsmaps.android.domain.model.User
import com.paymentsmaps.android.domain.usecase.UserManagementUseCase
import com.paymentsmaps.android.domain.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 用户中心数据概览
 */
data class UserCenterInsights(
    val permissionCount: Int = 0,
    val canManagePOS: Boolean = false,
    val verifiedEmail: Boolean = false,
    val verifiedPhone: Boolean = false,
    val preferredLanguage: String = "zh-CN",
    val themeMode: ThemeMode = ThemeMode.SYSTEM
)

/**
 * 用户中心 UI 状态
 */
data class UserCenterUiState(
    val isLoading: Boolean = true,
    val isLoggedIn: Boolean = false,
    val appState: AppState = AppState.INITIALIZING,
    val user: User? = null,
    val insights: UserCenterInsights = UserCenterInsights()
)

/**
 * 用户中心 ViewModel
 */
@HiltViewModel
class UserCenterViewModel @Inject constructor(
    private val appStateManager: AppStateManager,
    private val userManagementUseCase: UserManagementUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(UserCenterUiState())
    val uiState: StateFlow<UserCenterUiState> = _uiState.asStateFlow()

    init {
        observeAppState()
    }

    private fun observeAppState() {
        viewModelScope.launch {
            combine(
                appStateManager.currentUser,
                appStateManager.isLoading,
                appStateManager.isLoggedIn,
                appStateManager.appState
            ) { user, isLoading, isLoggedIn, appState ->
                UserCenterUiState(
                    isLoading = isLoading,
                    isLoggedIn = isLoggedIn,
                    appState = appState,
                    user = user,
                    insights = buildInsights(user)
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    private fun buildInsights(user: User?): UserCenterInsights {
        if (user == null) return UserCenterInsights()
        return UserCenterInsights(
            permissionCount = user.permissions.size,
            canManagePOS = user.canManagePOS,
            verifiedEmail = user.isVerified,
            verifiedPhone = user.isPhoneVerified,
            preferredLanguage = user.preferences.language,
            themeMode = user.preferences.theme
        )
    }

    /**
     * 手动刷新用户信息
     */
    fun refreshUser() {
        viewModelScope.launch {
            userManagementUseCase.getCurrentUser().collect { result ->
                when (result) {
                    is Result.Success -> {
                        val user = result.data
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            user = user,
                            insights = buildInsights(user)
                        )
                    }

                    is Result.Error -> {
                        _uiState.value = _uiState.value.copy(isLoading = false)
                    }

                    is Result.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true)
                    }
                }
            }
        }
    }
}
