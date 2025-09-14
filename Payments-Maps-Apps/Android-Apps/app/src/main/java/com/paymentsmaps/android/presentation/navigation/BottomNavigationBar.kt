package com.paymentsmaps.android.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.paymentsmaps.android.R

/**
 * 底部导航栏数据类
 */
data class BottomNavItem(
    val route: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val labelResId: Int,
    val contentDescriptionResId: Int
)

/**
 * 底部导航栏组件
 */
@Composable
fun BottomNavigationBar(
    navController: NavController,
    onNavigate: (String) -> Unit
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    
    val bottomNavItems = listOf(
        BottomNavItem(
            route = NavigationRoutes.MAP,
            selectedIcon = Icons.Filled.Map,
            unselectedIcon = Icons.Outlined.Map,
            labelResId = R.string.map,
            contentDescriptionResId = R.string.map_tab
        ),
        BottomNavItem(
            route = NavigationRoutes.MERCHANT_MANAGEMENT,
            selectedIcon = Icons.Filled.Business,
            unselectedIcon = Icons.Outlined.Business,
            labelResId = R.string.merchants,
            contentDescriptionResId = R.string.merchants_tab
        ),
        BottomNavItem(
            route = NavigationRoutes.USER_CENTER,
            selectedIcon = Icons.Filled.Person,
            unselectedIcon = Icons.Outlined.Person,
            labelResId = R.string.profile,
            contentDescriptionResId = R.string.profile_tab
        ),
        BottomNavItem(
            route = NavigationRoutes.SETTINGS,
            selectedIcon = Icons.Filled.Settings,
            unselectedIcon = Icons.Outlined.Settings,
            labelResId = R.string.settings,
            contentDescriptionResId = R.string.settings_tab
        )
    )
    
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        contentColor = MaterialTheme.colorScheme.onSurface
    ) {
        bottomNavItems.forEach { item ->
            val isSelected = currentRoute == item.route
            
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = stringResource(item.contentDescriptionResId)
                    )
                },
                label = {
                    Text(
                        text = stringResource(item.labelResId),
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                selected = isSelected,
                onClick = {
                    if (currentRoute != item.route) {
                        onNavigate(item.route)
                    }
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.onSecondaryContainer,
                    selectedTextColor = MaterialTheme.colorScheme.onSurface,
                    indicatorColor = MaterialTheme.colorScheme.secondaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

/**
 * 检查当前路由是否应该显示底部导航栏
 */
fun shouldShowBottomBar(currentRoute: String?): Boolean {
    return currentRoute != null && 
           NavigationRoutes.bottomNavRoutes.contains(currentRoute) &&
           !NavigationRoutes.fullScreenRoutes.any { fullScreenRoute ->
               currentRoute.startsWith(fullScreenRoute.split("/")[0])
           }
}