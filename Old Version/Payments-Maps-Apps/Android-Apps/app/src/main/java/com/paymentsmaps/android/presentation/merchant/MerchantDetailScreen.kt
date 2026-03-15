package com.paymentsmaps.android.presentation.merchant

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
import com.paymentsmaps.android.domain.model.displayName
import com.paymentsmaps.android.domain.model.shortAddress
import com.paymentsmaps.android.presentation.merchant.components.StatusBadge

/**
 * 商户详情页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantDetailScreen(
    merchantId: String,
    onNavigateBack: () -> Unit,
    onNavigateToEdit: () -> Unit,
    onNavigateToPOSDetail: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MerchantDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isLoading = uiState.isLoading
    val error = uiState.error
    val posMachines = uiState.posMachines

    LaunchedEffect(merchantId) {
        viewModel.loadMerchant()
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (uiState.merchantName.isNotBlank()) uiState.merchantName else "商户详情",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToEdit) {
                        Icon(imageVector = Icons.Default.Edit, contentDescription = "编辑商户")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            color = MaterialTheme.colorScheme.background
        ) {
            when {
                isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }

                error != null -> {
                    ErrorState(message = error, onRetry = viewModel::loadMerchant)
                }

                posMachines.isEmpty() -> {
                    EmptyState()
                }

                else -> {
                    MerchantDetailContent(
                        uiState = uiState,
                        onNavigateToPOSDetail = onNavigateToPOSDetail,
                        viewModel = viewModel
                    )
                }
            }
        }
    }
}

@Composable
private fun MerchantDetailContent(
    uiState: MerchantDetailUiState,
    onNavigateToPOSDetail: (String) -> Unit,
    viewModel: MerchantDetailViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        MerchantStatsHeader(uiState = uiState)

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            items(uiState.posMachines, key = { it.id }) { machine ->
                POSMachineCard(
                    posMachine = machine,
                    lastUpdated = viewModel.formatDate(machine),
                    onNavigateToPOSDetail = onNavigateToPOSDetail
                )
            }
        }
    }
}

@Composable
private fun MerchantStatsHeader(uiState: MerchantDetailUiState) {
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
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = uiState.merchantName,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatusBadge(
                    label = "活跃",
                    value = uiState.activeCount,
                    color = MaterialTheme.colorScheme.primary
                )
                StatusBadge(
                    label = "维护中",
                    value = uiState.maintenanceCount,
                    color = MaterialTheme.colorScheme.tertiary
                )
                StatusBadge(
                    label = "离线",
                    value = uiState.offlineCount,
                    color = MaterialTheme.colorScheme.secondary
                )
                StatusBadge(
                    label = "停用",
                    value = uiState.inactiveCount,
                    color = MaterialTheme.colorScheme.error
                )
            }

            Text(
                text = "POS 设备总数：${uiState.posMachines.size}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun POSMachineCard(
    posMachine: POSMachine,
    lastUpdated: String,
    onNavigateToPOSDetail: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = posMachine.displayName,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            Text(
                text = posMachine.shortAddress,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            StatusChip(status = posMachine.status)

            Text(
                text = "最近更新：$lastUpdated",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                OutlinedButton(onClick = { onNavigateToPOSDetail(posMachine.id) }) {
                    Text("查看详情")
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: POSStatus) {
    val (label, color) = when (status) {
        POSStatus.ACTIVE -> "活跃" to MaterialTheme.colorScheme.primary
        POSStatus.MAINTENANCE -> "维护中" to MaterialTheme.colorScheme.tertiary
        POSStatus.OFFLINE -> "离线" to MaterialTheme.colorScheme.secondary
        POSStatus.INACTIVE -> "停用" to MaterialTheme.colorScheme.error
        POSStatus.ERROR -> "故障" to MaterialTheme.colorScheme.error
        POSStatus.PENDING -> "待激活" to MaterialTheme.colorScheme.secondary
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(CircleShape)
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .clip(CircleShape)
                .background(color)
                .height(10.dp)
                .width(10.dp)
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = color,
            modifier = Modifier.padding(start = 8.dp)
        )
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "加载失败",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.error
        )
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp)
        )
        Button(onClick = onRetry, modifier = Modifier.padding(top = 16.dp)) {
            Text("重试")
        }
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "暂无POS设备",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "该商户还没有绑定任何POS设备。",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}
