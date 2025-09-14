package com.paymentsmaps.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import dagger.hilt.android.AndroidEntryPoint
import com.paymentsmaps.android.presentation.navigation.AppNavigation
import com.paymentsmaps.android.presentation.theme.PaymentsMapsTheme

/**
 * 应用主Activity
 * 
 * 作为应用的入口点，负责：
 * 1. 初始化Hilt依赖注入
 * 2. 设置Material 3 Expressive主题
 * 3. 启动主导航组件
 * 4. 处理启动屏幕
 * 5. 启用边到边显示
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // 安装启动屏幕
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        
        // 启用边到边显示
        enableEdgeToEdge()
        
        // 设置启动屏幕保持条件
        splashScreen.setKeepOnScreenCondition {
            // 可以在这里添加应用初始化逻辑
            // 例如检查用户认证状态、加载必要数据等
            false
        }
        
        setContent {
            PaymentsMapsTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}