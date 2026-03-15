package com.paymentsmaps.android.di

import com.paymentsmaps.android.data.remote.SupabaseConfig
import com.paymentsmaps.android.data.repository.POSRepositoryImpl
import com.paymentsmaps.android.data.repository.UserRepositoryImpl
import com.paymentsmaps.android.domain.repository.POSRepository
import com.paymentsmaps.android.domain.repository.UserRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * 数据层依赖注入模块
 * 提供仓库实现、网络配置等依赖
 */
@Module
@InstallIn(SingletonComponent::class)
object DataModule {
    
    /**
     * 提供Supabase配置实例
     */
    @Provides
    @Singleton
    fun provideSupabaseConfig(): SupabaseConfig {
        return SupabaseConfig
    }
    
    /**
     * 提供POS机仓库实现
     */
    @Provides
    @Singleton
    fun providePOSRepository(
        supabaseConfig: SupabaseConfig
    ): POSRepository {
        return POSRepositoryImpl(supabaseConfig)
    }
    
    /**
     * 提供用户仓库实现
     */
    @Provides
    @Singleton
    fun provideUserRepository(
        supabaseConfig: SupabaseConfig
    ): UserRepository {
        return UserRepositoryImpl(supabaseConfig)
    }
}