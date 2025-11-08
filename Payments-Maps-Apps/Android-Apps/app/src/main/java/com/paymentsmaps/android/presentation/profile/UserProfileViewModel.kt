package com.paymentsmaps.android.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import com.paymentsmaps.android.domain.model.User
import com.paymentsmaps.android.domain.usecase.UserManagementUseCase
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import timber.log.Timber
import javax.inject.Inject

/**
 * 用户个人资料页面的 UI 状态
 */
sealed class UserProfileUiState {
    object Initial : UserProfileUiState()
    object Loading : UserProfileUiState()
    data class Success(val user: User) : UserProfileUiState()
    data class Error(val message: String) : UserProfileUiState()
}

/**
 * 用户个人资料 ViewModel
 */
@HiltViewModel
class UserProfileViewModel @Inject constructor(
    private val userManagementUseCase: UserManagementUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<UserProfileUiState>(UserProfileUiState.Initial)
    val uiState: StateFlow<UserProfileUiState> = _uiState.asStateFlow()
    
    private var loadJob: Job? = null
    private var requestedUserId: String? = null
    
    /**
     * 加载用户个人资料
     */
    fun loadUserProfile(userId: String? = null) {
        requestedUserId = userId
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _uiState.value = UserProfileUiState.Loading
            
            val userFlow = if (userId.isNullOrBlank()) {
                userManagementUseCase.getCurrentUser()
            } else {
                userManagementUseCase.getUserById(userId)
            }
            
            userFlow.collect { result ->
                when (result) {
                    is Result.Success -> {
                        if (result.data != null) {
                            _uiState.value = UserProfileUiState.Success(result.data)
                        } else {
                            _uiState.value = UserProfileUiState.Error("用户信息不存在")
                        }
                    }
                    
                    is Result.Error -> {
                        Timber.e(result.exception, "Failed to load user profile")
                        _uiState.value = UserProfileUiState.Error(
                            result.exception.message ?: "加载用户信息失败"
                        )
                    }
                    
                    is Result.Loading -> {
                        _uiState.value = UserProfileUiState.Loading
                    }
                }
            }
        }
    }
    
    /**
     * 刷新用户资料
     */
    fun refreshProfile() {
        loadUserProfile(requestedUserId)
    }
}
