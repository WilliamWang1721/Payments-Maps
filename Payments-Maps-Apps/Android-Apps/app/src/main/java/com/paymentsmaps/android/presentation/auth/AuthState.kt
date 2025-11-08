package com.paymentsmaps.android.presentation.auth

/**
 * 认证状态密封类
 */
sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
    data class Error(val message: String) : AuthState()
    data class Message(val message: String, val isError: Boolean = false) : AuthState()
}
