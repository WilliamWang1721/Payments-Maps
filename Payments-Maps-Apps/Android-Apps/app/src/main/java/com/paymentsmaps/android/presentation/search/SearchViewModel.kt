package com.paymentsmaps.android.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.domain.model.POSMachine
import com.paymentsmaps.android.domain.usecase.pos.GetPOSMachinesUseCase
import com.paymentsmaps.android.domain.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 搜索 UI 状态
 */
data class SearchUiState(
    val query: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val results: List<POSMachine> = emptyList()
)

/**
 * 搜索 ViewModel
 */
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val getPOSMachinesUseCase: GetPOSMachinesUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private val queryFlow = MutableSharedFlow<String>(extraBufferCapacity = 1)
    private var searchJob: Job? = null

    init {
        observeQuery()
    }

    fun updateQuery(query: String) {
        _uiState.update { it.copy(query = query, error = null) }
        queryFlow.tryEmit(query)
    }

    private fun observeQuery() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            queryFlow
                .debounce(300)
                .distinctUntilChanged()
                .collect { query ->
                    if (query.isBlank()) {
                        _uiState.update { it.copy(results = emptyList(), isLoading = false, error = null) }
                    } else {
                        performSearch(query)
                    }
                }
        }
    }

    private suspend fun performSearch(query: String) {
        getPOSMachinesUseCase.search(query).collect { result ->
            when (result) {
                is Result.Loading -> {
                    _uiState.update { it.copy(isLoading = true, error = null) }
                }

                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            results = result.data,
                            error = null
                        )
                    }
                }

                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.exception.message ?: "搜索失败"
                        )
                    }
                }
            }
        }
    }
}
