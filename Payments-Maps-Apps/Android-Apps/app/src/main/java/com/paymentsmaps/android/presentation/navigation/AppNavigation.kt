package com.paymentsmaps.android.presentation.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.paymentsmaps.android.presentation.map.MapScreen

/**
 * 应用主导航组件
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    
    Scaffold(
        bottomBar = {
            if (shouldShowBottomBar(currentRoute)) {
                BottomNavigationBar(
                    navController = navController,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            // 避免重复导航到同一页面
                            launchSingleTop = true
                            // 恢复状态
                            restoreState = true
                            // 清除回退栈到起始目标
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                        }
                    }
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = NavigationRoutes.MAP,
            modifier = Modifier.padding(paddingValues)
        ) {
            // 地图主页
            composable(NavigationRoutes.MAP) {
                MapScreen(
                    onNavigateToMerchant = { merchantId ->
                        navController.navigate(
                            NavigationRoutes.Builder.merchantDetail(merchantId)
                        )
                    },
                    onNavigateToSettings = {
                        navController.navigate(NavigationRoutes.SETTINGS)
                    }
                )
            }
            
            // 商户管理页面
            composable(NavigationRoutes.MERCHANT_MANAGEMENT) {
                MerchantManagementScreen(
                    onNavigateToMerchantDetail = { merchantId ->
                        navController.navigate(
                            NavigationRoutes.Builder.merchantDetail(merchantId)
                        )
                    },
                    onNavigateToAddMerchant = {
                        navController.navigate(NavigationRoutes.ADD_MERCHANT)
                    },
                    onNavigateToEditMerchant = { merchantId ->
                        navController.navigate(
                            NavigationRoutes.Builder.editMerchant(merchantId)
                        )
                    }
                )
            }
            
            // 用户中心页面
            composable(NavigationRoutes.USER_CENTER) {
                UserCenterScreen(
                    onNavigateToProfile = { userId ->
                        navController.navigate(
                            NavigationRoutes.Builder.userProfile(userId)
                        )
                    },
                    onNavigateToSettings = {
                        navController.navigate(NavigationRoutes.SETTINGS)
                    },
                    onNavigateToLogin = {
                        navController.navigate(NavigationRoutes.LOGIN)
                    }
                )
            }
            
            // 设置页面
            composable(NavigationRoutes.SETTINGS) {
                SettingsScreen(
                    onNavigateToAccountSettings = {
                        navController.navigate(NavigationRoutes.ACCOUNT_SETTINGS)
                    },
                    onNavigateToNotificationSettings = {
                        navController.navigate(NavigationRoutes.NOTIFICATION_SETTINGS)
                    },
                    onNavigateToPrivacySettings = {
                        navController.navigate(NavigationRoutes.PRIVACY_SETTINGS)
                    },
                    onNavigateToLanguageSettings = {
                        navController.navigate(NavigationRoutes.LANGUAGE_SETTINGS)
                    },
                    onNavigateToThemeSettings = {
                        navController.navigate(NavigationRoutes.THEME_SETTINGS)
                    },
                    onNavigateToAbout = {
                        navController.navigate(NavigationRoutes.ABOUT)
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            // POS机详情页面
            composable(
                route = NavigationRoutes.POS_MACHINE_DETAIL,
                arguments = listOf(
                    navArgument(NavigationRoutes.Args.POS_MACHINE_ID) {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val posMachineId = backStackEntry.arguments?.getString(
                    NavigationRoutes.Args.POS_MACHINE_ID
                ) ?: return@composable
                
                POSMachineDetailScreen(
                    posMachineId = posMachineId,
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onNavigateToMerchant = { merchantId ->
                        navController.navigate(
                            NavigationRoutes.Builder.merchantDetail(merchantId)
                        )
                    },
                    onNavigateToEdit = {
                        navController.navigate(
                            NavigationRoutes.Builder.editPOSMachine(posMachineId)
                        )
                    }
                )
            }
            
            // 商户详情页面
            composable(
                route = NavigationRoutes.MERCHANT_DETAIL,
                arguments = listOf(
                    navArgument(NavigationRoutes.Args.MERCHANT_ID) {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val merchantId = backStackEntry.arguments?.getString(
                    NavigationRoutes.Args.MERCHANT_ID
                ) ?: return@composable
                
                MerchantDetailScreen(
                    merchantId = merchantId,
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onNavigateToEdit = {
                        navController.navigate(
                            NavigationRoutes.Builder.editMerchant(merchantId)
                        )
                    },
                    onNavigateToPOSDetail = { posMachineId ->
                        navController.navigate(
                            NavigationRoutes.Builder.posMachineDetail(posMachineId)
                        )
                    }
                )
            }
            
            // 用户资料页面
            composable(
                route = NavigationRoutes.USER_PROFILE,
                arguments = listOf(
                    navArgument(NavigationRoutes.Args.USER_ID) {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val userId = backStackEntry.arguments?.getString(
                    NavigationRoutes.Args.USER_ID
                ) ?: return@composable
                
                UserProfileScreen(
                    userId = userId,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            // 认证相关页面
            composable(NavigationRoutes.LOGIN) {
                LoginScreen(
                    onNavigateToRegister = {
                        navController.navigate(NavigationRoutes.REGISTER)
                    },
                    onNavigateToForgotPassword = {
                        navController.navigate(NavigationRoutes.FORGOT_PASSWORD)
                    },
                    onLoginSuccess = {
                        navController.navigate(NavigationRoutes.MAP) {
                            popUpTo(NavigationRoutes.LOGIN) { inclusive = true }
                        }
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.REGISTER) {
                RegisterScreen(
                    onNavigateToLogin = {
                        navController.navigate(NavigationRoutes.LOGIN) {
                            popUpTo(NavigationRoutes.REGISTER) { inclusive = true }
                        }
                    },
                    onRegisterSuccess = {
                        navController.navigate(NavigationRoutes.MAP) {
                            popUpTo(NavigationRoutes.REGISTER) { inclusive = true }
                        }
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.FORGOT_PASSWORD) {
                ForgotPasswordScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onNavigateToLogin = {
                        navController.navigate(NavigationRoutes.LOGIN) {
                            popUpTo(NavigationRoutes.FORGOT_PASSWORD) { inclusive = true }
                        }
                    }
                )
            }
            
            // 搜索页面
            composable(NavigationRoutes.SEARCH) {
                SearchScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onNavigateToPOSDetail = { posMachineId ->
                        navController.navigate(
                            NavigationRoutes.Builder.posMachineDetail(posMachineId)
                        )
                    },
                    onNavigateToMerchantDetail = { merchantId ->
                        navController.navigate(
                            NavigationRoutes.Builder.merchantDetail(merchantId)
                        )
                    }
                )
            }
            
            // 其他设置子页面
            composable(NavigationRoutes.ACCOUNT_SETTINGS) {
                AccountSettingsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.NOTIFICATION_SETTINGS) {
                NotificationSettingsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.PRIVACY_SETTINGS) {
                PrivacySettingsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.LANGUAGE_SETTINGS) {
                LanguageSettingsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.THEME_SETTINGS) {
                ThemeSettingsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(NavigationRoutes.ABOUT) {
                AboutScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}

// 占位符组件 - 这些将在后续实现
@Composable
fun MerchantManagementScreen(
    onNavigateToMerchantDetail: (String) -> Unit,
    onNavigateToAddMerchant: () -> Unit,
    onNavigateToEditMerchant: (String) -> Unit
) {
    // TODO: 实现商户管理页面
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("商户管理页面 - 待实现")
    }
}

@Composable
fun UserCenterScreen(
    onNavigateToProfile: (String) -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    // TODO: 实现用户中心页面
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("用户中心页面 - 待实现")
    }
}

@Composable
fun SettingsScreen(
    onNavigateToAccountSettings: () -> Unit,
    onNavigateToNotificationSettings: () -> Unit,
    onNavigateToPrivacySettings: () -> Unit,
    onNavigateToLanguageSettings: () -> Unit,
    onNavigateToThemeSettings: () -> Unit,
    onNavigateToAbout: () -> Unit,
    onNavigateBack: () -> Unit
) {
    // TODO: 实现设置页面
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("设置页面 - 待实现")
    }
}

// 其他占位符组件...
@Composable
fun POSMachineDetailScreen(
    posMachineId: String,
    onNavigateBack: () -> Unit,
    onNavigateToMerchant: (String) -> Unit,
    onNavigateToEdit: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("POS机详情页面 - 待实现")
    }
}

@Composable
fun MerchantDetailScreen(
    merchantId: String,
    onNavigateBack: () -> Unit,
    onNavigateToEdit: () -> Unit,
    onNavigateToPOSDetail: (String) -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("商户详情页面 - 待实现")
    }
}

@Composable
fun UserProfileScreen(
    userId: String,
    onNavigateBack: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("用户资料页面 - 待实现")
    }
}

@Composable
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    onLoginSuccess: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("登录页面 - 待实现")
    }
}

@Composable
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegisterSuccess: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("注册页面 - 待实现")
    }
}

@Composable
fun ForgotPasswordScreen(
    onNavigateBack: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("忘记密码页面 - 待实现")
    }
}

@Composable
fun SearchScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPOSDetail: (String) -> Unit,
    onNavigateToMerchantDetail: (String) -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("搜索页面 - 待实现")
    }
}

@Composable
fun AccountSettingsScreen(onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("账户设置页面 - 待实现")
    }
}

@Composable
fun NotificationSettingsScreen(onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("通知设置页面 - 待实现")
    }
}

@Composable
fun PrivacySettingsScreen(onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("隐私设置页面 - 待实现")
    }
}

@Composable
fun LanguageSettingsScreen(onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("语言设置页面 - 待实现")
    }
}

@Composable
fun ThemeSettingsScreen(onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("主题设置页面 - 待实现")
    }
}

@Composable
fun AboutScreen(onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("关于页面 - 待实现")
    }
}