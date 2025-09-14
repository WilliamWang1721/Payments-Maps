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
            try {
                _authState.value = AuthState.Loading
                
                // TODO: 实现Google OAuth登录
                // 这里需要配置Google OAuth客户端ID和重定向URI
                supabaseClient.auth.signInWith(Google)
                
                _authState.value = AuthState.Authenticated
            } catch (e: Exception) {
                _authState.value = AuthState.Error("Google登录暂时不可用: ${e.message}")
            }
        }
    }
    
    /**
     * GitHub 登录
     */
    fun signInWithGitHub() {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                
                // TODO: 实现GitHub OAuth登录
                supabaseClient.auth.signInWith(GitHub)
                
                _authState.value = AuthState.Authenticated
            } catch (e: Exception) {
                _authState.value = AuthState.Error("GitHub登录暂时不可用: ${e.message}")
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
}