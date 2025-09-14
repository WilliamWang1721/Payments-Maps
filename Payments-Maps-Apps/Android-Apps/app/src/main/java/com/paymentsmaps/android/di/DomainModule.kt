package com.paymentsmaps.android.di

import com.paymentsmaps.android.domain.repository.POSRepository
import com.paymentsmaps.android.domain.repository.UserRepository
import com.paymentsmaps.android.domain.usecase.AuthenticationUseCase
import com.paymentsmaps.android.domain.usecase.ManagePOSMachinesUseCase
import com.paymentsmaps.android.domain.usecase.UserManagementUseCase
import com.paymentsmaps.android.domain.usecase.pos.GetPOSMachinesUseCase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * 领域层依赖注入模块
 * 提供用例实现等依赖
 */
@Module
@InstallIn(SingletonComponent::class)
object DomainModule {
    
    /**
     * 提供获取POS机用例
     */
    @Provides
    @Singleton
    fun provideGetPOSMachinesUseCase(
        posRepository: POSRepository
    ): GetPOSMachinesUseCase {
        return GetPOSMachinesUseCase(posRepository)
    }
    
    /**
     * 提供管理POS机用例
     */
    @Provides
    @Singleton
    fun provideManagePOSMachinesUseCase(
        posRepository: POSRepository
    ): ManagePOSMachinesUseCase {
        return ManagePOSMachinesUseCase(posRepository)
    }
    
    /**
     * 提供用户认证用例
     */
    @Provides
    @Singleton
    fun provideAuthenticationUseCase(
        userRepository: UserRepository
    ): AuthenticationUseCase {
        return AuthenticationUseCase(userRepository)
    }
    
    /**
     * 提供用户管理用例
     */
    @Provides
    @Singleton
    fun provideUserManagementUseCase(
        userRepository: UserRepository
    ): UserManagementUseCase {
        return UserManagementUseCase(userRepository)
    }
}