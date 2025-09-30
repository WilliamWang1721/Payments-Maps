package com.paymentsmaps.android.data.remote

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage
import com.paymentsmaps.android.BuildConfig
import com.paymentsmaps.android.data.auth.OAuthManager
import dagger.hilt.android.qualifiers.ApplicationContext
import android.content.Context
import javax.inject.Singleton

/**
 * Supabase 依赖注入模块
 */
@Module
@InstallIn(SingletonComponent::class)
object SupabaseModule {
    
    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        return createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth) {
                // 配置认证选项
            }
            install(Postgrest) {
                // 配置数据库操作选项
            }
            install(Storage) {
                // 配置文件存储选项
            }
            install(Realtime) {
                // 配置实时订阅选项
            }
        }
    }
    
    @Provides
    @Singleton
    fun provideSupabaseAuth(supabaseClient: SupabaseClient): Auth {
        return supabaseClient.pluginManager.getPlugin(Auth)
    }
    
    @Provides
    @Singleton
    fun provideSupabasePostgrest(supabaseClient: SupabaseClient): Postgrest {
        return supabaseClient.pluginManager.getPlugin(Postgrest)
    }
    
    @Provides
    @Singleton
    fun provideSupabaseStorage(supabaseClient: SupabaseClient): Storage {
        return supabaseClient.pluginManager.getPlugin(Storage)
    }
    
    @Provides
    @Singleton
    fun provideSupabaseRealtime(supabaseClient: SupabaseClient): Realtime {
        return supabaseClient.pluginManager.getPlugin(Realtime)
    }
    
    @Provides
    @Singleton
    fun provideOAuthManager(
        supabaseClient: SupabaseClient,
        @ApplicationContext context: Context
    ): OAuthManager {
        return OAuthManager(supabaseClient, context)
    }
}