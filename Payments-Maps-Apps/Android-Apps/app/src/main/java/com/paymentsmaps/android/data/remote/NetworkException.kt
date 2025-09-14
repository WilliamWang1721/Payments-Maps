package com.paymentsmaps.android.data.remote

import io.github.jan.supabase.exceptions.RestException
import io.github.jan.supabase.exceptions.HttpRequestException
import io.github.jan.supabase.exceptions.UnknownRestException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * 网络异常封装类
 * 统一处理各种网络和API异常
 */
sealed class NetworkException(
    message: String,
    cause: Throwable? = null
) : Exception(message, cause) {
    
    /**
     * 网络连接异常
     */
    class NetworkError(
        message: String = "网络连接失败，请检查网络设置",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 超时异常
     */
    class TimeoutError(
        message: String = "请求超时，请稍后重试",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 服务器异常
     */
    class ServerError(
        val code: Int,
        message: String = "服务器错误 ($code)",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 客户端异常
     */
    class ClientError(
        val code: Int,
        message: String = "请求错误 ($code)",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 认证异常
     */
    class AuthenticationError(
        message: String = "身份验证失败，请重新登录",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 权限异常
     */
    class AuthorizationError(
        message: String = "权限不足，无法执行此操作",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 资源未找到异常
     */
    class NotFoundError(
        message: String = "请求的资源不存在",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 数据验证异常
     */
    class ValidationError(
        val errors: Map<String, List<String>> = emptyMap(),
        message: String = "数据验证失败",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 限流异常
     */
    class RateLimitError(
        val retryAfter: Long? = null,
        message: String = "请求过于频繁，请稍后重试",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 未知异常
     */
    class UnknownError(
        message: String = "未知错误，请稍后重试",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 数据解析异常
     */
    class ParseError(
        message: String = "数据解析失败",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
    
    /**
     * 配置异常
     */
    class ConfigurationError(
        message: String = "配置错误",
        cause: Throwable? = null
    ) : NetworkException(message, cause)
}

/**
 * 异常转换器
 * 将各种异常转换为统一的NetworkException
 */
object NetworkExceptionMapper {
    
    /**
     * 将Throwable转换为NetworkException
     */
    fun mapException(throwable: Throwable): NetworkException {
        return when (throwable) {
            is NetworkException -> throwable
            
            is RestException -> {
                when (throwable.error) {
                    "PGRST116" -> NetworkException.NotFoundError(
                        "请求的资源不存在",
                        throwable
                    )
                    "PGRST301" -> NetworkException.ValidationError(
                        message = "数据验证失败: ${throwable.message}",
                        cause = throwable
                    )
                    else -> NetworkException.ServerError(
                        code = 400,
                        message = throwable.message ?: "服务器错误",
                        cause = throwable
                    )
                }
            }
            
            is HttpRequestException -> {
                // 简化处理，直接返回客户端错误
                NetworkException.ClientError(
                    code = 400,
                    message = throwable.message ?: "客户端请求错误",
                    cause = throwable
                )
            }
            
            is UnknownRestException -> NetworkException.ServerError(
                code = 500,
                message = "服务器内部错误",
                cause = throwable
            )
            
            is SocketTimeoutException -> NetworkException.TimeoutError(
                "请求超时，请检查网络连接",
                throwable
            )
            
            is UnknownHostException -> NetworkException.NetworkError(
                "无法连接到服务器，请检查网络设置",
                throwable
            )
            
            is IOException -> NetworkException.NetworkError(
                "网络连接异常: ${throwable.message}",
                throwable
            )
            
            else -> NetworkException.UnknownError(
                throwable.message ?: "未知错误",
                throwable
            )
        }
    }
    
    /**
     * 获取用户友好的错误消息
     */
    fun getUserFriendlyMessage(exception: NetworkException): String {
        return when (exception) {
            is NetworkException.NetworkError -> "网络连接失败，请检查网络设置后重试"
            is NetworkException.TimeoutError -> "请求超时，请稍后重试"
            is NetworkException.ServerError -> "服务器暂时不可用，请稍后重试"
            is NetworkException.ClientError -> "请求格式错误，请检查输入信息"
            is NetworkException.AuthenticationError -> "登录已过期，请重新登录"
            is NetworkException.AuthorizationError -> "您没有权限执行此操作"
            is NetworkException.NotFoundError -> "请求的内容不存在"
            is NetworkException.ValidationError -> "输入信息有误，请检查后重试"
            is NetworkException.RateLimitError -> "操作过于频繁，请稍后重试"
            is NetworkException.ParseError -> "数据处理失败，请稍后重试"
            is NetworkException.ConfigurationError -> "应用配置错误，请联系技术支持"
            is NetworkException.UnknownError -> "操作失败，请稍后重试"
        }
    }
    
    /**
     * 判断是否为可重试的异常
     */
    fun isRetryable(exception: NetworkException): Boolean {
        return when (exception) {
            is NetworkException.NetworkError,
            is NetworkException.TimeoutError,
            is NetworkException.ServerError -> true
            is NetworkException.RateLimitError -> true
            else -> false
        }
    }
    
    /**
     * 获取重试延迟时间（毫秒）
     */
    fun getRetryDelay(exception: NetworkException, attempt: Int): Long {
        return when (exception) {
            is NetworkException.RateLimitError -> {
                exception.retryAfter?.times(1000) ?: (1000L * attempt)
            }
            is NetworkException.NetworkError,
            is NetworkException.TimeoutError -> {
                minOf(1000L * attempt * attempt, 30000L) // 指数退避，最大30秒
            }
            is NetworkException.ServerError -> {
                minOf(2000L * attempt, 10000L) // 线性增长，最大10秒
            }
            else -> 1000L
        }
    }
}