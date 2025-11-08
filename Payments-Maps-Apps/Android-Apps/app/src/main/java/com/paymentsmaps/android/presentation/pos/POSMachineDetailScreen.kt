package com.paymentsmaps.android.presentation.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
import com.paymentsmaps.android.domain.model.PaymentMethod
import com.paymentsmaps.android.domain.model.displayName
import com.paymentsmaps.android.domain.model.needsMaintenance

/**
 * POS 机详情页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSMachineDetailScreen(
    posMachineId: String,
    onNavigateBack: () -> Unit,
    onNavigateToMerchant: (String) -> Unit,
    onNavigateToEdit: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: POSMachineDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(posMachineId) {
        viewModel.loadPOSMachine(posMachineId)
    }

    LaunchedEffect(uiState.message) {
        uiState.message?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearMessage()
        }
    }

    val error = uiState.error
    val posMachine = uiState.posMachine

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = { Text("POS 机详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refresh) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "刷新")
                    }
                    IconButton(onClick = onNavigateToEdit) {
                        Icon(imageVector = Icons.Default.Edit, contentDescription = "编辑POS")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { padding ->
        when {
            uiState.isLoading -> {
                LoadingState(modifier = Modifier.padding(padding))
            }

            error != null -> {
                ErrorState(
                    message = error,
                    onRetry = viewModel::refresh,
                    modifier = Modifier.padding(padding)
                )
            }

            posMachine != null -> {
                POSMachineDetailContent(
                    posMachine = posMachine,
                    onNavigateToMerchant = onNavigateToMerchant,
                    onStatusChange = viewModel::updateStatus,
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
private fun LoadingState(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        androidx.compose.material3.CircularProgressIndicator()
    }
}

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Settings,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.error,
            modifier = Modifier
                .size(48.dp)
                .padding(bottom = 16.dp)
        )
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        TextButton(onClick = onRetry, modifier = Modifier.padding(top = 12.dp)) {
            Text("重试")
        }
    }
}

@Composable
private fun POSMachineDetailContent(
    posMachine: POSMachine,
    onNavigateToMerchant: (String) -> Unit,
    onStatusChange: (POSStatus) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .background(
                Brush.verticalGradient(
                    listOf(
                        MaterialTheme.colorScheme.surface,
                        MaterialTheme.colorScheme.background
                    )
                )
            )
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        HeaderCard(posMachine = posMachine, onNavigateToMerchant = onNavigateToMerchant)
        StatusCard(posMachine = posMachine, onStatusChange = onStatusChange)
        PaymentMethodsCard(paymentMethods = posMachine.supportedPaymentMethods)
        VolumeCard(posMachine = posMachine)
        MetadataCard(posMachine = posMachine)
    }
}

@Composable
private fun HeaderCard(
    posMachine: POSMachine,
    onNavigateToMerchant: (String) -> Unit
) {
    ElevatedCard(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = posMachine.displayName,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                text = "序列号：${posMachine.serialNumber}",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
            )
            AssistChip(
                onClick = { onNavigateToMerchant(posMachine.merchantId) },
                label = { Text("前往商户详情") },
                leadingIcon = {
                    Icon(imageVector = Icons.Default.Business, contentDescription = null)
                },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.2f)
                )
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Column {
                    Text(
                        text = posMachine.location.address,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = "${posMachine.location.city} · ${posMachine.location.province}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusCard(
    posMachine: POSMachine,
    onStatusChange: (POSStatus) -> Unit
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "运行状态",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            StatusBadges(posMachine = posMachine)

            Text(
                text = "更新状态",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            FlowStatusActions(currentStatus = posMachine.status, onStatusChange = onStatusChange)
        }
    }
}

@Composable
private fun StatusBadges(posMachine: POSMachine) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatusChip(
            label = posMachine.status.name,
            color = when (posMachine.status) {
                POSStatus.ACTIVE -> MaterialTheme.colorScheme.primary
                POSStatus.MAINTENANCE -> MaterialTheme.colorScheme.tertiary
                POSStatus.INACTIVE -> MaterialTheme.colorScheme.error
                POSStatus.OFFLINE -> MaterialTheme.colorScheme.secondary
                POSStatus.PENDING -> MaterialTheme.colorScheme.secondary
                POSStatus.ERROR -> MaterialTheme.colorScheme.error
            }
        )
        StatusChip(
            label = if (posMachine.isActive) "可用" else "不可用",
            color = if (posMachine.isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
        )
        StatusChip(
            label = if (posMachine.needsMaintenance) "需维护" else "正常",
            color = if (posMachine.needsMaintenance) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun StatusChip(label: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = color
        )
    }
}

@Composable
private fun FlowStatusActions(
    currentStatus: POSStatus,
    onStatusChange: (POSStatus) -> Unit
) {
    val actions = listOf(
        POSStatus.ACTIVE,
        POSStatus.MAINTENANCE,
        POSStatus.INACTIVE,
        POSStatus.OFFLINE
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        actions.forEach { status ->
            AssistChip(
                onClick = { onStatusChange(status) },
                label = { Text(statusLabel(status)) },
                enabled = status != currentStatus,
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = if (status == currentStatus) {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                )
            )
        }
    }
}

private fun statusLabel(status: POSStatus): String = when (status) {
    POSStatus.ACTIVE -> "标记为活跃"
    POSStatus.MAINTENANCE -> "维护中"
    POSStatus.INACTIVE -> "停用"
    POSStatus.OFFLINE -> "离线"
    POSStatus.PENDING -> "待激活"
    POSStatus.ERROR -> "故障"
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PaymentMethodsCard(paymentMethods: List<PaymentMethod>) {
    Card(
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
            Text(
                text = "支持支付方式",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            if (paymentMethods.isEmpty()) {
                Text(
                    text = "未配置支付方式",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    paymentMethods.forEach { method ->
                        StatusChip(label = methodLabel(method), color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

private fun methodLabel(method: PaymentMethod): String = when (method) {
    PaymentMethod.BANK_CARD -> "银行卡"
    PaymentMethod.CREDIT_CARD -> "信用卡"
    PaymentMethod.DEBIT_CARD -> "借记卡"
    PaymentMethod.WECHAT_PAY -> "微信支付"
    PaymentMethod.ALIPAY -> "支付宝"
    PaymentMethod.UNION_PAY -> "银联"
    PaymentMethod.DIGITAL_CURRENCY -> "数字货币"
    PaymentMethod.NFC -> "NFC"
    PaymentMethod.QR_CODE -> "二维码"
    PaymentMethod.CASH -> "现金"
    PaymentMethod.CONTACTLESS -> "非接触式"
    PaymentMethod.MOBILE_PAYMENT -> "移动支付"
}

@Composable
private fun VolumeCard(posMachine: POSMachine) {
    Card(
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
            Text(
                text = "交易额度",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            InfoRow("今日交易额", "${posMachine.currentDailyVolume}/${posMachine.dailyTransactionLimit}")
            InfoRow("本月交易额", "${posMachine.currentMonthlyVolume}/${posMachine.monthlyTransactionLimit}")
            InfoRow("费率", "${posMachine.feeRate}%")
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun MetadataCard(posMachine: POSMachine) {
    Card(
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
            Text(
                text = "基础信息",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            InfoRow("机型", posMachine.model)
            InfoRow("厂商", posMachine.manufacturer)
            InfoRow("安装时间", posMachine.installationDate.toString())
            InfoRow("上次维护", posMachine.lastMaintenanceDate?.toString() ?: "暂无记录")
            InfoRow("预计维护", posMachine.nextMaintenanceDate?.toString() ?: "未排期")
            InfoRow("创建时间", posMachine.createdAt.toString())
            InfoRow("更新时间", posMachine.updatedAt.toString())
        }
    }
}
