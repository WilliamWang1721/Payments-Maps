package com.paymentsmaps.android.presentation.profile

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.paymentsmaps.android.domain.model.*

/**
 * 用户资料编辑页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    userId: String? = null,
    onNavigateBack: () -> Unit,
    onSaveSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: EditProfileViewModel = hiltViewModel()
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    
    // 观察状态
    val uiState by viewModel.uiState.collectAsState()
    val isLoading = uiState is EditProfileUiState.Loading
    val errorMessage = (uiState as? EditProfileUiState.Error)?.message
    
    // 表单状态
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var company by remember { mutableStateOf("") }
    var position by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var postalCode by remember { mutableStateOf("") }
    var website by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    
    // 偏好设置状态
    var selectedLanguage by remember { mutableStateOf("zh-CN") }
    var selectedTheme by remember { mutableStateOf(ThemeMode.SYSTEM) }
    var selectedCurrency by remember { mutableStateOf("CNY") }
    
    // 通知设置状态
    var emailNotifications by remember { mutableStateOf(true) }
    var pushNotifications by remember { mutableStateOf(true) }
    var smsNotifications by remember { mutableStateOf(false) }
    var marketingEmails by remember { mutableStateOf(false) }
    
    // 加载用户数据
    LaunchedEffect(userId) {
        viewModel.loadUserForEdit(userId)
    }
    
    // 监听加载成功，填充表单
    LaunchedEffect(uiState) {
    when (val state = uiState) {
        is EditProfileUiState.Success -> {
                val user = state.user
            firstName = user.profile.firstName ?: ""
            lastName = user.profile.lastName ?: ""
            company = user.profile.company ?: ""
            position = user.profile.position ?: ""
            phoneNumber = user.phone ?: ""
            address = user.profile.address ?: ""
            city = user.profile.city ?: ""
            postalCode = user.profile.postalCode ?: ""
            website = user.profile.website ?: ""
            bio = user.profile.bio ?: ""
            
            selectedLanguage = user.preferences.language
            selectedTheme = user.preferences.theme
            selectedCurrency = user.preferences.currency
            
            emailNotifications = user.preferences.notifications.emailNotifications
            pushNotifications = user.preferences.notifications.pushNotifications
            smsNotifications = user.preferences.notifications.smsNotifications
            marketingEmails = user.preferences.notifications.marketingEmails
            }

            is EditProfileUiState.SaveSuccess -> {
                onSaveSuccess()
            }

            else -> Unit
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // 顶部栏
        EditProfileTopBar(
            onNavigateBack = onNavigateBack,
            onSave = {
                val currentUser = (uiState as? EditProfileUiState.Success)?.user
                if (currentUser != null) {
                    val updatedProfile = currentUser.profile.copy(
                        firstName = firstName.takeIf { it.isNotBlank() },
                        lastName = lastName.takeIf { it.isNotBlank() },
                        company = company.takeIf { it.isNotBlank() },
                        position = position.takeIf { it.isNotBlank() },
                        address = address.takeIf { it.isNotBlank() },
                        city = city.takeIf { it.isNotBlank() },
                        postalCode = postalCode.takeIf { it.isNotBlank() },
                        website = website.takeIf { it.isNotBlank() },
                        bio = bio.takeIf { it.isNotBlank() }
                    )
                    
                    val updatedPreferences = currentUser.preferences.copy(
                        language = selectedLanguage,
                        theme = selectedTheme,
                        currency = selectedCurrency,
                        notifications = currentUser.preferences.notifications.copy(
                            emailNotifications = emailNotifications,
                            pushNotifications = pushNotifications,
                            smsNotifications = smsNotifications,
                            marketingEmails = marketingEmails
                        )
                    )
                    
                    val updatedUser = currentUser.copy(
                        phone = phoneNumber.takeIf { it.isNotBlank() },
                        profile = updatedProfile,
                        preferences = updatedPreferences
                    )
                    
                    viewModel.saveProfile(updatedUser, updatedProfile, updatedPreferences)
                }
            },
            isLoading = isLoading
        )
        
        when (val state = uiState) {
            is EditProfileUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(64.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            
            is EditProfileUiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    // 错误提示
                    AnimatedVisibility(visible = errorMessage != null) {
                        errorMessage?.let { message ->
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = message,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }
                        }
                    }
                    
                    // 头像编辑区域
                    EditProfileHeader(user = state.user)
                    
                    // 基本信息
                    EditSection(
                        title = "基本信息",
                        icon = Icons.Default.Person
                    ) {
                        EditTextField(
                            value = firstName,
                            onValueChange = { firstName = it },
                            label = "姓",
                            icon = Icons.Default.Person
                        )
                        
                        EditTextField(
                            value = lastName,
                            onValueChange = { lastName = it },
                            label = "名",
                            icon = Icons.Default.Person
                        )
                        
                        EditTextField(
                            value = company,
                            onValueChange = { company = it },
                            label = "公司",
                            icon = Icons.Default.Business
                        )
                        
                        EditTextField(
                            value = position,
                            onValueChange = { position = it },
                            label = "职位",
                            icon = Icons.Default.Work
                        )
                        
                        EditTextField(
                            value = bio,
                            onValueChange = { bio = it },
                            label = "个人简介",
                            icon = Icons.Default.Description,
                            maxLines = 3,
                            singleLine = false
                        )
                    }
                    
                    // 联系信息
                    EditSection(
                        title = "联系信息",
                        icon = Icons.Default.ContactPhone
                    ) {
                        EditTextField(
                            value = phoneNumber,
                            onValueChange = { phoneNumber = it },
                            label = "手机号",
                            icon = Icons.Default.Phone,
                            keyboardType = KeyboardType.Phone
                        )
                        
                        EditTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = "地址",
                            icon = Icons.Default.LocationOn,
                            maxLines = 2,
                            singleLine = false
                        )
                        
                        EditTextField(
                            value = city,
                            onValueChange = { city = it },
                            label = "城市",
                            icon = Icons.Default.LocationCity
                        )
                        
                        EditTextField(
                            value = postalCode,
                            onValueChange = { postalCode = it },
                            label = "邮政编码",
                            icon = Icons.Default.MarkunreadMailbox,
                            keyboardType = KeyboardType.Number
                        )
                        
                        EditTextField(
                            value = website,
                            onValueChange = { website = it },
                            label = "个人网站",
                            icon = Icons.Default.Language,
                            keyboardType = KeyboardType.Uri
                        )
                    }
                    
                    // 偏好设置
                    EditSection(
                        title = "偏好设置",
                        icon = Icons.Default.Settings
                    ) {
                        // 语言选择
                        DropdownSection(
                            label = "语言",
                            icon = Icons.Default.Language,
                            options = mapOf(
                                "zh-CN" to "中文（简体）",
                                "en" to "English",
                                "ru" to "Русский",
                                "de" to "Deutsch"
                            ),
                            selectedValue = selectedLanguage,
                            onValueChange = { selectedLanguage = it }
                        )
                        
                        // 主题选择
                        DropdownSection(
                            label = "主题",
                            icon = Icons.Default.Palette,
                            options = mapOf(
                                ThemeMode.LIGHT to "浅色",
                                ThemeMode.DARK to "深色",
                                ThemeMode.SYSTEM to "跟随系统"
                            ),
                            selectedValue = selectedTheme,
                            onValueChange = { selectedTheme = it }
                        )
                        
                        // 货币选择
                        DropdownSection(
                            label = "货币",
                            icon = Icons.Default.AttachMoney,
                            options = mapOf(
                                "CNY" to "人民币 (CNY)",
                                "USD" to "美元 (USD)",
                                "EUR" to "欧元 (EUR)",
                                "JPY" to "日元 (JPY)"
                            ),
                            selectedValue = selectedCurrency,
                            onValueChange = { selectedCurrency = it }
                        )
                    }
                    
                    // 通知设置
                    EditSection(
                        title = "通知设置",
                        icon = Icons.Default.Notifications
                    ) {
                        SwitchItem(
                            label = "邮件通知",
                            description = "接收重要信息的邮件通知",
                            checked = emailNotifications,
                            onCheckedChange = { emailNotifications = it },
                            icon = Icons.Default.Email
                        )
                        
                        SwitchItem(
                            label = "推送通知",
                            description = "接收应用推送通知",
                            checked = pushNotifications,
                            onCheckedChange = { pushNotifications = it },
                            icon = Icons.Default.NotificationsActive
                        )
                        
                        SwitchItem(
                            label = "短信通知",
                            description = "接收重要信息的短信通知",
                            checked = smsNotifications,
                            onCheckedChange = { smsNotifications = it },
                            icon = Icons.Default.Sms
                        )
                        
                        SwitchItem(
                            label = "营销邮件",
                            description = "接收产品更新和营销信息",
                            checked = marketingEmails,
                            onCheckedChange = { marketingEmails = it },
                            icon = Icons.Default.Campaign
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }

            is EditProfileUiState.Error -> {
            ErrorContent(
                message = state.message,
                onRetry = { viewModel.loadUserForEdit() }
            )
        }

        EditProfileUiState.Initial -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(64.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }

        EditProfileUiState.SaveSuccess -> {
            // handled in LaunchedEffect
        }
    }
}

/**
 * 编辑页面顶部栏
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileTopBar(
    onNavigateBack: () -> Unit,
    onSave: () -> Unit,
    isLoading: Boolean
) {
    TopAppBar(
        title = {
            Text(
                text = "编辑资料",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
        },
        navigationIcon = {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "取消"
                )
            }
        },
        actions = {
            Button(
                onClick = onSave,
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("保存")
                }
            }
        }
    )
}

/**
 * 头像编辑区域
 */
@Composable
private fun EditProfileHeader(user: User) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 头像
            Box {
                if (user.avatar != null) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(user.avatar)
                            .crossfade(true)
                            .build(),
                        contentDescription = "用户头像",
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
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
                
                // 编辑头像按钮
                FloatingActionButton(
                    onClick = { /* TODO: 头像编辑 */ },
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .size(32.dp),
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = "编辑头像",
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            
            Text(
                text = "点击编辑头像",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 编辑区段
 */
@Composable
private fun EditSection(
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
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                    fontWeight = FontWeight.SemiBold
                )
            }
            
            content()
        }
    }
}

/**
 * 编辑文本框
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: ImageVector,
    keyboardType: KeyboardType = KeyboardType.Text,
    maxLines: Int = 1,
    singleLine: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
        },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        maxLines = maxLines,
        singleLine = singleLine,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
        )
    )
}

/**
 * 下拉选择区段
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun <T> DropdownSection(
    label: String,
    icon: ImageVector,
    options: Map<T, String>,
    selectedValue: T,
    onValueChange: (T) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
        }
        
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = options[selectedValue] ?: "",
                onValueChange = {},
                readOnly = true,
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                shape = RoundedCornerShape(12.dp)
            )
            
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { (value, displayName) ->
                    DropdownMenuItem(
                        text = { Text(displayName) },
                        onClick = {
                            onValueChange(value)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

/**
 * 开关项
 */
@Composable
private fun SwitchItem(
    label: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    icon: ImageVector
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
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
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
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
            textAlign = TextAlign.Center
        )
        
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}
