package com.paymentsmaps.android.presentation.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.paymentsmaps.android.presentation.auth.ForgotPasswordScreen
import com.paymentsmaps.android.presentation.auth.LoginScreen
import com.paymentsmaps.android.presentation.auth.RegisterScreen
import com.paymentsmaps.android.presentation.map.MapScreen
import com.paymentsmaps.android.presentation.merchant.AddMerchantScreen
import com.paymentsmaps.android.presentation.merchant.AddPOSMachineScreen
import com.paymentsmaps.android.presentation.merchant.EditMerchantScreen
import com.paymentsmaps.android.presentation.merchant.EditPOSMachineScreen
import com.paymentsmaps.android.presentation.merchant.MerchantDetailScreen
import com.paymentsmaps.android.presentation.merchant.MerchantManagementScreen
import com.paymentsmaps.android.presentation.pos.POSMachineDetailScreen
import com.paymentsmaps.android.presentation.profile.EditProfileScreen
import com.paymentsmaps.android.presentation.profile.UserProfileScreen
import com.paymentsmaps.android.presentation.search.SearchScreen
import com.paymentsmaps.android.presentation.settings.AboutScreen
import com.paymentsmaps.android.presentation.settings.AccountSettingsScreen
import com.paymentsmaps.android.presentation.settings.LanguageSettingsScreen
import com.paymentsmaps.android.presentation.settings.NotificationSettingsScreen
import com.paymentsmaps.android.presentation.settings.PrivacySettingsScreen
import com.paymentsmaps.android.presentation.settings.SettingsScreen
import com.paymentsmaps.android.presentation.settings.ThemeSettingsScreen
import com.paymentsmaps.android.presentation.usercenter.UserCenterScreen

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
                    },
                    onEditProfile = {
                        navController.navigate(
                            NavigationRoutes.Builder.editProfile(userId)
                        )
                    }
                )
            }

            composable(
                route = NavigationRoutes.EDIT_PROFILE,
                arguments = listOf(
                    navArgument(NavigationRoutes.Args.USER_ID) {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val userId = backStackEntry.arguments?.getString(
                    NavigationRoutes.Args.USER_ID
                ) ?: return@composable

                EditProfileScreen(
                    userId = userId,
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onSaveSuccess = {
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
                    onNavigateToProfile = { userId ->
                        navController.navigate(
                            NavigationRoutes.Builder.userProfile(userId)
                        )
                    },
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

            // 商户与POS管理表单
            composable(NavigationRoutes.ADD_MERCHANT) {
                AddMerchantScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(
                route = NavigationRoutes.EDIT_MERCHANT,
                arguments = listOf(
                    navArgument(NavigationRoutes.Args.MERCHANT_ID) {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val merchantId = backStackEntry.arguments?.getString(
                    NavigationRoutes.Args.MERCHANT_ID
                ) ?: return@composable

                EditMerchantScreen(
                    merchantId = merchantId,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(NavigationRoutes.ADD_POS_MACHINE) {
                AddPOSMachineScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(
                route = NavigationRoutes.EDIT_POS_MACHINE,
                arguments = listOf(
                    navArgument(NavigationRoutes.Args.POS_MACHINE_ID) {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val posMachineId = backStackEntry.arguments?.getString(
                    NavigationRoutes.Args.POS_MACHINE_ID
                ) ?: return@composable

                EditPOSMachineScreen(
                    posMachineId = posMachineId,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
