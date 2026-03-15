package com.paymentsmaps.android.presentation.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material.icons.filled.TipsAndUpdates
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * 通知设置页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.statusMessage) {
        uiState.statusMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearStatusMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("通知设置", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        modifier = modifier.fillMaxSize()
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            NotificationCard(
                title = "推送通知",
                subtitle = "接收实时运营提醒、POS 状态变化",
                icon = Icons.Default.NotificationsActive,
                checked = uiState.pushNotifications,
                onCheckedChange = { viewModel.updateNotificationSettings(push = it) }
            )

            NotificationCard(
                title = "邮件通知",
                subtitle = "获取日报、周报及账务通知",
                icon = Icons.Default.Email,
                checked = uiState.emailNotifications,
                onCheckedChange = { viewModel.updateNotificationSettings(email = it) }
            )

            NotificationCard(
                title = "短信通知",
                subtitle = "系统故障与高优先级事件短信告知",
                icon = Icons.Default.Sms,
                checked = uiState.smsNotifications,
                onCheckedChange = { viewModel.updateNotificationSettings(sms = it) }
            )

            NotificationCard(
                title = "营销邮件",
                subtitle = "接收产品更新和营销活动信息",
                icon = Icons.Default.TipsAndUpdates,
                checked = uiState.marketingEmails,
                onCheckedChange = { viewModel.updateNotificationSettings(marketing = it) }
            )

            NotificationCard(
                title = "安全告警",
                subtitle = "账号异常登录、权限变更告警",
                icon = Icons.Default.Security,
                checked = uiState.securityAlerts,
                onCheckedChange = { viewModel.updateNotificationSettings(security = it) }
            )

            NotificationCard(
                title = "交易提醒",
                subtitle = "交易额度预警、异常交易提示",
                icon = Icons.Default.Security,
                checked = uiState.transactionAlerts,
                onCheckedChange = { viewModel.updateNotificationSettings(transaction = it) }
            )

            NotificationCard(
                title = "维护提醒",
                subtitle = "POS 设备维护计划和维护结果",
                icon = Icons.Default.Security,
                checked = uiState.maintenanceAlerts,
                onCheckedChange = { viewModel.updateNotificationSettings(maintenance = it) }
            )
        }
    }
}

@Composable
private fun NotificationCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            RowHeader(title = title, icon = icon)
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}

@Composable
private fun RowHeader(title: String, icon: ImageVector) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary
        )
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}
