package com.paymentsmaps.android.data.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.Github
import io.github.jan.supabase.gotrue.providers.Azure
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OAuth 社交登录管理器
 * 处理各种社交平台的 OAuth 登录流程
 */
@Singleton
class OAuthManager @Inject constructor(
    private val supabaseClient: SupabaseClient,
    @ApplicationContext private val context: Context
) {
    
    companion object {
        private const val REDIRECT_URL = "com.paymentsmaps.android://oauth/callback"
        private const val GOOGLE_CLIENT_ID = "your-google-client-id"
        private const val GITHUB_CLIENT_ID = "your-github-client-id"
        private const val MICROSOFT_CLIENT_ID = "your-microsoft-client-id"
    }
    
    /**
     * Google OAuth 登录
     */
    fun signInWithGoogle(): Flow<OAuthResult> = flow {
        emit(OAuthResult.Loading)
        try {
            val authUrl = supabaseClient.auth.getOAuthUrl(
                provider = Google,
                redirectUrl = REDIRECT_URL
            ) {
                queryParams["access_type"] = "offline"
                queryParams["prompt"] = "consent"
            }
            
            // 启动自定义标签页进行 OAuth 登录
            launchCustomTab(authUrl)
            emit(OAuthResult.RedirectStarted)
            
        } catch (e: Exception) {
            Timber.e(e, "Google OAuth initiation failed")
            emit(OAuthResult.Error(e.message ?: "Google 登录启动失败"))
        }
    }
    
    /**
     * GitHub OAuth 登录
     */
    fun signInWithGitHub(): Flow<OAuthResult> = flow {
        emit(OAuthResult.Loading)
        try {
            val authUrl = supabaseClient.auth.getOAuthUrl(
                provider = Github,
                redirectUrl = REDIRECT_URL
            ) {
                queryParams["scope"] = "user:email"
            }
            
            launchCustomTab(authUrl)
            emit(OAuthResult.RedirectStarted)
            
        } catch (e: Exception) {
            Timber.e(e, "GitHub OAuth initiation failed")
            emit(OAuthResult.Error(e.message ?: "GitHub 登录启动失败"))
        }
    }
    
    /**
     * Microsoft OAuth 登录
     */
    fun signInWithMicrosoft(): Flow<OAuthResult> = flow {
        emit(OAuthResult.Loading)
        try {
            val authUrl = supabaseClient.auth.getOAuthUrl(
                provider = Azure,
                redirectUrl = REDIRECT_URL
            ) {
                queryParams["scope"] = "openid profile email"
            }
            
            launchCustomTab(authUrl)
            emit(OAuthResult.RedirectStarted)
            
        } catch (e: Exception) {
            Timber.e(e, "Microsoft OAuth initiation failed")
            emit(OAuthResult.Error(e.message ?: "Microsoft 登录启动失败"))
        }
    }
    
    /**
     * 处理 OAuth 回调
     */
    suspend fun handleOAuthCallback(uri: Uri): OAuthResult {
        return try {
            // 从回调 URL 中提取授权码或访问令牌
            val code = uri.getQueryParameter("code")
            val error = uri.getQueryParameter("error")
            val errorDescription = uri.getQueryParameter("error_description")
            
            when {
                error != null -> {
                    Timber.w("OAuth callback error: $error - $errorDescription")
                    OAuthResult.Error(errorDescription ?: "OAuth 认证失败")
                }
                
                code != null -> {
                    // 使用授权码完成认证
                    supabaseClient.auth.exchangeCodeForSession(code)
                    val user = supabaseClient.auth.currentUserOrNull()
                    
                    if (user != null) {
                        Timber.d("OAuth login successful for user: ${user.email}")
                        OAuthResult.Success(user.id, user.email ?: "")
                    } else {
                        OAuthResult.Error("无法获取用户信息")
                    }
                }
                
                else -> {
                    OAuthResult.Error("无效的回调参数")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "OAuth callback handling failed")
            OAuthResult.Error(e.message ?: "OAuth 回调处理失败")
        }
    }
    
    /**
     * 启动自定义标签页
     */
    private fun launchCustomTab(url: String) {
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setStartAnimations(context, android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .setExitAnimations(context, android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .build()
            
            val intent = customTabsIntent.intent.apply {
                data = Uri.parse(url)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            context.startActivity(intent)
        } catch (e: Exception) {
            Timber.e(e, "Failed to launch custom tab")
            // 备用方案：使用系统浏览器
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
    
    /**
     * 检查是否为有效的 OAuth 回调 URL
     */
    fun isOAuthCallback(uri: Uri): Boolean {
        return uri.toString().startsWith(REDIRECT_URL)
    }
    
    /**
     * 获取支持的 OAuth 提供商列表
     */
    fun getSupportedProviders(): List<OAuthProvider> {
        return listOf(
            OAuthProvider.GOOGLE,
            OAuthProvider.GITHUB,
            OAuthProvider.MICROSOFT
        )
    }
}

/**
 * OAuth 结果密封类
 */
sealed class OAuthResult {
    object Loading : OAuthResult()
    object RedirectStarted : OAuthResult()
    data class Success(val userId: String, val email: String) : OAuthResult()
    data class Error(val message: String) : OAuthResult()
}

/**
 * OAuth 提供商枚举
 */
enum class OAuthProvider(val displayName: String, val iconRes: Int? = null) {
    GOOGLE("Google"),
    GITHUB("GitHub"),
    MICROSOFT("Microsoft"),
    LINKEDIN("LinkedIn"),
    TWITTER("Twitter"),
    FACEBOOK("Facebook")
}