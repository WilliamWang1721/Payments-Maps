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
    
    /**
     * 加载用户信息用于编辑
     */
    fun loadUserForEdit() {
        viewModelScope.launch {
            _uiState.value = EditProfileUiState.Loading
            
            userManagementUseCase.getCurrentUser().collect { result ->
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
                _uiState.value = EditProfileUiState.Error("保存失败: ${e.message}")\n            }\n        }\n    }\n    \n    /**\n     * 更新用户资料\n     */\n    private fun updateUserProfile(\n        userId: String,\n        profile: UserProfile,\n        preferences: UserPreferences\n    ) {\n        viewModelScope.launch {\n            try {\n                // 更新用户资料\n                userManagementUseCase.updateUserProfile(userId, profile).collect { profileResult ->\n                    when (profileResult) {\n                        is Result.Success -> {\n                            // 资料更新成功，继续更新偏好设置\n                            updateUserPreferences(userId, preferences)\n                        }\n                        \n                        is Result.Error -> {\n                            Timber.e(profileResult.exception, \"Failed to update profile\")\n                            _uiState.value = EditProfileUiState.Error(\n                                profileResult.exception.message ?: \"更新个人资料失败\"\n                            )\n                        }\n                        \n                        is Result.Loading -> {\n                            // 保持加载状态\n                        }\n                    }\n                }\n            } catch (e: Exception) {\n                Timber.e(e, \"Failed to update user profile\")\n                _uiState.value = EditProfileUiState.Error(\"更新个人资料失败: ${e.message}\")\n            }\n        }\n    }\n    \n    /**\n     * 更新用户偏好设置\n     */\n    private fun updateUserPreferences(userId: String, preferences: UserPreferences) {\n        viewModelScope.launch {\n            try {\n                userManagementUseCase.updateUserPreferences(userId, preferences).collect { preferencesResult ->\n                    when (preferencesResult) {\n                        is Result.Success -> {\n                            // 全部更新成功\n                            _uiState.value = EditProfileUiState.SaveSuccess\n                        }\n                        \n                        is Result.Error -> {\n                            Timber.e(preferencesResult.exception, \"Failed to update preferences\")\n                            _uiState.value = EditProfileUiState.Error(\n                                preferencesResult.exception.message ?: \"更新偏好设置失败\"\n                            )\n                        }\n                        \n                        is Result.Loading -> {\n                            // 保持加载状态\n                        }\n                    }\n                }\n            } catch (e: Exception) {\n                Timber.e(e, \"Failed to update user preferences\")\n                _uiState.value = EditProfileUiState.Error(\"更新偏好设置失败: ${e.message}\")\n            }\n        }\n    }\n    \n    /**\n     * 清除错误状态\n     */\n    fun clearError() {\n        if (_uiState.value is EditProfileUiState.Error) {\n            currentUser?.let { user ->\n                _uiState.value = EditProfileUiState.Success(user)\n            } ?: run {\n                _uiState.value = EditProfileUiState.Initial\n            }\n        }\n    }\n}