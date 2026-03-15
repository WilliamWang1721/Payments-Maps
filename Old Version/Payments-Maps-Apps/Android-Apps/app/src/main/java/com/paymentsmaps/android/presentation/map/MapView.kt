package com.paymentsmaps.android.presentation.map

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.viewinterop.AndroidView
import com.amap.api.maps.AMap
import com.amap.api.maps.CameraUpdateFactory
import com.amap.api.maps.MapView as AmapMapView
import com.amap.api.maps.model.*
import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.utils.EmulatorDetector

/**
 * 地图视图组件 - 智能适配模拟器和真机
 */
@Composable
fun MapView(
    posMachines: List<POSMachine>,
    selectedPOSMachine: POSMachine?,
    onPOSMachineClick: (POSMachine) -> Unit,
    onMapClick: () -> Unit,
    onCameraMove: (Location) -> Unit,
    modifier: Modifier = Modifier
) {
    val emulatorConfig = remember { EmulatorDetector.getEmulatorConfig() }
    
    if (emulatorConfig.isEmulator && emulatorConfig.useSimpleRendering) {
        // 模拟器使用优化的UI界面
        EmulatorOptimizedMapView(
            posMachines = posMachines,
            selectedPOSMachine = selectedPOSMachine,
            onPOSMachineClick = onPOSMachineClick,
            onMapClick = onMapClick,
            onCameraMove = onCameraMove,
            modifier = modifier,
            config = emulatorConfig
        )
    } else {
        // 真机使用完整的地图功能
        RealDeviceMapView(
            posMachines = posMachines,
            selectedPOSMachine = selectedPOSMachine,
            onPOSMachineClick = onPOSMachineClick,
            onMapClick = onMapClick,
            onCameraMove = onCameraMove,
            modifier = modifier,
            config = emulatorConfig
        )
    }
}

/**
 * 模拟器优化版地图视图
 */
@Composable
private fun EmulatorOptimizedMapView(
    posMachines: List<POSMachine>,
    selectedPOSMachine: POSMachine?,
    onPOSMachineClick: (POSMachine) -> Unit,
    onMapClick: () -> Unit,
    onCameraMove: (Location) -> Unit,
    modifier: Modifier = Modifier,
    config: EmulatorDetector.EmulatorConfig
) {
    // Material 3 渐变背景
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.surface,
                        MaterialTheme.colorScheme.background
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.padding(24.dp)
        ) {
            // 模拟器提示卡片
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PhoneAndroid,
                        contentDescription = "模拟器模式",
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(24.dp)
                    )
                    
                    Text(
                        text = "模拟器优化模式",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // Material 3 Hero图标区域
            Card(
                modifier = Modifier.size(120.dp),
                shape = RoundedCornerShape(28.dp), // Material 3 圆角
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ),
                elevation = CardDefaults.cardElevation(
                    defaultElevation = 6.dp // Material 3 提升
                )
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Map,
                        contentDescription = "地图",
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
            
            // Material 3 标题组
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "支付地图",
                    style = MaterialTheme.typography.displaySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold
                )
                
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "发现 ${posMachines.size} 台POS设备",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }
            
            // Material 3 统计卡片
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val statusCounts = posMachines.groupBy { it.status }.mapValues { it.value.size }
                
                StatusCard(
                    title = "活跃",
                    count = statusCounts[POSStatus.ACTIVE] ?: 0,
                    color = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.weight(1f)
                )
                StatusCard(
                    title = "离线", 
                    count = statusCounts[POSStatus.OFFLINE] ?: 0,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.weight(1f)
                )
                StatusCard(
                    title = "维护",
                    count = statusCounts[POSStatus.MAINTENANCE] ?: 0,
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.weight(1f)
                )
            }
            
            // Material 3 设备列表
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                LazyColumn(
                    contentPadding = PaddingValues(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            text = "附近设备",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }
                    
                    items(posMachines.take(10)) { posMachine ->
                        POSMachineCard(
                            posMachine = posMachine,
                            isSelected = posMachine.id == selectedPOSMachine?.id,
                            onClick = { onPOSMachineClick(posMachine) }
                        )
                    }
                    
                    if (posMachines.size > 10) {
                        item {
                            TextButton(
                                onClick = { /* 查看更多 */ },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("查看全部 ${posMachines.size} 台设备")
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .padding(start = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * 真机版地图视图（完整功能）
 */
@Composable
private fun RealDeviceMapView(
    posMachines: List<POSMachine>,
    selectedPOSMachine: POSMachine?,
    onPOSMachineClick: (POSMachine) -> Unit,
    onMapClick: () -> Unit,
    onCameraMove: (Location) -> Unit,
    modifier: Modifier = Modifier,
    config: EmulatorDetector.EmulatorConfig
) {
    // 双重检查：如果是模拟器，回退到优化版本
    if (config.isEmulator) {
        EmulatorOptimizedMapView(
            posMachines = posMachines,
            selectedPOSMachine = selectedPOSMachine,
            onPOSMachineClick = onPOSMachineClick,
            onMapClick = onMapClick,
            onCameraMove = onCameraMove,
            modifier = modifier,
            config = config
        )
        return
    }
    
    val context = LocalContext.current
    var aMap by remember { mutableStateOf<AMap?>(null) }
    
    // 默认位置（北京）
    val defaultLocation = LatLng(39.9042, 116.4074)
    
    AndroidView(
        factory = { context ->
            AmapMapView(context).apply {
                // 根据设备类型配置硬件加速
                if (config.disableHardwareAcceleration) {
                    setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)
                }
                
                onCreate(null)
                onResume()
                
                val map = this.map
                aMap = map
                
                // 设置地图类型
                map.mapType = AMap.MAP_TYPE_NORMAL
                
                // 禁用定位功能（避免权限问题）
                map.isMyLocationEnabled = false
                map.uiSettings.isMyLocationButtonEnabled = false
                
                // 设置默认相机位置
                map.moveCamera(CameraUpdateFactory.newLatLngZoom(defaultLocation, 10f))
                
                // 设置地图点击监听
                map.setOnMapClickListener { 
                    onMapClick()
                }
                
                // 设置相机移动监听
                map.setOnCameraChangeListener(object : AMap.OnCameraChangeListener {
                    override fun onCameraChange(position: CameraPosition) {
                        // 相机移动中
                    }
                    
                    override fun onCameraChangeFinish(position: CameraPosition) {
                        // 相机移动完成
                        val latLng = position.target
                        onCameraMove(Location(
                            latitude = latLng.latitude,
                            longitude = latLng.longitude,
                            address = "",
                            city = "",
                            province = "",
                            postalCode = null
                        ))
                    }
                })
                
                // 添加POS机标记
                updateMarkers(map, posMachines, selectedPOSMachine, onPOSMachineClick)
            }
        },
        modifier = modifier
    ) { mapView ->
        // 当POS机数据或选中状态改变时更新标记
        aMap?.let { map ->
            updateMarkers(map, posMachines, selectedPOSMachine, onPOSMachineClick)
        }
    }
    
    // 当选中POS机改变时，移动相机
    LaunchedEffect(selectedPOSMachine) {
        selectedPOSMachine?.let { posMachine ->
            aMap?.let { map ->
                val latLng = LatLng(posMachine.location.latitude, posMachine.location.longitude)
                map.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f), 1000, null)
            }
        }
    }
}

/**
 * Material 3 状态统计卡片
 */
@Composable
private fun StatusCard(
    title: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(color, CircleShape)
            )
            
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold
            )
            
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Material 3 增强版POS机卡片
 */
@Composable
private fun POSMachineCard(
    posMachine: POSMachine,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp), // Material 3 大圆角
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) 
                MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 8.dp else 4.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Material 3 状态指示器
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = getStatusColor(posMachine.status).copy(alpha = 0.12f)
                ),
                modifier = Modifier.size(48.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Icon(
                        imageVector = getStatusIcon(posMachine.status),
                        contentDescription = null,
                        tint = getStatusColor(posMachine.status),
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            
            // 设备信息
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = posMachine.serialNumber,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (isSelected) 
                        MaterialTheme.colorScheme.onPrimaryContainer
                    else MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold
                )
                
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = getStatusColor(posMachine.status).copy(alpha = 0.15f),
                    modifier = Modifier.padding(vertical = 2.dp)
                ) {
                    Text(
                        text = getStatusText(posMachine.status),
                        style = MaterialTheme.typography.labelMedium,
                        color = getStatusColor(posMachine.status),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontWeight = FontWeight.Medium
                    )
                }
                
                Text(
                    text = posMachine.location.address,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isSelected)
                        MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            
            // Material 3 动作按钮
            if (isSelected) {
                FilledIconButton(
                    onClick = onClick,
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Visibility,
                        contentDescription = "查看详情",
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            } else {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

/**
 * 更新地图标记
 */
private fun updateMarkers(
    aMap: AMap,
    posMachines: List<POSMachine>,
    selectedPOSMachine: POSMachine?,
    onPOSMachineClick: (POSMachine) -> Unit
) {
    // 清除现有标记
    aMap.clear()
    
    // 添加POS机标记
    posMachines.forEach { posMachine ->
        val latLng = LatLng(posMachine.location.latitude, posMachine.location.longitude)
        val markerColor = getAmapMarkerColor(posMachine.status)
        val isSelected = posMachine.id == selectedPOSMachine?.id
        
        val marker = aMap.addMarker(
            MarkerOptions()
                .position(latLng)
                .title(posMachine.serialNumber)
                .snippet(posMachine.location.address)
                .icon(BitmapDescriptorFactory.defaultMarker(markerColor))
                .alpha(if (isSelected) 1.0f else 0.8f)
        )
        
        // 设置标记点击监听
        marker?.setObject(posMachine)
    }
    
    // 设置标记点击监听
    aMap.setOnMarkerClickListener { marker ->
        val posMachine = marker.`object` as? POSMachine
        posMachine?.let { onPOSMachineClick(it) }
        true
    }
}

/**
 * 获取高德地图标记颜色
 */
private fun getAmapMarkerColor(status: POSStatus): Float {
    return when (status) {
        POSStatus.ACTIVE -> BitmapDescriptorFactory.HUE_GREEN
        POSStatus.INACTIVE -> BitmapDescriptorFactory.HUE_VIOLET
        POSStatus.MAINTENANCE -> BitmapDescriptorFactory.HUE_YELLOW
        POSStatus.OFFLINE -> BitmapDescriptorFactory.HUE_RED
        POSStatus.ERROR -> BitmapDescriptorFactory.HUE_RED
        POSStatus.PENDING -> BitmapDescriptorFactory.HUE_BLUE
    }
}

/**
 * POS机信息窗口
 */
@Composable
private fun POSMachineInfoWindow(
    posMachine: POSMachine
) {
    Card(
        modifier = Modifier
            .width(200.dp),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 4.dp
        )
    ) {
        Column(
            modifier = Modifier
                .padding(12.dp)
        ) {
            Text(
                text = posMachine.serialNumber,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusIndicator(
                    status = posMachine.status,
                    size = 8.dp
                )
                
                Spacer(modifier = Modifier.width(6.dp))
                
                Text(
                    text = getStatusText(posMachine.status),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = posMachine.location.address ?: "未知地址",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                posMachine.supportedPaymentMethods.take(3).forEach { method ->
                    PaymentMethodChip(
                        paymentMethod = method,
                        size = PaymentMethodChipSize.SMALL
                    )
                }
                
                if (posMachine.supportedPaymentMethods.size > 3) {
                    Text(
                        text = "+${posMachine.supportedPaymentMethods.size - 3}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * 状态指示器
 */
@Composable
private fun StatusIndicator(
    status: POSStatus,
    size: Dp
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(getStatusColor(status))
    )
}

/**
 * 支付方式芯片
 */
@Composable
private fun PaymentMethodChip(
    paymentMethod: PaymentMethod,
    size: PaymentMethodChipSize = PaymentMethodChipSize.MEDIUM
) {
    val chipSize = when (size) {
        PaymentMethodChipSize.SMALL -> 16.dp
        PaymentMethodChipSize.MEDIUM -> 20.dp
        PaymentMethodChipSize.LARGE -> 24.dp
    }
    
    Box(
        modifier = Modifier
            .size(chipSize)
            .clip(CircleShape)
            .background(
                getPaymentMethodColor(paymentMethod)
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = getPaymentMethodIcon(paymentMethod),
            style = MaterialTheme.typography.labelSmall,
            color = Color.White
        )
    }
}

/**
 * 获取标记颜色
 */
private fun getMarkerColor(status: POSStatus): POSMarkerColor {
    return when (status) {
        POSStatus.ACTIVE -> POSMarkerColor.GREEN
        POSStatus.INACTIVE -> POSMarkerColor.GRAY
        POSStatus.MAINTENANCE -> POSMarkerColor.YELLOW
        POSStatus.OFFLINE -> POSMarkerColor.RED
        POSStatus.ERROR -> POSMarkerColor.RED
        POSStatus.PENDING -> POSMarkerColor.BLUE
    }
}

/**
 * 获取状态图标
 */
private fun getStatusIcon(status: POSStatus): ImageVector {
    return when (status) {
        POSStatus.ACTIVE -> Icons.Default.CheckCircle
        POSStatus.INACTIVE -> Icons.Default.Pause
        POSStatus.MAINTENANCE -> Icons.Default.Build
        POSStatus.OFFLINE -> Icons.Default.SignalWifiOff
        POSStatus.ERROR -> Icons.Default.Error
        POSStatus.PENDING -> Icons.Default.Schedule
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
 * 获取状态文本
 */
private fun getStatusText(status: POSStatus): String {
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
 * 获取支付方式颜色
 */
@Composable
private fun getPaymentMethodColor(paymentMethod: PaymentMethod): Color {
    return when (paymentMethod) {
        PaymentMethod.CREDIT_CARD -> Color(0xFF1976D2)
        PaymentMethod.DEBIT_CARD -> Color(0xFF388E3C)
        PaymentMethod.CONTACTLESS -> Color(0xFFFF9800)
        PaymentMethod.MOBILE_PAYMENT -> Color(0xFF9C27B0)
        PaymentMethod.QR_CODE -> Color(0xFFE91E63)
        PaymentMethod.CASH -> Color(0xFF795548)
        PaymentMethod.BANK_CARD -> Color(0xFF2196F3)
        PaymentMethod.WECHAT_PAY -> Color(0xFF4CAF50)
        PaymentMethod.ALIPAY -> Color(0xFF009688)
        PaymentMethod.UNION_PAY -> Color(0xFFFF5722)
        PaymentMethod.DIGITAL_CURRENCY -> Color(0xFF9E9E9E)
        PaymentMethod.NFC -> Color(0xFF607D8B)
    }
}

/**
 * 获取支付方式图标
 */
private fun getPaymentMethodIcon(paymentMethod: PaymentMethod): String {
    return when (paymentMethod) {
        PaymentMethod.CREDIT_CARD -> "💳"
        PaymentMethod.DEBIT_CARD -> "💳"
        PaymentMethod.CONTACTLESS -> "📱"
        PaymentMethod.MOBILE_PAYMENT -> "📱"
        PaymentMethod.QR_CODE -> "📱"
        PaymentMethod.CASH -> "💵"
        PaymentMethod.BANK_CARD -> "💳"
        PaymentMethod.WECHAT_PAY -> "📱"
        PaymentMethod.ALIPAY -> "📱"
        PaymentMethod.UNION_PAY -> "💳"
        PaymentMethod.DIGITAL_CURRENCY -> "₿"
        PaymentMethod.NFC -> "📱"
    }
}

/**
 * POS机标记颜色枚举
 */
private enum class POSMarkerColor {
    GREEN, RED, YELLOW, BLUE, GRAY
}

/**
 * 支付方式芯片大小枚举
 */
private enum class PaymentMethodChipSize {
    SMALL, MEDIUM, LARGE
}