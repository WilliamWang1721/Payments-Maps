package com.paymentsmaps.android.presentation.merchant

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
import com.paymentsmaps.android.domain.model.shortAddress
import com.paymentsmaps.android.domain.usecase.pos.GetPOSMachinesUseCase
import com.paymentsmaps.android.domain.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import javax.inject.Inject

/**
 * 商户摘要信息
 */
data class MerchantSummary(
    val merchantId: String,
    val merchantName: String,
    val totalPOS: Int,
    val activeCount: Int,
    val inactiveCount: Int,
    val maintenanceCount: Int,
    val offlineCount: Int,
    val addressSample: String?,
    val lastUpdated: String
)

/**
 * 商户管理 UI 状态
 */
data class MerchantManagementUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val merchants: List<MerchantSummary> = emptyList(),
    val searchQuery: String = ""
) {
    val filteredMerchants: List<MerchantSummary>
        get() = if (searchQuery.isBlank()) {
            merchants
        } else {
            merchants.filter { summary ->
                summary.merchantName.contains(searchQuery, ignoreCase = true) ||
                    summary.merchantId.contains(searchQuery, ignoreCase = true)
            }
        }
}

/**
 * 商户管理 ViewModel
 */
@HiltViewModel
class MerchantManagementViewModel @Inject constructor(
    private val getPOSMachinesUseCase: GetPOSMachinesUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(MerchantManagementUiState(isLoading = true))
    val uiState: StateFlow<MerchantManagementUiState> = _uiState.asStateFlow()

    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

    init {
        loadMerchants()
    }

    fun loadMerchants() {
        viewModelScope.launch {
            getPOSMachinesUseCase()
                .collect { result ->
                    when (result) {
                        is Result.Loading -> {
                            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                        }

                        is Result.Success -> {
                            val summaries = buildSummaries(result.data)
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = null,
                                merchants = summaries
                            )
                        }

                        is Result.Error -> {
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = result.exception.message ?: "加载商户信息失败"
                            )
                        }
                    }
                }
        }
    }

    fun updateSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    private fun buildSummaries(posMachines: List<POSMachine>): List<MerchantSummary> {
        if (posMachines.isEmpty()) return emptyList()

        return posMachines
            .groupBy { it.merchantId to it.merchantName }
            .map { (key, machines) ->
                val merchantId = key.first
                val merchantName = when {
                    key.second.isNotBlank() -> key.second
                    else -> "未命名商户"
                }
                val activeCount = machines.count { it.status == POSStatus.ACTIVE }
                val inactiveCount = machines.count { it.status == POSStatus.INACTIVE }
                val maintenanceCount = machines.count { it.status == POSStatus.MAINTENANCE }
                val offlineCount = machines.count { it.status == POSStatus.OFFLINE }
                val lastUpdated = machines.maxByOrNull { it.updatedAt }?.updatedAt
                val address = machines.firstOrNull()?.shortAddress

                MerchantSummary(
                    merchantId = merchantId,
                    merchantName = merchantName,
                    totalPOS = machines.size,
                    activeCount = activeCount,
                    inactiveCount = inactiveCount,
                    maintenanceCount = maintenanceCount,
                    offlineCount = offlineCount,
                    addressSample = address,
                    lastUpdated = lastUpdated?.format(dateFormatter) ?: "暂无记录"
                )
            }
            .sortedBy { it.merchantName }
    }
}
