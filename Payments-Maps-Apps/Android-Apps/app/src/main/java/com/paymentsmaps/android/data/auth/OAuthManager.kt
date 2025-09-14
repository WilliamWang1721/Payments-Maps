package com.paymentsmaps.android.data.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.GitHub
import io.github.jan.supabase.gotrue.providers.Microsoft
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
                provider = GitHub,
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
        try {\n            val authUrl = supabaseClient.auth.getOAuthUrl(\n                provider = Microsoft,\n                redirectUrl = REDIRECT_URL\n            ) {\n                queryParams[\"scope\"] = \"openid profile email\"\n            }\n            \n            launchCustomTab(authUrl)\n            emit(OAuthResult.RedirectStarted)\n            \n        } catch (e: Exception) {\n            Timber.e(e, \"Microsoft OAuth initiation failed\")\n            emit(OAuthResult.Error(e.message ?: \"Microsoft 登录启动失败\"))\n        }\n    }\n    \n    /**\n     * 处理 OAuth 回调\n     */\n    suspend fun handleOAuthCallback(uri: Uri): OAuthResult {\n        return try {\n            // 从回调 URL 中提取授权码或访问令牌\n            val code = uri.getQueryParameter(\"code\")\n            val error = uri.getQueryParameter(\"error\")\n            val errorDescription = uri.getQueryParameter(\"error_description\")\n            \n            when {\n                error != null -> {\n                    Timber.w(\"OAuth callback error: $error - $errorDescription\")\n                    OAuthResult.Error(errorDescription ?: \"OAuth 认证失败\")\n                }\n                \n                code != null -> {\n                    // 使用授权码完成认证\n                    supabaseClient.auth.exchangeCodeForSession(code)\n                    val user = supabaseClient.auth.currentUserOrNull()\n                    \n                    if (user != null) {\n                        Timber.d(\"OAuth login successful for user: ${user.email}\")\n                        OAuthResult.Success(user.id, user.email ?: \"\")\n                    } else {\n                        OAuthResult.Error(\"无法获取用户信息\")\n                    }\n                }\n                \n                else -> {\n                    OAuthResult.Error(\"无效的回调参数\")\n                }\n            }\n        } catch (e: Exception) {\n            Timber.e(e, \"OAuth callback handling failed\")\n            OAuthResult.Error(e.message ?: \"OAuth 回调处理失败\")\n        }\n    }\n    \n    /**\n     * 启动自定义标签页\n     */\n    private fun launchCustomTab(url: String) {\n        try {\n            val customTabsIntent = CustomTabsIntent.Builder()\n                .setShowTitle(true)\n                .setStartAnimations(context, android.R.anim.slide_in_left, android.R.anim.slide_out_right)\n                .setExitAnimations(context, android.R.anim.slide_in_left, android.R.anim.slide_out_right)\n                .build()\n            \n            val intent = customTabsIntent.intent.apply {\n                data = Uri.parse(url)\n                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)\n            }\n            \n            context.startActivity(intent)\n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to launch custom tab\")\n            // 备用方案：使用系统浏览器\n            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {\n                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)\n            }\n            context.startActivity(intent)\n        }\n    }\n    \n    /**\n     * 检查是否为有效的 OAuth 回调 URL\n     */\n    fun isOAuthCallback(uri: Uri): Boolean {\n        return uri.toString().startsWith(REDIRECT_URL)\n    }\n    \n    /**\n     * 获取支持的 OAuth 提供商列表\n     */\n    fun getSupportedProviders(): List<OAuthProvider> {\n        return listOf(\n            OAuthProvider.GOOGLE,\n            OAuthProvider.GITHUB,\n            OAuthProvider.MICROSOFT\n        )\n    }\n}\n\n/**\n * OAuth 结果密封类\n */\nsealed class OAuthResult {\n    object Loading : OAuthResult()\n    object RedirectStarted : OAuthResult()\n    data class Success(val userId: String, val email: String) : OAuthResult()\n    data class Error(val message: String) : OAuthResult()\n}\n\n/**\n * OAuth 提供商枚举\n */\nenum class OAuthProvider(val displayName: String, val iconRes: Int? = null) {\n    GOOGLE(\"Google\"),\n    GITHUB(\"GitHub\"),\n    MICROSOFT(\"Microsoft\"),\n    LINKEDIN(\"LinkedIn\"),\n    TWITTER(\"Twitter\"),\n    FACEBOOK(\"Facebook\")\n}