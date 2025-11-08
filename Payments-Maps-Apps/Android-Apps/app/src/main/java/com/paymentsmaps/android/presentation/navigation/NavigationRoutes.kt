package com.paymentsmaps.android.presentation.navigation

/**
 * 应用导航路由定义
 */
object NavigationRoutes {
    
    // 主要页面路由
    const val MAP = "map"
    const val MERCHANT_MANAGEMENT = "merchant_management"
    const val USER_CENTER = "user_center"
    const val SETTINGS = "settings"
    
    // 详情页面路由
    const val POS_MACHINE_DETAIL = "pos_machine_detail/{posMachineId}"
    const val MERCHANT_DETAIL = "merchant_detail/{merchantId}"
    const val USER_PROFILE = "user_profile/{userId}"
    const val EDIT_PROFILE = "edit_profile/{userId}"
    
    // 认证相关路由
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"
    
    // 管理页面路由
    const val ADD_POS_MACHINE = "add_pos_machine"
    const val EDIT_POS_MACHINE = "edit_pos_machine/{posMachineId}"
    const val ADD_MERCHANT = "add_merchant"
    const val EDIT_MERCHANT = "edit_merchant/{merchantId}"
    
    // 设置子页面路由
    const val ACCOUNT_SETTINGS = "account_settings"
    const val NOTIFICATION_SETTINGS = "notification_settings"
    const val PRIVACY_SETTINGS = "privacy_settings"
    const val LANGUAGE_SETTINGS = "language_settings"
    const val THEME_SETTINGS = "theme_settings"
    const val ABOUT = "about"
    
    // 其他功能页面
    const val SEARCH = "search"
    const val NOTIFICATIONS = "notifications"
    const val HELP = "help"
    const val FEEDBACK = "feedback"
    
    /**
     * 构建带参数的路由
     */
    object Builder {
        
        fun posMachineDetail(posMachineId: String): String {
            return "pos_machine_detail/$posMachineId"
        }
        
        fun merchantDetail(merchantId: String): String {
            return "merchant_detail/$merchantId"
        }
        
        fun userProfile(userId: String): String {
            return "user_profile/$userId"
        }
        
        fun editProfile(userId: String): String {
            return "edit_profile/$userId"
        }

        fun editPOSMachine(posMachineId: String): String {
            return "edit_pos_machine/$posMachineId"
        }
        
        fun editMerchant(merchantId: String): String {
            return "edit_merchant/$merchantId"
        }
    }
    
    /**
     * 路由参数键
     */
    object Args {
        const val POS_MACHINE_ID = "posMachineId"
        const val MERCHANT_ID = "merchantId"
        const val USER_ID = "userId"
    }
    
    /**
     * 底部导航栏路由
     */
    val bottomNavRoutes = listOf(
        MAP,
        MERCHANT_MANAGEMENT,
        USER_CENTER,
        SETTINGS
    )
    
    /**
     * 需要认证的路由
     */
    val authenticatedRoutes = listOf(
        MERCHANT_MANAGEMENT,
        USER_CENTER,
        SETTINGS,
        ADD_POS_MACHINE,
        EDIT_POS_MACHINE,
        ADD_MERCHANT,
        EDIT_MERCHANT,
        EDIT_PROFILE,
        ACCOUNT_SETTINGS,
        NOTIFICATION_SETTINGS,
        PRIVACY_SETTINGS
    )
    
    /**
     * 管理员专用路由
     */
    val adminOnlyRoutes = listOf(
        ADD_POS_MACHINE,
        EDIT_POS_MACHINE,
        ADD_MERCHANT,
        EDIT_MERCHANT
    )
    
    /**
     * 全屏页面路由（隐藏底部导航栏）
     */
    val fullScreenRoutes = listOf(
        LOGIN,
        REGISTER,
        FORGOT_PASSWORD,
        POS_MACHINE_DETAIL,
        MERCHANT_DETAIL,
        USER_PROFILE,
        EDIT_PROFILE,
        ADD_POS_MACHINE,
        EDIT_POS_MACHINE,
        ADD_MERCHANT,
        EDIT_MERCHANT,
        SEARCH,
        HELP,
        FEEDBACK,
        ABOUT
    )
}
