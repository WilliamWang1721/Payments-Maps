package com.paymentsmaps.android.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import javax.inject.Singleton

/**
 * DataStore 依赖注入模块
 */
@Module
@InstallIn(SingletonComponent::class)
object DataStoreModule {
    
    private const val USER_PREFERENCES_NAME = "user_preferences"
    
    // 扩展属性创建 DataStore
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
        name = USER_PREFERENCES_NAME
    )
    
    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.dataStore
    }
    
    @Provides
    @Singleton
    fun provideUserPreferencesManager(
        dataStore: DataStore<Preferences>
    ): UserPreferencesManager {
        return UserPreferencesManager(dataStore)
    }
}