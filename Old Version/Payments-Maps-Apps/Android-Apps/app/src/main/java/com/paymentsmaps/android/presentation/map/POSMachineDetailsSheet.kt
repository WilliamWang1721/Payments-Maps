package com.paymentsmaps.android.presentation.map

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
import com.paymentsmaps.android.domain.model.POSType
import com.paymentsmaps.android.domain.model.PaymentMethod
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import com.paymentsmaps.android.domain.model.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * POS机详情底部表单
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSMachineDetailsSheet(
    posMachine: POSMachine,
    onDismiss: () -> Unit,
    onNavigateToMerchant: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // 拖拽指示器
            Box(
                modifier = Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                    .align(Alignment.CenterHorizontally)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // 标题栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = posMachine.serialNumber,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatusIndicator(
                            status = posMachine.status,
                            size = 12.dp
                        )
                        
                        Text(
                            text = getStatusDisplayName(posMachine.status),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        
                        Text(
                            text = "•",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        
                        Text(
                            text = getTypeDisplayName(posMachine.type),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = stringResource(R.string.close)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // 基本信息
            InfoSection(
                title = stringResource(R.string.basic_info),
                content = {
                    InfoItem(
                        icon = Icons.Default.LocationOn,
                        label = stringResource(R.string.address),
                        value = posMachine.location.address
                    )
                    
                    InfoItem(
                        icon = Icons.Default.LocationCity,
                        label = stringResource(R.string.city),
                        value = posMachine.location.city
                    )
                    
                    InfoItem(
                        icon = Icons.Default.Business,
                        label = stringResource(R.string.merchant_id),
                        value = posMachine.merchantId,
                        isClickable = true,
                        onClick = onNavigateToMerchant
                    )
                }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // 支付方式
            InfoSection(
                title = stringResource(R.string.supported_payment_methods),
                content = {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(posMachine.supportedPaymentMethods) { method ->
                            PaymentMethodCard(paymentMethod = method)
                        }
                    }
                }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // 设备信息
            InfoSection(
                title = stringResource(R.string.device_info),
                content = {
                    InfoItem(
                        icon = Icons.Default.Memory,
                        label = stringResource(R.string.model),
                        value = posMachine.model ?: "未知型号"
                    )
                    
                    InfoItem(
                        icon = Icons.Default.Build,
                        label = stringResource(R.string.manufacturer),
                        value = posMachine.manufacturer ?: "未知厂商"
                    )
                    
                    InfoItem(
                        icon = Icons.Default.Update,
                        label = stringResource(R.string.last_updated),
                        value = formatDate(posMachine.updatedAt)
                    )
                }
            )
            
            // 状态指示器
            if (posMachine.isOverDailyLimit || posMachine.needsMaintenance) {
                Spacer(modifier = Modifier.height(16.dp))
                
                StatusWarnings(
                    isOverDailyLimit = posMachine.isOverDailyLimit,
                    needsMaintenance = posMachine.needsMaintenance
                )
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // 操作按钮
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = { /* 导航到POS机 */ },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Directions,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.navigate))
                }
                
                Button(
                    onClick = onNavigateToMerchant,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Business,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.view_merchant))
                }
            }
        }
    }
}

/**
 * 信息分组
 */
@Composable
private fun InfoSection(
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
 * 信息项
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InfoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    isClickable: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    val modifier = if (isClickable && onClick != null) {
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
    } else {
        Modifier.fillMaxWidth()
    }
    
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = if (isClickable) {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            } else {
                Color.Transparent
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = if (isClickable) 12.dp else 0.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            
            if (isClickable) {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 支付方式卡片
 */
@Composable
private fun PaymentMethodCard(
    paymentMethod: PaymentMethod
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = getPaymentMethodIcon(paymentMethod),
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Text(
                text = getPaymentMethodDisplayName(paymentMethod),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 状态指示器
 */
@Composable
private fun StatusIndicator(
    status: POSStatus,
    size: androidx.compose.ui.unit.Dp
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(getStatusColor(status))
    )
}

/**
 * 状态警告
 */
@Composable
private fun StatusWarnings(
    isOverDailyLimit: Boolean,
    needsMaintenance: Boolean
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (isOverDailyLimit) {
            WarningCard(
                icon = Icons.Default.Warning,
                message = stringResource(R.string.over_daily_limit_warning),
                color = MaterialTheme.colorScheme.error
            )
        }
        
        if (needsMaintenance) {
            WarningCard(
                icon = Icons.Default.Build,
                message = stringResource(R.string.maintenance_required_warning),
                color = MaterialTheme.colorScheme.tertiary
            )
        }
    }
}

/**
 * 警告卡片
 */
@Composable
private fun WarningCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    message: String,
    color: Color
) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = color
            )
            
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = color
            )
        }
    }
}

/**
 * 格式化日期
 */
private fun formatDate(date: LocalDateTime): String {
    val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    return date.format(formatter)
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
        POSStatus.PENDING -> "待激活"
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
        PaymentMethod.NFC -> "近场通信"
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
        PaymentMethod.WECHAT_PAY -> Icons.Default.PhoneAndroid
        PaymentMethod.ALIPAY -> Icons.Default.PhoneAndroid
        PaymentMethod.UNION_PAY -> Icons.Default.CreditCard
        PaymentMethod.DIGITAL_CURRENCY -> Icons.Default.CurrencyBitcoin
        PaymentMethod.NFC -> Icons.Default.Contactless
    }
}