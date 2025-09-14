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
                    
                    ProcessLifecycleOwner.get().lifecycleScope.launch {\n                        val stillConnected = isNetworkAvailable()\n                        _isConnected.value = stillConnected\n                        _connectionType.value = if (stillConnected) {\n                            getCurrentConnectionType()\n                        } else {\n                            ConnectionType.NONE\n                        }\n                    }\n                }\n                \n                override fun onCapabilitiesChanged(\n                    network: Network,\n                    networkCapabilities: NetworkCapabilities\n                ) {\n                    super.onCapabilitiesChanged(network, networkCapabilities)\n                    \n                    ProcessLifecycleOwner.get().lifecycleScope.launch {\n                        val hasInternet = networkCapabilities.hasCapability(\n                            NetworkCapabilities.NET_CAPABILITY_INTERNET\n                        ) && networkCapabilities.hasCapability(\n                            NetworkCapabilities.NET_CAPABILITY_VALIDATED\n                        )\n                        \n                        _isConnected.value = hasInternet\n                        _connectionType.value = if (hasInternet) {\n                            getCurrentConnectionType()\n                        } else {\n                            ConnectionType.NONE\n                        }\n                    }\n                }\n            }\n            \n            connectivityManager.registerNetworkCallback(request, networkCallback!!)\n            \n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to register network callback\")\n        }\n    }\n    \n    /**\n     * 检查网络是否可用\n     */\n    private fun isNetworkAvailable(): Boolean {\n        return try {\n            val network = connectivityManager.activeNetwork ?: return false\n            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return false\n            \n            networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&\n            networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)\n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to check network availability\")\n            false\n        }\n    }\n    \n    /**\n     * 获取当前连接类型\n     */\n    private fun getCurrentConnectionType(): ConnectionType {\n        return try {\n            val network = connectivityManager.activeNetwork ?: return ConnectionType.NONE\n            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return ConnectionType.NONE\n            \n            when {\n                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {\n                    ConnectionType.WIFI\n                }\n                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {\n                    ConnectionType.CELLULAR\n                }\n                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {\n                    ConnectionType.ETHERNET\n                }\n                else -> {\n                    ConnectionType.OTHER\n                }\n            }\n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to get connection type\")\n            ConnectionType.UNKNOWN\n        }\n    }\n    \n    /**\n     * 获取网络连接强度（仅WiFi和蜂窝网络）\n     */\n    fun getConnectionStrength(): ConnectionStrength {\n        return try {\n            val network = connectivityManager.activeNetwork ?: return ConnectionStrength.UNKNOWN\n            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return ConnectionStrength.UNKNOWN\n            \n            when {\n                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {\n                    // WiFi 信号强度检测\n                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {\n                        val signalStrength = networkCapabilities.signalStrength\n                        when {\n                            signalStrength >= -50 -> ConnectionStrength.EXCELLENT\n                            signalStrength >= -60 -> ConnectionStrength.GOOD\n                            signalStrength >= -70 -> ConnectionStrength.FAIR\n                            else -> ConnectionStrength.POOR\n                        }\n                    } else {\n                        ConnectionStrength.GOOD // 默认值\n                    }\n                }\n                \n                networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {\n                    // 蜂窝网络强度检测\n                    ConnectionStrength.GOOD // 简化实现\n                }\n                \n                else -> ConnectionStrength.UNKNOWN\n            }\n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to get connection strength\")\n            ConnectionStrength.UNKNOWN\n        }\n    }\n    \n    /**\n     * 检查是否为计费连接\n     */\n    fun isMeteredConnection(): Boolean {\n        return try {\n            val network = connectivityManager.activeNetwork ?: return false\n            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return false\n            \n            !networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)\n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to check metered connection\")\n            false\n        }\n    }\n    \n    /**\n     * 停止网络监听\n     */\n    fun stopNetworkCallback() {\n        try {\n            networkCallback?.let { callback ->\n                connectivityManager.unregisterNetworkCallback(callback)\n                networkCallback = null\n            }\n        } catch (e: Exception) {\n            Timber.e(e, \"Failed to unregister network callback\")\n        }\n    }\n}\n\n/**\n * 连接类型枚举\n */\nenum class ConnectionType {\n    NONE,       // 无连接\n    WIFI,       // WiFi\n    CELLULAR,   // 蜂窝网络\n    ETHERNET,   // 以太网\n    OTHER,      // 其他类型\n    UNKNOWN     // 未知\n}\n\n/**\n * 连接强度枚举\n */\nenum class ConnectionStrength {\n    EXCELLENT,  // 优秀\n    GOOD,       // 良好\n    FAIR,       // 一般\n    POOR,       // 较差\n    UNKNOWN     // 未知\n}