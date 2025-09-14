package com.paymentsmaps.android.presentation.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.GitHub
import io.github.jan.supabase.gotrue.providers.Microsoft
import com.paymentsmaps.android.data.auth.OAuthManager
import com.paymentsmaps.android.data.auth.OAuthResult
import timber.log.Timber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 认证ViewModel - 管理用户认证状态和操作
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val oAuthManager: OAuthManager,
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()
    
    init {
        checkAuthState()
    }
    
    /**
     * 检查当前认证状态
     */
    private fun checkAuthState() {
        viewModelScope.launch {
            try {
                val session = supabaseClient.auth.currentSessionOrNull()
                _authState.value = if (session != null) {
                    AuthState.Authenticated
                } else {
                    AuthState.Unauthenticated
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }
    
    /**
     * 邮箱登录
     */
    fun signIn(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("邮箱和密码不能为空")
            return
        }
        
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                
                supabaseClient.auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                
                _authState.value = AuthState.Authenticated
            } catch (e: Exception) {
                _authState.value = AuthState.Error(
                    when {
                        e.message?.contains("Invalid login credentials") == true -> "邮箱或密码错误"
                        e.message?.contains("Email not confirmed") == true -> "请先验证您的邮箱地址"
                        e.message?.contains("Too many requests") == true -> "请求过于频繁，请稍后重试"
                        else -> "登录失败: ${e.message ?: "未知错误"}"
                    }
                )
            }
        }
    }
    
    /**
     * 邮箱注册
     */
    fun signUp(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("邮箱和密码不能为空")
            return
        }
        
        if (password.length < 6) {
            _authState.value = AuthState.Error("密码至少需要6个字符")
            return
        }
        
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                
                supabaseClient.auth.signUpWith(Email) {
                    this.email = email
                    this.password = password
                }
                
                _authState.value = AuthState.Error("注册成功！请检查您的邮箱并点击验证链接")
            } catch (e: Exception) {
                _authState.value = AuthState.Error(
                    when {
                        e.message?.contains("User already registered") == true -> "该邮箱已被注册"
                        e.message?.contains("Password should be at least") == true -> "密码不符合要求"
                        e.message?.contains("Invalid email") == true -> "邮箱格式不正确"
                        else -> "注册失败: ${e.message ?: "未知错误"}"
                    }
                )
            }
        }
    }
    
    /**
     * Google 登录
     */
    fun signInWithGoogle() {
        viewModelScope.launch {
            oAuthManager.signInWithGoogle().collect { result ->
                when (result) {
                    is OAuthResult.Loading -> {
                        _authState.value = AuthState.Loading
                    }
                    
                    is OAuthResult.RedirectStarted -> {
                        // 已启动浏览器重定向，等待回调
                        Timber.d("Google OAuth redirect started")
                    }
                    
                    is OAuthResult.Success -> {
                        _authState.value = AuthState.Authenticated
                    }
                    
                    is OAuthResult.Error -> {
                        _authState.value = AuthState.Error(result.message)
                    }
                }
            }
        }
    }
    
    /**
     * GitHub 登录
     */
    fun signInWithGitHub() {
        viewModelScope.launch {
            oAuthManager.signInWithGitHub().collect { result ->
                when (result) {
                    is OAuthResult.Loading -> {
                        _authState.value = AuthState.Loading
                    }
                    
                    is OAuthResult.RedirectStarted -> {
                        // 已启动浏览器重定向，等待回调
                        Timber.d("GitHub OAuth redirect started")
                    }
                    
                    is OAuthResult.Success -> {
                        _authState.value = AuthState.Authenticated
                    }
                    
                    is OAuthResult.Error -> {
                        _authState.value = AuthState.Error(result.message)
                    }
                }
            }
        }
    }
    
    /**
     * Microsoft 登录
     */
    fun signInWithMicrosoft() {
        viewModelScope.launch {
            oAuthManager.signInWithMicrosoft().collect { result ->
                when (result) {
                    is OAuthResult.Loading -> {
                        _authState.value = AuthState.Loading
                    }
                    
                    is OAuthResult.RedirectStarted -> {
                        // 已启动浏览器重定向，等待回调
                        Timber.d("Microsoft OAuth redirect started")
                    }
                    
                    is OAuthResult.Success -> {
                        _authState.value = AuthState.Authenticated
                    }
                    
                    is OAuthResult.Error -> {
                        _authState.value = AuthState.Error(result.message)
                    }
                }
            }
        }
    }
    
    /**
     * 退出登录
     */
    fun signOut() {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                supabaseClient.auth.signOut()
                _authState.value = AuthState.Unauthenticated
            } catch (e: Exception) {
                _authState.value = AuthState.Error("退出登录失败: ${e.message}")
            }
        }
    }
    
    /**
     * 重置密码
     */
    fun resetPassword(email: String) {
        if (email.isBlank()) {
            _authState.value = AuthState.Error("请输入邮箱地址")
            return
        }
        
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                
                supabaseClient.auth.resetPasswordForEmail(email)
                
                _authState.value = AuthState.Error("密码重置邮件已发送，请检查您的邮箱")
            } catch (e: Exception) {
                _authState.value = AuthState.Error("发送重置邮件失败: ${e.message}")
            }
        }
    }
    
    /**
     * 显示错误信息
     */
    fun showError(message: String) {
        _authState.value = AuthState.Error(message)
    }
    
    /**
     * 清除错误状态
     */
    fun clearError() {
        if (_authState.value is AuthState.Error) {
            _authState.value = AuthState.Idle
        }
    }
    
    /**
     * 获取当前用户
     */
    fun getCurrentUser() = supabaseClient.auth.currentUserOrNull()
    
    /**
     * OAuth 登录成功回调
     */
    fun onOAuthSuccess(userId: String, email: String) {
        viewModelScope.launch {
            try {
                // 验证用户会话
                val session = supabaseClient.auth.currentSessionOrNull()
                if (session != null) {
                    _authState.value = AuthState.Authenticated
                    Timber.d("OAuth login completed successfully for: $email")
                } else {
                    _authState.value = AuthState.Error("OAuth 登录验证失败")
                }
            } catch (e: Exception) {
                Timber.e(e, "OAuth success callback failed")
                _authState.value = AuthState.Error("OAuth 登录处理失败: ${e.message}")
            }
        }
    }
    
    /**
     * 获取支持的 OAuth 提供商
     */
    fun getSupportedOAuthProviders() = oAuthManager.getSupportedProviders()
}