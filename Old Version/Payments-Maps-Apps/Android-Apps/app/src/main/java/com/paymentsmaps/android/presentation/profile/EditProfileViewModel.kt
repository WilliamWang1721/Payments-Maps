package com.paymentsmaps.android.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import com.paymentsmaps.android.domain.model.User
import com.paymentsmaps.android.domain.model.UserProfile
import com.paymentsmaps.android.domain.model.UserPreferences
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
 * 编辑用户资料的 UI 状态
 */
sealed class EditProfileUiState {
    object Initial : EditProfileUiState()
    object Loading : EditProfileUiState()
    data class Success(val user: User) : EditProfileUiState()
    data class Error(val message: String) : EditProfileUiState()
    object SaveSuccess : EditProfileUiState()
}

/**
 * 编辑用户资料 ViewModel
 */
@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val userManagementUseCase: UserManagementUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<EditProfileUiState>(EditProfileUiState.Initial)
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()
    
    private var currentUser: User? = null
    private var loadJob: Job? = null
    private var requestedUserId: String? = null
    
    /**
     * 加载用户信息用于编辑
     */
    fun loadUserForEdit(userId: String? = null) {
        requestedUserId = userId
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _uiState.value = EditProfileUiState.Loading
            
            val userFlow = if (userId.isNullOrBlank()) {
                userManagementUseCase.getCurrentUser()
            } else {
                userManagementUseCase.getUserById(userId)
            }
            
            userFlow.collect { result ->
                when (result) {
                    is Result.Success -> {
                        if (result.data != null) {
                            currentUser = result.data
                            _uiState.value = EditProfileUiState.Success(result.data)
                        } else {
                            _uiState.value = EditProfileUiState.Error("用户信息不存在")
                        }
                    }
                    
                    is Result.Error -> {
                        Timber.e(result.exception, "Failed to load user for edit")
                        _uiState.value = EditProfileUiState.Error(
                            result.exception.message ?: "加载用户信息失败"
                        )
                    }
                    
                    is Result.Loading -> {
                        _uiState.value = EditProfileUiState.Loading
                    }
                }
            }
        }
    }
    
    /**
     * 保存用户资料
     */
    fun saveProfile(
        updatedUser: User,
        updatedProfile: UserProfile,
        updatedPreferences: UserPreferences
    ) {
        viewModelScope.launch {
            _uiState.value = EditProfileUiState.Loading
            
            try {
                // 更新用户基本信息
                userManagementUseCase.updateUser(updatedUser).collect { userResult ->
                    when (userResult) {
                        is Result.Success -> {
                            // 用户信息更新成功，继续更新资料
                            updateUserProfile(updatedUser.id, updatedProfile, updatedPreferences)
                        }
                        
                        is Result.Error -> {
                            Timber.e(userResult.exception, "Failed to update user")
                            _uiState.value = EditProfileUiState.Error(
                                userResult.exception.message ?: "更新用户信息失败"
                            )
                        }
                        
                        is Result.Loading -> {
                            // 保持加载状态
                        }
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to save profile")
                _uiState.value = EditProfileUiState.Error("保存失败: ${e.message}")
            }
        }
    }
    
    /**
     * 更新用户资料
     */
    private fun updateUserProfile(
        userId: String,
        profile: UserProfile,
        preferences: UserPreferences
    ) {
        viewModelScope.launch {
            try {
                // 更新用户资料
                userManagementUseCase.updateUserProfile(userId, profile).collect { profileResult ->
                    when (profileResult) {
                        is Result.Success -> {
                            // 资料更新成功，继续更新偏好设置
                            updateUserPreferences(userId, preferences)
                        }
                        
                        is Result.Error -> {
                            Timber.e(profileResult.exception, "Failed to update profile")
                            _uiState.value = EditProfileUiState.Error(
                                profileResult.exception.message ?: "更新个人资料失败"
                            )
                        }
                        
                        is Result.Loading -> {
                            // 保持加载状态
                        }
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to update user profile")
                _uiState.value = EditProfileUiState.Error("更新个人资料失败: ${e.message}")
            }
        }
    }
    
    /**
     * 更新用户偏好设置
     */
    private fun updateUserPreferences(userId: String, preferences: UserPreferences) {
        viewModelScope.launch {
            try {
                userManagementUseCase.updateUserPreferences(userId, preferences).collect { preferencesResult ->
                    when (preferencesResult) {
                        is Result.Success -> {
                            // 全部更新成功
                            _uiState.value = EditProfileUiState.SaveSuccess
                        }
                        
                        is Result.Error -> {
                            Timber.e(preferencesResult.exception, "Failed to update preferences")
                            _uiState.value = EditProfileUiState.Error(
                                preferencesResult.exception.message ?: "更新偏好设置失败"
                            )
                        }
                        
                        is Result.Loading -> {
                            // 保持加载状态
                        }
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to update user preferences")
                _uiState.value = EditProfileUiState.Error("更新偏好设置失败: ${e.message}")
            }
        }
    }
    
    /**
     * 清除错误状态
     */
    fun clearError() {
        if (_uiState.value is EditProfileUiState.Error) {
            currentUser?.let { user ->
                _uiState.value = EditProfileUiState.Success(user)
            } ?: run {
                _uiState.value = EditProfileUiState.Initial
            }
        }
    }
}
