package com.paymentsmaps.android.presentation.merchant

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallTopAppBar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch

/**
 * 商户管理页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantManagementScreen(
    onNavigateToMerchantDetail: (String) -> Unit,
    onNavigateToAddMerchant: () -> Unit,
    onNavigateToEditMerchant: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MerchantManagementViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior(rememberTopAppBarState())

    LaunchedEffect(uiState.error) {
        uiState.error?.let { message ->
            scope.launch { snackbarHostState.showSnackbar(message) }
        }
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            SmallTopAppBar(
                title = {
                    Column {
                        Text(
                            text = "商户管理",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "管理商户基础信息及POS设备",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadMerchants() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "刷新")
                    }
                },
                scrollBehavior = scrollBehavior
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToAddMerchant,
                icon = { Icon(imageVector = Icons.Default.Add, contentDescription = null) },
                text = { Text("新增商户") }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.surface,
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = {
                    viewModel.updateSearchQuery(it)
                },
                label = { Text("搜索商户或编号") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                leadingIcon = {
                    Icon(imageVector = Icons.Default.Business, contentDescription = null)
                }
            )

            SummarySection(uiState = uiState)

            AnimatedVisibility(
                visible = uiState.isLoading,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                LoadingPlaceholders()
            }

            AnimatedVisibility(
                visible = !uiState.isLoading,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                if (uiState.filteredMerchants.isEmpty()) {
                    EmptyState(onClearSearch = {
                        focusManager.clearFocus()
                        if (uiState.searchQuery.isNotBlank()) {
                            viewModel.updateSearchQuery("")
                        }
                    })
                } else {
                    MerchantList(
                        merchants = uiState.filteredMerchants,
                        onNavigateToMerchantDetail = onNavigateToMerchantDetail,
                        onNavigateToEditMerchant = onNavigateToEditMerchant
                    )
                }
            }
        }
    }
}

@Composable
private fun SummarySection(uiState: MerchantManagementUiState) {
    val totalPOS = uiState.merchants.sumOf { it.totalPOS }
    val active = uiState.merchants.sumOf { it.activeCount }
    val inactive = uiState.merchants.sumOf { it.inactiveCount }
    val maintenance = uiState.merchants.sumOf { it.maintenanceCount }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SummaryBadge(title = "商户数", value = uiState.merchants.size.toString())
        SummaryBadge(title = "POS总数", value = totalPOS.toString())
        SummaryBadge(title = "活跃", value = active.toString(), color = MaterialTheme.colorScheme.primary)
        SummaryBadge(title = "维护中", value = maintenance.toString(), color = MaterialTheme.colorScheme.tertiary)
        SummaryBadge(title = "停用", value = inactive.toString(), color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun SummaryBadge(title: String, value: String, color: Color? = null) {
    AssistChip(
        onClick = {},
        enabled = false,
        label = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = title, style = MaterialTheme.typography.labelSmall)
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        shape = RoundedCornerShape(16.dp),
        colors = AssistChipDefaults.assistChipColors(
            containerColor = color?.copy(alpha = 0.12f) ?: MaterialTheme.colorScheme.surfaceVariant,
            disabledContainerColor = color?.copy(alpha = 0.12f) ?: MaterialTheme.colorScheme.surfaceVariant,
            labelColor = color ?: MaterialTheme.colorScheme.onSurfaceVariant,
            disabledLabelColor = color ?: MaterialTheme.colorScheme.onSurfaceVariant
        )
    )
}

@Composable
private fun MerchantList(
    merchants: List<MerchantSummary>,
    onNavigateToMerchantDetail: (String) -> Unit,
    onNavigateToEditMerchant: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(merchants, key = { it.merchantId }) { summary ->
            MerchantCard(
                summary = summary,
                onNavigateToMerchantDetail = onNavigateToMerchantDetail,
                onNavigateToEditMerchant = onNavigateToEditMerchant
            )
        }
    }
}

@Composable
private fun MerchantCard(
    summary: MerchantSummary,
    onNavigateToMerchantDetail: (String) -> Unit,
    onNavigateToEditMerchant: (String) -> Unit
) {
    ElevatedCard(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .clickable { onNavigateToMerchantDetail(summary.merchantId) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = summary.merchantName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "编号：${summary.merchantId}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                IconButton(onClick = { onNavigateToEditMerchant(summary.merchantId) }) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = "编辑商户")
                }
            }

            StatusRow(summary = summary)

            summary.addressSample?.let { address ->
                Text(
                    text = address,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Text(
                text = "更新于 ${summary.lastUpdated}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun StatusRow(summary: MerchantSummary) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatusBadge("POS", summary.totalPOS.toString(), MaterialTheme.colorScheme.primary)
        StatusBadge("活跃", summary.activeCount.toString(), MaterialTheme.colorScheme.primary)
        StatusBadge("维护", summary.maintenanceCount.toString(), MaterialTheme.colorScheme.tertiary)
        StatusBadge("停用", summary.inactiveCount.toString(), MaterialTheme.colorScheme.error)
        StatusBadge("离线", summary.offlineCount.toString(), MaterialTheme.colorScheme.secondary)
    }
}

@Composable
private fun StatusBadge(label: String, value: String, color: Color) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.1f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun LoadingPlaceholders() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(3) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f))
            )
        }
    }
}

@Composable
private fun EmptyState(onClearSearch: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 64.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Business,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp)
            )
        }
        Text(
            text = "未找到相关商户",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "请尝试调整关键字或重置筛选条件。",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        TextButton(onClick = onClearSearch) {
            Text("清除搜索条件")
        }
    }
}
