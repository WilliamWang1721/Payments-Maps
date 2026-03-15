package com.paymentsmaps.android.presentation.auth

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import com.paymentsmaps.android.data.auth.OAuthManager
import com.paymentsmaps.android.data.auth.OAuthResult
import com.paymentsmaps.android.presentation.theme.PaymentsMapsTheme
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * OAuth 回调处理 Activity
 * 处理从社交登录提供商返回的回调
 */
@AndroidEntryPoint
class OAuthCallbackActivity : ComponentActivity() {
    
    @Inject
    lateinit var oAuthManager: OAuthManager
    
    private val authViewModel: AuthViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            PaymentsMapsTheme {
                OAuthCallbackScreen(
                    onResult = { success ->
                        if (success) {
                            // 登录成功，跳转到主页面
                            navigateToMain()
                        } else {
                            // 登录失败，返回登录页面
                            navigateToLogin()
                        }
                    }
                )
            }
        }
        
        // 处理 OAuth 回调
        handleOAuthCallback()
    }
    
    /**
     * 处理 OAuth 回调
     */
    private fun handleOAuthCallback() {
        val uri = intent.data
        if (uri != null && oAuthManager.isOAuthCallback(uri)) {
            lifecycleScope.launch {
                try {
                    val result = oAuthManager.handleOAuthCallback(uri)
                    when (result) {
                        is OAuthResult.Success -> {
                            Timber.d("OAuth callback successful: ${result.email}")
                            // 通知 AuthViewModel 认证成功
                            authViewModel.onOAuthSuccess(result.userId, result.email)
                            navigateToMain()
                        }
                        
                        is OAuthResult.Error -> {
                            Timber.e("OAuth callback error: ${result.message}")
                            authViewModel.showError(result.message)
                            navigateToLogin()
                        }
                        
                        else -> {
                            Timber.w("Unexpected OAuth result: $result")
                            navigateToLogin()
                        }
                    }
                } catch (e: Exception) {
                    Timber.e(e, "Failed to handle OAuth callback")
                    authViewModel.showError("登录处理失败: ${e.message}")
                    navigateToLogin()
                }
            }
        } else {
            Timber.w("Invalid OAuth callback URI: $uri")
            navigateToLogin()
        }
    }
    
    /**
     * 跳转到主页面
     */
    private fun navigateToMain() {
        // 这里应该跳转到实际的主 Activity
        finish()
    }
    
    /**
     * 返回登录页面
     */
    private fun navigateToLogin() {
        // 这里应该返回到登录页面或关闭当前Activity
        finish()
    }
}

/**
 * OAuth 回调处理界面
 */
@Composable
private fun OAuthCallbackScreen(
    onResult: (Boolean) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(64.dp),
            color = MaterialTheme.colorScheme.primary,
            strokeWidth = 4.dp
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "正在处理登录信息...",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "请稍候，我们正在验证您的身份",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}