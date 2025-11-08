package com.paymentsmaps.android.presentation.pos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.model.POSStatus
import com.paymentsmaps.android.domain.usecase.ManagePOSMachinesUseCase
import com.paymentsmaps.android.domain.usecase.pos.GetPOSMachinesUseCase
import com.paymentsmaps.android.domain.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * POS 机详情 UI 状态
 */
data class POSMachineDetailUiState(
    val isLoading: Boolean = true,
    val posMachine: POSMachine? = null,
    val error: String? = null,
    val message: String? = null
)

/**
 * POS 机详情 ViewModel
 */
@HiltViewModel
class POSMachineDetailViewModel @Inject constructor(
    private val getPOSMachinesUseCase: GetPOSMachinesUseCase,
    private val managePOSMachinesUseCase: ManagePOSMachinesUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(POSMachineDetailUiState())
    val uiState: StateFlow<POSMachineDetailUiState> = _uiState.asStateFlow()

    private var currentId: String? = null

    fun loadPOSMachine(id: String) {
        currentId = id
        viewModelScope.launch {
            _uiState.value = POSMachineDetailUiState(isLoading = true)

            getPOSMachinesUseCase.getById(id).collect { result ->
                when (result) {
                    is Result.Success -> {
                        _uiState.value = POSMachineDetailUiState(
                            isLoading = false,
                            posMachine = result.data
                        )
                    }

                    is Result.Error -> {
                        Timber.e(result.exception, "Failed to load POS machine detail")
                        _uiState.value = POSMachineDetailUiState(
                            isLoading = false,
                            error = result.exception.message ?: "加载POS机详情失败"
                        )
                    }

                    is Result.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true)
                    }
                }
            }
        }
    }

    fun refresh() {
        currentId?.let { loadPOSMachine(it) }
    }

    fun updateStatus(status: POSStatus) {
        val id = currentId ?: return
        viewModelScope.launch {
            managePOSMachinesUseCase.updatePOSMachineStatus(id, status).collect { result ->
                when (result) {
                    is Result.Success -> {
                        val updated = result.data
                        _uiState.value = _uiState.value.copy(
                            posMachine = updated,
                            message = "状态已更新为 ${status.name}"
                        )
                    }

                    is Result.Error -> {
                        Timber.e(result.exception, "Failed to update POS status")
                        _uiState.value = _uiState.value.copy(
                            message = result.exception.message ?: "更新状态失败"
                        )
                    }

                    is Result.Loading ->
                        _uiState.value = _uiState.value.copy(isLoading = true)
                }
            }
        }
    }

    fun clearMessage() {
        if (_uiState.value.message != null) {
            _uiState.value = _uiState.value.copy(message = null)
        }
    }
}
