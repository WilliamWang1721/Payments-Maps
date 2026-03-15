package com.paymentsmaps.android.presentation.merchant

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
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
 * 商户详情 UI 状态
 */
data class MerchantDetailUiState(
    val merchantId: String,
    val merchantName: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val posMachines: List<POSMachine> = emptyList()
) {
    val activeCount: Int = posMachines.count { it.status == POSStatus.ACTIVE }
    val maintenanceCount: Int = posMachines.count { it.status == POSStatus.MAINTENANCE }
    val offlineCount: Int = posMachines.count { it.status == POSStatus.OFFLINE }
    val inactiveCount: Int = posMachines.count { it.status == POSStatus.INACTIVE }
}

/**
 * 商户详情 ViewModel
 */
@HiltViewModel
class MerchantDetailViewModel @Inject constructor(
    private val getPOSMachinesUseCase: GetPOSMachinesUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val merchantId: String = savedStateHandle.get<String>("merchantId") ?: ""
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

    private val _uiState = MutableStateFlow(MerchantDetailUiState(merchantId = merchantId, isLoading = true))
    val uiState: StateFlow<MerchantDetailUiState> = _uiState.asStateFlow()

    init {
        loadMerchant()
    }

    fun loadMerchant() {
        if (merchantId.isBlank()) {
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                error = "缺少商户ID"
            )
            return
        }

        viewModelScope.launch {
            getPOSMachinesUseCase.getByMerchantId(merchantId)
                .collect { result ->
                    when (result) {
                        is Result.Loading -> {
                            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                        }

                        is Result.Success -> {
                            val machines = result.data
                            val merchantName = machines.firstOrNull()?.merchantName ?: "未知商户"
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = null,
                                merchantName = merchantName,
                                posMachines = machines
                            )
                        }

                        is Result.Error -> {
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = result.exception.message ?: "加载商户详情失败"
                            )
                        }
                    }
                }
        }
    }

    fun formatDate(machine: POSMachine): String {
        return machine.updatedAt.format(dateFormatter)
    }
}
