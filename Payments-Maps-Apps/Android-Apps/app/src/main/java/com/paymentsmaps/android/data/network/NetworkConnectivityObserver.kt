package com.paymentsmaps.android.data.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 网络连接监听器
 * 监听网络连接状态变化
 */
@Singleton
class NetworkConnectivityObserver @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    private val _isConnected = MutableStateFlow(isNetworkAvailable())
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()
    
    private val _connectionType = MutableStateFlow(ConnectionType.UNKNOWN)
    val connectionType: StateFlow<ConnectionType> = _connectionType.asStateFlow()
    
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    
    init {
        startNetworkCallback()
    }
    
    /**
     * 开始网络监听
     */
    private fun startNetworkCallback() {
        try {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
                .build()
            
            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    super.onAvailable(network)
                    Timber.d("Network available: $network")
                    
                    ProcessLifecycleOwner.get().lifecycleScope.launch {
                        _isConnected.value = true
                        _connectionType.value = getCurrentConnectionType()
                    }
                }
                
                override fun onLost(network: Network) {
                    super.onLost(network)
                    Timber.d("Network lost: $network")
                    
                    ProcessLifecycleOwner.get().lifecycleScope.launch {
                        val stillConnected = isNetworkAvailable()
                        _isConnected.value = stillConnected
                        _connectionType.value = if (stillConnected) {
                            getCurrentConnectionType()
                        } else {
                            ConnectionType.NONE
                        }
                    }
                }
                
                override fun onCapabilitiesChanged(
                    network: Network,
                    networkCapabilities: NetworkCapabilities
                ) {
                    super.onCapabilitiesChanged(network, networkCapabilities)
                    
                    ProcessLifecycleOwner.get().lifecycleScope.launch {
                        val hasInternet = networkCapabilities.hasCapability(
                            NetworkCapabilities.NET_CAPABILITY_INTERNET
                        ) && networkCapabilities.hasCapability(
                            NetworkCapabilities.NET_CAPABILITY_VALIDATED
                        )
                        
                        _isConnected.value = hasInternet
                        _connectionType.value = if (hasInternet) {
                            getCurrentConnectionType()
                        } else {
                            ConnectionType.NONE
                        }
                    }
                }
            }
            
            connectivityManager.registerNetworkCallback(request, networkCallback!!)
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to register network callback")
        }
    }
    
    /**
     * 检查网络是否可用
     */
    private fun isNetworkAvailable(): Boolean {
        return try {
            val network = connectivityManager.activeNetwork ?: return false
            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } catch (e: Exception) {
            Timber.e(e, "Failed to check network availability")
            false
        }
    }
    
    /**
     * 获取当前连接类型
     */
    private fun getCurrentConnectionType(): ConnectionType {
        return try {
            val network = connectivityManager.activeNetwork ?: return ConnectionType.NONE
            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return ConnectionType.NONE
            
            when {
                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                    ConnectionType.WIFI
                }
                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    ConnectionType.CELLULAR
                }
                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {
                    ConnectionType.ETHERNET
                }
                else -> {
                    ConnectionType.OTHER
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to get connection type")
            ConnectionType.UNKNOWN
        }
    }
    
    /**
     * 获取网络连接强度（仅WiFi和蜂窝网络）
     */
    fun getConnectionStrength(): ConnectionStrength {
        return try {
            val network = connectivityManager.activeNetwork ?: return ConnectionStrength.UNKNOWN
            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return ConnectionStrength.UNKNOWN
            
            when {
                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                    // WiFi 信号强度检测
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val signalStrength = networkCapabilities.signalStrength
                        when {
                            signalStrength >= -50 -> ConnectionStrength.EXCELLENT
                            signalStrength >= -60 -> ConnectionStrength.GOOD
                            signalStrength >= -70 -> ConnectionStrength.FAIR
                            else -> ConnectionStrength.POOR
                        }
                    } else {
                        ConnectionStrength.GOOD // 默认值
                    }
                }
                
                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    // 蜂窝网络强度检测
                    ConnectionStrength.GOOD // 简化实现
                }
                
                else -> ConnectionStrength.UNKNOWN
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to get connection strength")
            ConnectionStrength.UNKNOWN
        }
    }
    
    /**
     * 检查是否为计费连接
     */
    fun isMeteredConnection(): Boolean {
        return try {
            val network = connectivityManager.activeNetwork ?: return false
            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            !networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
        } catch (e: Exception) {
            Timber.e(e, "Failed to check metered connection")
            false
        }
    }
    
    /**
     * 停止网络监听
     */
    fun stopNetworkCallback() {
        try {
            networkCallback?.let { callback ->
                connectivityManager.unregisterNetworkCallback(callback)
                networkCallback = null
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to unregister network callback")
        }
    }
}

/**
 * 连接类型枚举
 */
enum class ConnectionType {
    NONE,       // 无连接
    WIFI,       // WiFi
    CELLULAR,   // 蜂窝网络
    ETHERNET,   // 以太网
    OTHER,      // 其他类型
    UNKNOWN     // 未知
}

/**
 * 连接强度枚举
 */
enum class ConnectionStrength {
    EXCELLENT,  // 优秀
    GOOD,       // 良好
    FAIR,       // 一般
    POOR,       // 较差
    UNKNOWN     // 未知
}