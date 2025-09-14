package com.paymentsmaps.android.presentation.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.usecase.pos.GetPOSMachinesUseCase
import com.paymentsmaps.android.domain.usecase.ManagePOSMachinesUseCase
import com.paymentsmaps.android.domain.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 地图页面ViewModel
 * 管理地图相关的状态和业务逻辑
 */
@HiltViewModel
class MapViewModel @Inject constructor(
    private val getPOSMachinesUseCase: GetPOSMachinesUseCase,
    private val managePOSMachinesUseCase: ManagePOSMachinesUseCase
) : ViewModel() {
    
    // UI状态
    private val _uiState = MutableStateFlow(MapUiState())
    val uiState: StateFlow<MapUiState> = _uiState.asStateFlow()
    
    // POS机列表
    private val _posMachines = MutableStateFlow<List<POSMachine>>(emptyList())
    val posMachines: StateFlow<List<POSMachine>> = _posMachines.asStateFlow()
    
    // 选中的POS机
    private val _selectedPOSMachine = MutableStateFlow<POSMachine?>(null)
    val selectedPOSMachine: StateFlow<POSMachine?> = _selectedPOSMachine.asStateFlow()
    
    // 搜索查询
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
    
    // 过滤器
    private val _filters = MutableStateFlow(MapFilters())
    val filters: StateFlow<MapFilters> = _filters.asStateFlow()
    
    // 地图相机位置
    private val _cameraPosition = MutableStateFlow<Location?>(null)
    val cameraPosition: StateFlow<Location?> = _cameraPosition.asStateFlow()
    
    init {
        loadPOSMachines()
        observeSearchAndFilters()
    }
    
    /**
     * 加载POS机列表
     */
    private fun loadPOSMachines() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            getPOSMachinesUseCase()
                .catch { exception ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "加载POS机失败"
                        )
                    }
                }
                .collect { result ->
                    when (result) {
                        is Result.Loading -> {
                            _uiState.update { it.copy(isLoading = true) }
                        }
                        is Result.Success -> {
                            _posMachines.value = result.data
                            _uiState.update { 
                                it.copy(
                                    isLoading = false,
                                    error = null
                                )
                            }
                        }
                        is Result.Error -> {
                            _uiState.update { 
                                it.copy(
                                    isLoading = false,
                                    error = result.exception.message ?: "加载POS机失败"
                                )
                            }
                        }
                    }
                }
        }
    }
    
    /**
     * 观察搜索和过滤器变化
     */
    private fun observeSearchAndFilters() {
        viewModelScope.launch {
            combine(
                searchQuery,
                filters
            ) { query, filters ->
                Pair(query, filters)
            }.collect { (query, filters) ->
                filterPOSMachines(query, filters)
            }
        }
    }
    
    /**
     * 过滤POS机
     */
    private fun filterPOSMachines(query: String, filters: MapFilters) {
        viewModelScope.launch {
            if (query.isNotEmpty()) {
                getPOSMachinesUseCase.search(query)
                    .collect { result ->
                        when (result) {
                            is Result.Success -> {
                                val filteredMachines = applyFilters(result.data, filters)
                                _posMachines.value = filteredMachines
                            }
                            is Result.Error -> {
                                _uiState.update { 
                                    it.copy(error = result.exception.message ?: "搜索失败")
                                }
                            }
                            is Result.Loading -> {
                                _uiState.update { it.copy(isLoading = true) }
                            }
                        }
                    }
            } else {
                // 应用过滤器到所有POS机
                val allMachines = _posMachines.value
                val filteredMachines = applyFilters(allMachines, filters)
                _posMachines.value = filteredMachines
            }
        }
    }
    
    /**
     * 应用过滤器
     */
    private fun applyFilters(machines: List<POSMachine>, filters: MapFilters): List<POSMachine> {
        return machines.filter { machine ->
            // 状态过滤
            (filters.selectedStatuses.isEmpty() || machine.status in filters.selectedStatuses) &&
            // 类型过滤
            (filters.selectedTypes.isEmpty() || machine.type in filters.selectedTypes) &&
            // 支付方式过滤
            (filters.selectedPaymentMethods.isEmpty() || 
             machine.supportedPaymentMethods.any { it in filters.selectedPaymentMethods }) &&
            // 距离过滤
            (filters.maxDistance == null || filters.centerLocation == null ||
             calculateDistance(machine.location, filters.centerLocation) <= filters.maxDistance)
        }
    }
    
    /**
     * 计算两点间距离
     */
    private fun calculateDistance(location1: Location, location2: Location): Double {
        val earthRadius = 6371.0 // 地球半径（公里）
        val dLat = Math.toRadians(location2.latitude - location1.latitude)
        val dLng = Math.toRadians(location2.longitude - location1.longitude)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(location1.latitude)) * Math.cos(Math.toRadians(location2.latitude)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadius * c
    }
    
    /**
     * 更新搜索查询
     */
    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }
    
    /**
     * 清除搜索
     */
    fun clearSearch() {
        _searchQuery.value = ""
    }
    
    /**
     * 更新过滤器
     */
    fun updateFilters(filters: MapFilters) {
        _filters.value = filters
    }
    
    /**
     * 选择POS机
     */
    fun selectPOSMachine(posMachine: POSMachine) {
        _selectedPOSMachine.value = posMachine
        _uiState.update { it.copy(showPOSDetails = true) }
    }
    
    /**
     * 取消选择POS机
     */
    fun deselectPOSMachine() {
        _selectedPOSMachine.value = null
        _uiState.update { it.copy(showPOSDetails = false) }
    }
    
    /**
     * 更新相机位置
     */
    fun updateCameraPosition(location: Location) {
        _cameraPosition.value = location
    }
    
    /**
     * 在指定范围内获取POS机
     */
    fun getPOSMachinesInBounds(bounds: LocationBounds) {
        viewModelScope.launch {
            getPOSMachinesUseCase.getByLocationRange(
                (bounds.southwest.latitude + bounds.northeast.latitude) / 2,
                (bounds.southwest.longitude + bounds.northeast.longitude) / 2,
                5.0 // Default radius in km
            ).collect { result ->
                when (result) {
                    is Result.Success -> {
                        _posMachines.value = result.data
                    }
                    is Result.Error -> {
                        _uiState.update { 
                            it.copy(error = result.exception.message ?: "获取POS机失败")
                        }
                    }
                    is Result.Loading -> {
                        _uiState.update { it.copy(isLoading = true) }
                    }
                }
            }
        }
    }
    
    /**
     * 刷新数据
     */
    fun refresh() {
        loadPOSMachines()
    }
    
    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    /**
     * 切换过滤器显示
     */
    fun toggleFilters() {
        _uiState.update { it.copy(showFilters = !it.showFilters) }
    }
    
    /**
     * 切换搜索显示
     */
    fun toggleSearch() {
        _uiState.update { it.copy(showSearch = !it.showSearch) }
    }
    
    /**
     * 获取附近的POS机
     */
    fun getNearbyPOSMachines(location: Location, radiusKm: Double = 5.0) {
        viewModelScope.launch {
            getPOSMachinesUseCase.getByLocationRange(location.latitude, location.longitude, radiusKm)
                .collect { result ->
                    when (result) {
                        is Result.Success -> {
                            _posMachines.value = result.data
                        }
                        is Result.Error -> {
                            _uiState.update { 
                                it.copy(error = result.exception.message ?: "获取附近POS机失败")
                            }
                        }
                        is Result.Loading -> {
                            _uiState.update { it.copy(isLoading = true) }
                        }
                    }
                }
        }
    }
}

/**
 * 地图UI状态
 */
data class MapUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val showPOSDetails: Boolean = false,
    val showFilters: Boolean = false,
    val showSearch: Boolean = false
)

/**
 * 地图过滤器
 */
data class MapFilters(
    val selectedStatuses: Set<POSStatus> = emptySet(),
    val selectedTypes: Set<POSType> = emptySet(),
    val selectedPaymentMethods: Set<PaymentMethod> = emptySet(),
    val maxDistance: Double? = null,
    val centerLocation: Location? = null
)

/**
 * 位置边界
 */
data class LocationBounds(
    val southwest: Location,
    val northeast: Location
)