package com.paymentsmaps.android.presentation.map

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paymentsmaps.android.R
import com.paymentsmaps.android.domain.model.*

/**
 * 过滤器面板
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterPanel(
    filters: MapFilters,
    onFiltersChange: (MapFilters) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(topStart = 16.dp, bottomStart = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // 标题栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "过滤器",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "关闭"
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // POS机状态过滤
                item {
                    FilterSection(
                        title = "POS机状态",
                        content = {
                            StatusFilterChips(
                                selectedStatuses = filters.selectedStatuses,
                                onStatusToggle = { status ->
                                    val newStatuses = if (status in filters.selectedStatuses) {
                                        filters.selectedStatuses - status
                                    } else {
                                        filters.selectedStatuses + status
                                    }
                                    onFiltersChange(filters.copy(selectedStatuses = newStatuses))
                                }
                            )
                        }
                    )
                }
                
                // POS机类型过滤
                item {
                    FilterSection(
                        title = "POS机类型",
                        content = {
                            TypeFilterChips(
                                selectedTypes = filters.selectedTypes,
                                onTypeToggle = { type ->
                                    val newTypes = if (type in filters.selectedTypes) {
                                        filters.selectedTypes - type
                                    } else {
                                        filters.selectedTypes + type
                                    }
                                    onFiltersChange(filters.copy(selectedTypes = newTypes))
                                }
                            )
                        }
                    )
                }
                
                // 支付方式过滤
                item {
                    FilterSection(
                        title = "支付方式",
                        content = {
                            PaymentMethodFilterChips(
                                selectedMethods = filters.selectedPaymentMethods,
                                onMethodToggle = { method ->
                                    val newMethods = if (method in filters.selectedPaymentMethods) {
                                        filters.selectedPaymentMethods - method
                                    } else {
                                        filters.selectedPaymentMethods + method
                                    }
                                    onFiltersChange(filters.copy(selectedPaymentMethods = newMethods))
                                }
                            )
                        }
                    )
                }
                
                // 距离过滤
                item {
                    FilterSection(
                        title = "距离范围",
                        content = {
                            DistanceFilter(
                                maxDistance = filters.maxDistance,
                                onDistanceChange = { distance ->
                                    onFiltersChange(filters.copy(maxDistance = distance))
                                }
                            )
                        }
                    )
                }
                
                // 操作按钮
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                onFiltersChange(MapFilters())
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("清除全部")
                        }
                        
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("应用")
                        }
                    }
                }
            }
        }
    }
}

/**
 * 过滤器分组
 */
@Composable
private fun FilterSection(
    title: String,
    content: @Composable () -> Unit
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        content()
    }
}

/**
 * 状态过滤芯片
 */
@Composable
private fun StatusFilterChips(
    selectedStatuses: Set<POSStatus>,
    onStatusToggle: (POSStatus) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(POSStatus.values()) { status ->
            FilterChip(
                selected = status in selectedStatuses,
                onClick = { onStatusToggle(status) },
                label = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(getStatusColor(status))
                        )
                        
                        Text(
                            text = getStatusDisplayName(status),
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            )
        }
    }
}

/**
 * 类型过滤芯片
 */
@Composable
private fun TypeFilterChips(
    selectedTypes: Set<POSType>,
    onTypeToggle: (POSType) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(POSType.values()) { type ->
            FilterChip(
                selected = type in selectedTypes,
                onClick = { onTypeToggle(type) },
                label = {
                    Text(
                        text = getTypeDisplayName(type),
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                leadingIcon = {
                    Icon(
                        imageVector = getTypeIcon(type),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                }
            )
        }
    }
}

/**
 * 支付方式过滤芯片
 */
@Composable
private fun PaymentMethodFilterChips(
    selectedMethods: Set<PaymentMethod>,
    onMethodToggle: (PaymentMethod) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(PaymentMethod.values()) { method ->
            FilterChip(
                selected = method in selectedMethods,
                onClick = { onMethodToggle(method) },
                label = {
                    Text(
                        text = getPaymentMethodDisplayName(method),
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                leadingIcon = {
                    Icon(
                        imageVector = getPaymentMethodIcon(method),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                }
            )
        }
    }
}

/**
 * 距离过滤器
 */
@Composable
private fun DistanceFilter(
    maxDistance: Double?,
    onDistanceChange: (Double?) -> Unit
) {
    var sliderValue by remember(maxDistance) {
        mutableFloatStateOf(maxDistance?.toFloat() ?: 10f)
    }
    
    var isEnabled by remember(maxDistance) {
        mutableStateOf(maxDistance != null)
    }
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "启用距离过滤",
                style = MaterialTheme.typography.bodyMedium
            )
            
            Switch(
                checked = isEnabled,
                onCheckedChange = { enabled ->
                    isEnabled = enabled
                    onDistanceChange(if (enabled) sliderValue.toDouble() else null)
                }
            )
        }
        
        if (isEnabled) {
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = "最大距离: ${sliderValue.toInt()} 公里",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Slider(
                value = sliderValue,
                onValueChange = { value ->
                    sliderValue = value
                    onDistanceChange(value.toDouble())
                },
                valueRange = 1f..50f,
                steps = 49,
                modifier = Modifier.fillMaxWidth()
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

/**
 * 获取状态显示名称
 */
private fun getStatusDisplayName(status: POSStatus): String {
    return when (status) {
        POSStatus.ACTIVE -> "活跃"
        POSStatus.INACTIVE -> "非活跃"
        POSStatus.MAINTENANCE -> "维护中"
        POSStatus.OFFLINE -> "离线"
        POSStatus.ERROR -> "错误"
        POSStatus.PENDING -> "待处理"
    }
}

/**
 * 获取类型显示名称
 */
private fun getTypeDisplayName(type: POSType): String {
    return when (type) {
        POSType.FIXED -> "固定式"
        POSType.MOBILE -> "移动式"
        POSType.WIRELESS -> "无线式"
        POSType.VIRTUAL -> "虚拟式"
        POSType.COUNTERTOP -> "台式"
        POSType.PORTABLE -> "便携式"
    }
}

/**
 * 获取类型图标
 */
private fun getTypeIcon(type: POSType): androidx.compose.ui.graphics.vector.ImageVector {
    return when (type) {
        POSType.FIXED -> Icons.Default.Store
        POSType.MOBILE -> Icons.Default.PhoneAndroid
        POSType.WIRELESS -> Icons.Default.Wifi
        POSType.VIRTUAL -> Icons.Default.Cloud
        POSType.COUNTERTOP -> Icons.Default.Computer
        POSType.PORTABLE -> Icons.Default.Tablet
    }
}

/**
 * 获取支付方式显示名称
 */
private fun getPaymentMethodDisplayName(method: PaymentMethod): String {
    return when (method) {
        PaymentMethod.CREDIT_CARD -> "信用卡"
        PaymentMethod.DEBIT_CARD -> "借记卡"
        PaymentMethod.CONTACTLESS -> "非接触式"
        PaymentMethod.MOBILE_PAYMENT -> "移动支付"
        PaymentMethod.QR_CODE -> "二维码"
        PaymentMethod.CASH -> "现金"
        PaymentMethod.BANK_CARD -> "银行卡"
        PaymentMethod.WECHAT_PAY -> "微信支付"
        PaymentMethod.ALIPAY -> "支付宝"
        PaymentMethod.UNION_PAY -> "银联"
        PaymentMethod.DIGITAL_CURRENCY -> "数字货币"
        PaymentMethod.NFC -> "NFC支付"
    }
}

/**
 * 获取支付方式图标
 */
private fun getPaymentMethodIcon(method: PaymentMethod): androidx.compose.ui.graphics.vector.ImageVector {
    return when (method) {
        PaymentMethod.CREDIT_CARD -> Icons.Default.CreditCard
        PaymentMethod.DEBIT_CARD -> Icons.Default.CreditCard
        PaymentMethod.CONTACTLESS -> Icons.Default.Contactless
        PaymentMethod.MOBILE_PAYMENT -> Icons.Default.PhoneAndroid
        PaymentMethod.QR_CODE -> Icons.Default.QrCode
        PaymentMethod.CASH -> Icons.Default.AttachMoney
        PaymentMethod.BANK_CARD -> Icons.Default.CreditCard
        PaymentMethod.WECHAT_PAY -> Icons.Default.Chat
        PaymentMethod.ALIPAY -> Icons.Default.AccountBalanceWallet
        PaymentMethod.UNION_PAY -> Icons.Default.CreditCard
        PaymentMethod.DIGITAL_CURRENCY -> Icons.Default.CurrencyBitcoin
        PaymentMethod.NFC -> Icons.Default.Nfc
    }
}