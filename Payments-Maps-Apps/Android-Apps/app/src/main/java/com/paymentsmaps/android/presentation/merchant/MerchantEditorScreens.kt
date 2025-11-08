package com.paymentsmaps.android.presentation.merchant

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * 新增商户表单
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMerchantScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    MerchantFormScreen(
        title = "新增商户",
        primaryButtonLabel = "保存商户",
        onNavigateBack = onNavigateBack
    )
}

/**
 * 编辑商户表单
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditMerchantScreen(
    merchantId: String,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    MerchantFormScreen(
        title = "编辑商户",
        primaryButtonLabel = "更新商户",
        onNavigateBack = onNavigateBack,
        subtitle = "商户ID：$merchantId"
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MerchantFormScreen(
    title: String,
    primaryButtonLabel: String,
    onNavigateBack: () -> Unit,
    subtitle: String? = null
) {
    val nameState = remember { mutableStateOf("") }
    val contactState = remember { mutableStateOf("") }
    val phoneState = remember { mutableStateOf("") }
    val addressState = remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "返回")
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
                .padding(padding)
                .padding(16.dp),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                OutlinedTextField(
                    value = nameState.value,
                    onValueChange = { nameState.value = it },
                    label = { Text("商户名称") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = contactState.value,
                    onValueChange = { contactState.value = it },
                    label = { Text("联系人") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = phoneState.value,
                    onValueChange = { phoneState.value = it },
                    label = { Text("联系电话") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = addressState.value,
                    onValueChange = { addressState.value = it },
                    label = { Text("营业地址") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "表单保存后将提交至后台服务（示例表单，未连接实际接口）",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Button(
                    onClick = onNavigateBack,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(primaryButtonLabel)
                }
            }
        }
    }
}

/**
 * 新增POS机表单
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPOSMachineScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    POSMachineFormScreen(
        title = "新增POS设备",
        primaryButtonLabel = "保存POS设备",
        onNavigateBack = onNavigateBack
    )
}

/**
 * 编辑POS机表单
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditPOSMachineScreen(
    posMachineId: String,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    POSMachineFormScreen(
        title = "编辑POS设备",
        primaryButtonLabel = "更新POS设备",
        onNavigateBack = onNavigateBack,
        subtitle = "设备ID：$posMachineId"
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun POSMachineFormScreen(
    title: String,
    primaryButtonLabel: String,
    onNavigateBack: () -> Unit,
    subtitle: String? = null
) {
    val serialState = remember { mutableStateOf("") }
    val merchantState = remember { mutableStateOf("") }
    val modelState = remember { mutableStateOf("") }
    val addressState = remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "返回")
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
                .padding(padding)
                .padding(16.dp),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                OutlinedTextField(
                    value = serialState.value,
                    onValueChange = { serialState.value = it },
                    label = { Text("设备序列号") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = merchantState.value,
                    onValueChange = { merchantState.value = it },
                    label = { Text("所属商户ID") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = modelState.value,
                    onValueChange = { modelState.value = it },
                    label = { Text("设备型号") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = addressState.value,
                    onValueChange = { addressState.value = it },
                    label = { Text("安装地址") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "填写完成后可提交到后台（示例表单，未连接实际接口）",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Button(
                    onClick = onNavigateBack,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(primaryButtonLabel)
                }
            }
        }
    }
}
