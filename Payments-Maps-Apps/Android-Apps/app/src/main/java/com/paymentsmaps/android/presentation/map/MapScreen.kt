package com.paymentsmaps.android.presentation.map

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paymentsmaps.android.R
import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.presentation.theme.*

/**
 * 地图主页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    onNavigateToMerchant: (String) -> Unit,
    onNavigateToSettings: () -> Unit,
    viewModel: MapViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val posMachines by viewModel.posMachines.collectAsStateWithLifecycle()
    val selectedPOSMachine by viewModel.selectedPOSMachine.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val filters by viewModel.filters.collectAsStateWithLifecycle()
    
    val context = LocalContext.current
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // 地图视图
        MapView(
            posMachines = posMachines,
            selectedPOSMachine = selectedPOSMachine,
            onPOSMachineClick = { posMachine -> viewModel.selectPOSMachine(posMachine) },
            onMapClick = { viewModel.deselectPOSMachine() },
            onCameraMove = viewModel::updateCameraPosition,
            modifier = Modifier.fillMaxSize()
        )
        
        // POS机详情底部表单
        AnimatedVisibility(
            visible = uiState.showPOSDetails && selectedPOSMachine != null,
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            selectedPOSMachine?.let { posMachine ->
                POSMachineDetailsSheet(
                    posMachine = posMachine,
                    onDismiss = viewModel::deselectPOSMachine,
                    onNavigateToMerchant = { onNavigateToMerchant(posMachine.merchantId) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                )
            }
        }
        
        // 顶部搜索栏
        TopSearchBar(
            searchQuery = searchQuery,
            onSearchQueryChange = viewModel::updateSearchQuery,
            onSearchClick = viewModel::toggleSearch,
            onFilterClick = viewModel::toggleFilters,
            onSettingsClick = onNavigateToSettings,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
        
        // 搜索结果列表
        AnimatedVisibility(
            visible = uiState.showSearch && searchQuery.isNotEmpty(),
            enter = slideInVertically() + fadeIn(),
            exit = slideOutVertically() + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 80.dp)
        ) {
            SearchResultsList(
                posMachines = posMachines,
                onPOSMachineClick = { posMachine ->
                    viewModel.selectPOSMachine(posMachine)
                    viewModel.toggleSearch()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
        }
        
        // 过滤器面板
        AnimatedVisibility(
            visible = uiState.showFilters,
            enter = slideInHorizontally { it } + fadeIn(),
            exit = slideOutHorizontally { it } + fadeOut(),
            modifier = Modifier.align(Alignment.CenterEnd)
        ) {
            FilterPanel(
                filters = filters,
                onFiltersChange = viewModel::updateFilters,
                onDismiss = viewModel::toggleFilters,
                modifier = Modifier
                    .fillMaxHeight()
                    .width(320.dp)
            )
        }
        
        // 浮动操作按钮
        FloatingActionButton(
            onClick = viewModel::refresh,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            containerColor = MaterialTheme.colorScheme.primary
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = stringResource(R.string.refresh)
            )
        }
        
        // 加载指示器
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
        
        // 错误提示
        uiState.error?.let { error ->
            LaunchedEffect(error) {
                // 显示错误Snackbar
            }
        }
    }
}

/**
 * 顶部搜索栏
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TopSearchBar(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onSearchClick: () -> Unit,
    onFilterClick: () -> Unit,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onSearchClick) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = stringResource(R.string.search),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                placeholder = {
                    Text(
                        text = stringResource(R.string.search_pos_machines),
                        style = MaterialTheme.typography.bodyMedium
                    )
                },
                modifier = Modifier.weight(1f),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent
                )
            )
            
            IconButton(onClick = onFilterClick) {
                Icon(
                    imageVector = Icons.Default.FilterList,
                    contentDescription = stringResource(R.string.filter),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            IconButton(onClick = onSettingsClick) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = stringResource(R.string.settings),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 搜索结果列表
 */
@Composable
private fun SearchResultsList(
    posMachines: List<POSMachine>,
    onPOSMachineClick: (POSMachine) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 300.dp),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(posMachines) { posMachine ->
                POSMachineSearchItem(
                    posMachine = posMachine,
                    onClick = { onPOSMachineClick(posMachine) }
                )
            }
        }
    }
}

/**
 * POS机搜索项
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun POSMachineSearchItem(
    posMachine: POSMachine,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 状态指示器
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(getStatusColor(posMachine.status))
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = posMachine.serialNumber,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                
                Text(
                    text = posMachine.location.address ?: "未知地址",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 获取状态颜色
 */
@Composable
private fun getStatusColor(status: POSStatus): Color {
    return when (status) {
        POSStatus.ACTIVE -> MaterialTheme.colorScheme.primary
        POSStatus.INACTIVE -> MaterialTheme.colorScheme.outline
        POSStatus.MAINTENANCE -> MaterialTheme.colorScheme.tertiary
        POSStatus.OFFLINE -> MaterialTheme.colorScheme.error
        POSStatus.ERROR -> MaterialTheme.colorScheme.error
        POSStatus.PENDING -> MaterialTheme.colorScheme.secondary
    }
}