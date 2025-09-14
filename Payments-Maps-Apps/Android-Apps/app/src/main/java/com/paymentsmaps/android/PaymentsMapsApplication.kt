package com.paymentsmaps.android

import android.app.Application
import com.amap.api.maps.MapsInitializer
import dagger.hilt.android.HiltAndroidApp

/**
 * 应用程序类
 * 
 * 使用@HiltAndroidApp注解启用Hilt依赖注入
 * 这是Hilt依赖注入框架的入口点
 */
@HiltAndroidApp
class PaymentsMapsApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // 在这里可以添加应用级别的初始化逻辑
        // 例如：
        // - 初始化日志框架
        // - 设置全局异常处理
        // - 初始化第三方SDK
        // - 配置网络库
        
        initializeApp()
    }
    
    /**
     * 初始化应用
     */
    private fun initializeApp() {
        // 初始化高德地图隐私合规
        initAmapPrivacy()
        
        // TODO: 添加其他应用初始化逻辑
        // 例如：
        // - 初始化Supabase配置
        // - 设置默认语言
        // - 初始化崩溃报告
        // - 配置网络请求超时等
    }
    
    /**
     * 初始化高德地图隐私合规设置
     */
    private fun initAmapPrivacy() {
        try {
            // 在模拟器中跳过Amap初始化，避免OpenGL崩溃
            if (com.paymentsmaps.android.utils.EmulatorDetector.isEmulator()) {
                android.util.Log.d("PaymentsMapsApp", "跳过模拟器中的Amap初始化")
                return
            }
            
            // 设置隐私权政策是否弹窗告知用户
            MapsInitializer.updatePrivacyShow(this, true, true)
            // 设置隐私权政策是否取得用户同意
            MapsInitializer.updatePrivacyAgree(this, true)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}