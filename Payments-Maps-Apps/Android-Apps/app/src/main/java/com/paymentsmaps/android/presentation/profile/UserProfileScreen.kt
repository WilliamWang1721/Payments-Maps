package com.paymentsmaps.android.presentation.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.paymentsmaps.android.domain.model.User

/**
 * 用户个人资料页面 - Material 3 设计
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    onNavigateBack: () -> Unit,
    onEditProfile: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: UserProfileViewModel = hiltViewModel()
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    
    // 观察用户状态
    val uiState by viewModel.uiState.collectAsState()
    
    // 加载用户数据
    LaunchedEffect(Unit) {
        viewModel.loadUserProfile()
    }
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
    ) {
        // 顶部栏
        ProfileTopBar(
            onNavigateBack = onNavigateBack,
            onEditProfile = onEditProfile
        )
        
        when (uiState) {
            is UserProfileUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(64.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            
            is UserProfileUiState.Success -> {
                ProfileContent(
                    user = uiState.user,
                    onRefresh = { viewModel.loadUserProfile() }
                )
            }
            
            is UserProfileUiState.Error -> {
                ErrorContent(
                    message = uiState.message,
                    onRetry = { viewModel.loadUserProfile() }
                )
            }
            
            UserProfileUiState.Initial -> {
                // 初始状态，显示加载
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(64.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}

/**
 * 顶部导航栏
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileTopBar(
    onNavigateBack: () -> Unit,
    onEditProfile: () -> Unit
) {
    TopAppBar(
        title = {
            Text(
                text = "个人资料",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
        },
        navigationIcon = {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "返回"
                )
            }
        },
        actions = {
            IconButton(onClick = onEditProfile) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "编辑资料"
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.surface,
            titleContentColor = MaterialTheme.colorScheme.onSurface
        )
    )
}

/**
 * 个人资料内容
 */
@Composable
private fun ProfileContent(
    user: User,
    onRefresh: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // 头像和基本信息
        ProfileHeader(user = user)
        
        // 个人信息卡片
        PersonalInfoCard(user = user)
        
        // 联系信息卡片
        ContactInfoCard(user = user)
        
        // 偏好设置卡片
        PreferencesCard(user = user)
        
        // 账户统计卡片
        AccountStatsCard(user = user)
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * 用户头像和基本信息
 */
@Composable
private fun ProfileHeader(user: User) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxWidth()
        ) {
            // 背景渐变
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                            )
                        )
                    )
            )
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 头像
                if (user.avatar != null) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(user.avatar)
                            .crossfade(true)
                            .build(),
                        contentDescription = "用户头像",
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user.initials,
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                
                // 用户名和邮箱
                Text(
                    text = user.fullName,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center
                )
                
                // 角色标签
                AssistChip(
                    onClick = { },
                    label = {
                        Text(
                            text = when (user.role) {
                                com.paymentsmaps.android.domain.model.UserRole.SUPER_ADMIN -> "超级管理员"
                                com.paymentsmaps.android.domain.model.UserRole.ADMIN -> "管理员"
                                com.paymentsmaps.android.domain.model.UserRole.MANAGER -> "经理"
                                com.paymentsmaps.android.domain.model.UserRole.OPERATOR -> "操作员"
                                com.paymentsmaps.android.domain.model.UserRole.MERCHANT -> "商户"
                                com.paymentsmaps.android.domain.model.UserRole.TECHNICIAN -> "技术员"
                                com.paymentsmaps.android.domain.model.UserRole.CUSTOMER_SERVICE -> "客服"
                                else -> "用户"
                            }
                        )
                    },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Badge,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                )
            }
        }
    }
}

/**
 * 个人信息卡片
 */
@Composable
private fun PersonalInfoCard(user: User) {
    InfoCard(
        title = "个人信息",
        icon = Icons.Default.Person
    ) {
        InfoItem(
            label = "姓名",
            value = user.fullName.ifBlank { "未设置" },
            icon = Icons.Default.Person
        )
        
        if (user.profile.company != null) {
            InfoItem(
                label = "公司",
                value = user.profile.company,
                icon = Icons.Default.Business
            )
        }
        
        if (user.profile.position != null) {
            InfoItem(
                label = "职位",
                value = user.profile.position,
                icon = Icons.Default.Work
            )
        }
        
        if (user.profile.bio != null) {
            InfoItem(
                label = "个人简介",
                value = user.profile.bio,
                icon = Icons.Default.Description,
                isMultiLine = true
            )
        }
    }
}

/**
 * 联系信息卡片
 */
@Composable
private fun ContactInfoCard(user: User) {
    InfoCard(
        title = "联系信息",
        icon = Icons.Default.ContactPhone
    ) {
        InfoItem(
            label = "邮箱",
            value = user.email,
            icon = Icons.Default.Email
        )
        
        if (user.phone != null) {
            InfoItem(
                label = "手机号",
                value = user.phone,
                icon = Icons.Default.Phone
            )
        }
        
        if (user.profile.address != null) {
            InfoItem(
                label = "地址",
                value = user.profile.address,
                icon = Icons.Default.LocationOn,
                isMultiLine = true
            )
        }
        
        InfoItem(
            label = "城市",
            value = "${user.profile.city ?: "未设置"}, ${user.profile.country}",
            icon = Icons.Default.LocationCity
        )
        
        if (user.profile.website != null) {
            InfoItem(
                label = "网站",
                value = user.profile.website,
                icon = Icons.Default.Language
            )
        }
    }
}

/**
 * 偏好设置卡片
 */
@Composable
private fun PreferencesCard(user: User) {
    InfoCard(
        title = "偏好设置",
        icon = Icons.Default.Settings
    ) {
        InfoItem(
            label = "语言",
            value = when (user.preferences.language) {
                "zh-CN" -> "中文（简体）"
                "en" -> "English"
                "ru" -> "Русский"
                "de" -> "Deutsch"
                else -> user.preferences.language
            },
            icon = Icons.Default.Language
        )
        
        InfoItem(
            label = "主题",
            value = when (user.preferences.theme) {
                com.paymentsmaps.android.domain.model.ThemeMode.LIGHT -> "浅色"
                com.paymentsmaps.android.domain.model.ThemeMode.DARK -> "深色"
                com.paymentsmaps.android.domain.model.ThemeMode.SYSTEM -> "跟随系统"
            },
            icon = Icons.Default.Palette
        )
        
        InfoItem(
            label = "货币",
            value = user.preferences.currency,
            icon = Icons.Default.AttachMoney
        )
        
        InfoItem(
            label = "时区",
            value = user.preferences.timezone,
            icon = Icons.Default.Schedule
        )
    }
}

/**
 * 账户统计卡片
 */
@Composable
private fun AccountStatsCard(user: User) {
    InfoCard(
        title = "账户信息",
        icon = Icons.Default.AccountCircle
    ) {
        InfoItem(
            label = "账户状态",
            value = when (user.status) {
                com.paymentsmaps.android.domain.model.UserStatus.ACTIVE -> "活跃"
                com.paymentsmaps.android.domain.model.UserStatus.INACTIVE -> "非活跃"
                com.paymentsmaps.android.domain.model.UserStatus.SUSPENDED -> "暂停"
                com.paymentsmaps.android.domain.model.UserStatus.PENDING -> "待审核"
                com.paymentsmaps.android.domain.model.UserStatus.BLOCKED -> "封禁"
            },
            icon = Icons.Default.Info,
            valueColor = when (user.status) {
                com.paymentsmaps.android.domain.model.UserStatus.ACTIVE -> MaterialTheme.colorScheme.primary
                com.paymentsmaps.android.domain.model.UserStatus.SUSPENDED,
                com.paymentsmaps.android.domain.model.UserStatus.BLOCKED -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
        
        InfoItem(
            label = "邮箱验证",
            value = if (user.isVerified) "已验证" else "未验证",
            icon = if (user.isVerified) Icons.Default.CheckCircle else Icons.Default.Warning,
            valueColor = if (user.isVerified) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
        )
        
        InfoItem(
            label = "注册时间",
            value = user.createdAt.toString().substring(0, 19).replace("T", " "),
            icon = Icons.Default.CalendarToday
        )
        
        if (user.lastLoginAt != null) {
            InfoItem(
                label = "最后登录",
                value = user.lastLoginAt.toString().substring(0, 19).replace("T", " "),
                icon = Icons.Default.Login
            )
        }
    }
}

/**
 * 信息卡片组件
 */
@Composable
private fun InfoCard(
    title: String,
    icon: ImageVector,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold
                )
            }
            
            content()
        }
    }
}

/**
 * 信息项组件
 */
@Composable
private fun InfoItem(
    label: String,
    value: String,
    icon: ImageVector,
    isMultiLine: Boolean = false,
    valueColor: Color = MaterialTheme.colorScheme.onSurfaceVariant
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = if (isMultiLine) Alignment.Top else Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
        
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )
            
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                color = valueColor,
                maxLines = if (isMultiLine) Int.MAX_VALUE else 1
            )
        }
    }
}

/**
 * 错误内容
 */
@Composable
private fun ErrorContent(
    message: String,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Error,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.error,
            modifier = Modifier.size(64.dp)
        )
        
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("重试")
        }
    }
}