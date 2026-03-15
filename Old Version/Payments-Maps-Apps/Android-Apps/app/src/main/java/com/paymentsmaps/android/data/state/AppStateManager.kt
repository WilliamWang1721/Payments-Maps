package com.paymentsmaps.android.data.state

import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import com.paymentsmaps.android.domain.model.User
import com.paymentsmaps.android.domain.usecase.UserManagementUseCase
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 应用状态管理器
 * 管理用户登录状态、应用生命周期状态等全局状态
 */
@Singleton
class AppStateManager @Inject constructor(
    private val userPreferencesManager: UserPreferencesManager,
    private val userManagementUseCase: UserManagementUseCase
) {
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _isOnline = MutableStateFlow(true)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()
    
    private val _lastSyncTime = MutableStateFlow(0L)
    val lastSyncTime: StateFlow<Long> = _lastSyncTime.asStateFlow()
    
    // 应用状态
    private val _appState = MutableStateFlow(AppState.INITIALIZING)
    val appState: StateFlow<AppState> = _appState.asStateFlow()
    
    // 登录状态流
    val isLoggedIn: StateFlow<Boolean> = userPreferencesManager.isLoggedInFlow
        .stateIn(
            scope = ProcessLifecycleOwner.get().lifecycleScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = false
        )
    
    init {
        // 监听登录状态变化
        ProcessLifecycleOwner.get().lifecycleScope.launch {
            isLoggedIn.collect { loggedIn ->
                if (loggedIn) {
                    loadCurrentUser()
                } else {
                    _currentUser.value = null
                    _appState.value = AppState.UNAUTHENTICATED
                }
            }
        }
        
        // 初始化应用状态
        initializeAppState()
    }
    
    /**
     * 初始化应用状态
     */
    private fun initializeAppState() {
        ProcessLifecycleOwner.get().lifecycleScope.launch {
            _appState.value = AppState.INITIALIZING
            
            try {
                // 检查是否首次运行
                val isFirstRun = userPreferencesManager.isFirstRunFlow.first()
                if (isFirstRun) {
                    _appState.value = AppState.FIRST_RUN
                    return@launch
                }
                
                // 检查引导是否完成
                val onboardingCompleted = userPreferencesManager.isOnboardingCompletedFlow.first()
                if (!onboardingCompleted) {
                    _appState.value = AppState.ONBOARDING
                    return@launch
                }
                
                // 检查登录状态
                val loggedIn = isLoggedIn.first()
                if (loggedIn) {
                    loadCurrentUser()
                } else {
                    _appState.value = AppState.UNAUTHENTICATED
                }
                
            } catch (e: Exception) {
                Timber.e(e, "Failed to initialize app state")
                _appState.value = AppState.ERROR
            }
        }
    }
    
    /**
     * 加载当前用户
     */
    private fun loadCurrentUser() {
        ProcessLifecycleOwner.get().lifecycleScope.launch {
            _isLoading.value = true
            
            userManagementUseCase.getCurrentUser().collect { result ->
                when (result) {
                    is Result.Success -> {
                        _currentUser.value = result.data
                        _appState.value = if (result.data != null) {
                            AppState.AUTHENTICATED
                        } else {
                            AppState.UNAUTHENTICATED
                        }
                        _isLoading.value = false
                    }
                    
                    is Result.Error -> {
                        Timber.e(result.exception, "Failed to load current user")
                        _currentUser.value = null
                        _appState.value = AppState.UNAUTHENTICATED
                        _isLoading.value = false
                    }
                    
                    is Result.Loading -> {
                        _isLoading.value = true
                    }
                }
            }
        }
    }
    
    /**
     * 用户登录成功
     */
    suspend fun onUserLoggedIn(userId: String, email: String, user: User? = null) {
        try {
            // 保存用户信息到偏好设置
            userPreferencesManager.saveUserInfo(
                userId = userId,
                email = email,
                name = user?.displayName,
                avatar = user?.avatar
            )
            
            // 更新当前用户
            _currentUser.value = user
            _appState.value = AppState.AUTHENTICATED
            
            // 更新同步时间
            userPreferencesManager.updateLastSyncTime()
            _lastSyncTime.value = System.currentTimeMillis()
            
            Timber.d("User logged in successfully: $email")
        } catch (e: Exception) {
            Timber.e(e, "Failed to handle user login")
        }
    }
    
    /**
     * 用户登出
     */
    suspend fun onUserLoggedOut() {
        try {
            // 清除用户信息
            userPreferencesManager.clearUserInfo()
            
            // 重置状态
            _currentUser.value = null
            _appState.value = AppState.UNAUTHENTICATED
            
            Timber.d("User logged out successfully")
        } catch (e: Exception) {
            Timber.e(e, "Failed to handle user logout")
        }
    }
    
    /**
     * 更新用户信息
     */
    fun updateCurrentUser(user: User) {
        _currentUser.value = user
        
        // 异步更新偏好设置
        ProcessLifecycleOwner.get().lifecycleScope.launch {
            try {
                userPreferencesManager.saveUserInfo(
                    userId = user.id,
                    email = user.email,
                    name = user.displayName,
                    avatar = user.avatar
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to update user preferences")
            }
        }
    }
    
    /**
     * 设置网络状态
     */
    fun setNetworkState(isOnline: Boolean) {
        _isOnline.value = isOnline
        
        // 在线时触发同步
        if (isOnline && _appState.value == AppState.AUTHENTICATED) {
            syncUserData()
        }
    }
    
    /**
     * 同步用户数据
     */
    private fun syncUserData() {
        ProcessLifecycleOwner.get().lifecycleScope.launch {
            try {
                // 重新加载用户信息
                loadCurrentUser()
                
                // 更新同步时间
                userPreferencesManager.updateLastSyncTime()
                _lastSyncTime.value = System.currentTimeMillis()
                
            } catch (e: Exception) {
                Timber.e(e, "Failed to sync user data")
            }
        }
    }
    
    /**
     * 标记首次运行完成
     */
    suspend fun completeFirstRun() {
        userPreferencesManager.markFirstRunCompleted()
        _appState.value = AppState.ONBOARDING
    }
    
    /**
     * 标记引导完成
     */
    suspend fun completeOnboarding() {
        userPreferencesManager.markOnboardingCompleted()
        
        // 检查登录状态决定下一步
        val loggedIn = isLoggedIn.first()
        _appState.value = if (loggedIn) {
            AppState.AUTHENTICATED
        } else {
            AppState.UNAUTHENTICATED
        }
    }
    
    /**
     * 重置应用状态
     */
    suspend fun resetAppState() {
        try {
            // 清除所有状态
            _currentUser.value = null
            _appState.value = AppState.INITIALIZING
            _isLoading.value = false
            _lastSyncTime.value = 0L
            
            // 清除偏好设置
            userPreferencesManager.clearAll()
            
            // 重新初始化
            initializeAppState()
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to reset app state")
            _appState.value = AppState.ERROR
        }
    }
    
    /**
     * 获取用户ID
     */
    suspend fun getCurrentUserId(): String? {
        return _currentUser.value?.id ?: userPreferencesManager.getUserId()
    }
    
    /**
     * 获取用户邮箱
     */
    suspend fun getCurrentUserEmail(): String? {
        return _currentUser.value?.email ?: userPreferencesManager.getUserEmail()
    }
}

/**
 * 应用状态枚举
 */
enum class AppState {
    INITIALIZING,    // 初始化中
    FIRST_RUN,       // 首次运行
    ONBOARDING,      // 引导阶段
    UNAUTHENTICATED, // 未认证
    AUTHENTICATED,   // 已认证
    ERROR            // 错误状态
}