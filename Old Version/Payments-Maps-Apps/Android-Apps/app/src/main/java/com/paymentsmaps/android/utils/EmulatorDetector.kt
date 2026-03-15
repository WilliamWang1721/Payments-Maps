package com.paymentsmaps.android.utils

import android.os.Build
import android.content.Context
import android.provider.Settings
import java.io.File

/**
 * 模拟器检测和优化工具类
 */
object EmulatorDetector {
    
    /**
     * 检测是否运行在Android模拟器中
     */
    fun isEmulator(): Boolean {
        return checkBasicEmulatorSigns() || checkFiles() || checkBuildProperties()
    }
    
    /**
     * 检测基本模拟器标识
     */
    private fun checkBasicEmulatorSigns(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic") ||
                Build.FINGERPRINT.startsWith("unknown") ||
                Build.MODEL.contains("google_sdk") ||
                Build.MODEL.contains("Emulator") ||
                Build.MODEL.contains("Android SDK built for x86") ||
                Build.BOARD == "QC_Reference_Phone" ||
                Build.MANUFACTURER.contains("Genymotion") ||
                Build.HOST.startsWith("Build") ||
                Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic") ||
                "google_sdk" == Build.PRODUCT ||
                Build.HARDWARE.contains("goldfish") ||
                Build.HARDWARE.contains("ranchu"))
    }
    
    /**
     * 检查模拟器特有文件
     */
    private fun checkFiles(): Boolean {
        val known_files = arrayOf(
            "/system/lib/libc_malloc_debug_qemu.so",
            "/sys/qemu_trace",
            "/system/bin/qemu-props",
            "/dev/socket/qemud",
            "/dev/qemu_pipe",
            "/dev/socket/baseband_genyd",
            "/dev/socket/genyd"
        )
        
        for (file in known_files) {
            if (File(file).exists()) {
                return true
            }
        }
        return false
    }
    
    /**
     * 检查构建属性
     */
    private fun checkBuildProperties(): Boolean {
        val properties = mapOf(
            "ro.build.flavor" to listOf("vbox86p", "sdk_gphone"),
            "ro.kernel.qemu" to listOf("1"),
            "ro.hardware" to listOf("goldfish", "ranchu", "vbox86"),
            "ro.product.model" to listOf("sdk", "google_sdk", "Android SDK")
        )
        
        return properties.any { (key, values) ->
            val prop = getSystemProperty(key)
            values.any { prop.contains(it, ignoreCase = true) }
        }
    }
    
    /**
     * 获取系统属性
     */
    private fun getSystemProperty(key: String): String {
        return try {
            val process = Runtime.getRuntime().exec("getprop $key")
            process.inputStream.bufferedReader().readLine() ?: ""
        } catch (e: Exception) {
            ""
        }
    }
    
    /**
     * 获取模拟器优化配置
     */
    fun getEmulatorConfig(): EmulatorConfig {
        return if (isEmulator()) {
            EmulatorConfig(
                isEmulator = true,
                disableHardwareAcceleration = true,
                useSimpleRendering = true,
                disableAnimations = false, // 保留动画以保持体验
                reducedGraphicsQuality = true,
                disableLocationServices = false, // 保留位置服务
                useMockData = true
            )
        } else {
            EmulatorConfig(
                isEmulator = false,
                disableHardwareAcceleration = false,
                useSimpleRendering = false,
                disableAnimations = false,
                reducedGraphicsQuality = false,
                disableLocationServices = false,
                useMockData = false
            )
        }
    }
    
    /**
     * 模拟器配置数据类
     */
    data class EmulatorConfig(
        val isEmulator: Boolean,
        val disableHardwareAcceleration: Boolean,
        val useSimpleRendering: Boolean,
        val disableAnimations: Boolean,
        val reducedGraphicsQuality: Boolean,
        val disableLocationServices: Boolean,
        val useMockData: Boolean
    )
}