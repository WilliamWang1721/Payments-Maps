package com.paymentsmaps.android.domain.util

/**
 * 通用结果封装类
 * 用于处理成功和错误状态
 */
sealed class Result<out T> {
    data class Success<out T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

/**
 * 扩展函数：检查是否成功
 */
val <T> Result<T>.isSuccess: Boolean
    get() = this is Result.Success

/**
 * 扩展函数：检查是否失败
 */
val <T> Result<T>.isError: Boolean
    get() = this is Result.Error

/**
 * 扩展函数：检查是否加载中
 */
val <T> Result<T>.isLoading: Boolean
    get() = this is Result.Loading

/**
 * 扩展函数：获取数据（如果成功）
 */
fun <T> Result<T>.getDataOrNull(): T? {
    return when (this) {
        is Result.Success -> data
        else -> null
    }
}

/**
 * 扩展函数：获取异常（如果失败）
 */
fun <T> Result<T>.getExceptionOrNull(): Throwable? {
    return when (this) {
        is Result.Error -> exception
        else -> null
    }
}

/**
 * 扩展函数：映射成功结果
 */
inline fun <T, R> Result<T>.map(transform: (T) -> R): Result<R> {
    return when (this) {
        is Result.Success -> Result.Success(transform(data))
        is Result.Error -> Result.Error(exception)
        is Result.Loading -> Result.Loading
    }
}

/**
 * 扩展函数：映射错误结果
 */
inline fun <T> Result<T>.mapError(transform: (Throwable) -> Throwable): Result<T> {
    return when (this) {
        is Result.Success -> this
        is Result.Error -> Result.Error(transform(exception))
        is Result.Loading -> this
    }
}

/**
 * 扩展函数：在成功时执行操作
 */
inline fun <T> Result<T>.onSuccess(action: (T) -> Unit): Result<T> {
    if (this is Result.Success) {
        action(data)
    }
    return this
}

/**
 * 扩展函数：在失败时执行操作
 */
inline fun <T> Result<T>.onError(action: (Throwable) -> Unit): Result<T> {
    if (this is Result.Error) {
        action(exception)
    }
    return this
}

/**
 * 扩展函数：在加载时执行操作
 */
inline fun <T> Result<T>.onLoading(action: () -> Unit): Result<T> {
    if (this is Result.Loading) {
        action()
    }
    return this
}

/**
 * 扩展函数：获取数据或默认值
 */
fun <T> Result<T>.getDataOrDefault(defaultValue: T): T {
    return when (this) {
        is Result.Success -> data
        else -> defaultValue
    }
}

/**
 * 扩展函数：获取数据或执行默认操作
 */
inline fun <T> Result<T>.getDataOrElse(defaultValue: () -> T): T {
    return when (this) {
        is Result.Success -> data
        else -> defaultValue()
    }
}

/**
 * 扩展函数：折叠结果
 */
inline fun <T, R> Result<T>.fold(
    onSuccess: (T) -> R,
    onError: (Throwable) -> R,
    onLoading: () -> R
): R {
    return when (this) {
        is Result.Success -> onSuccess(data)
        is Result.Error -> onError(exception)
        is Result.Loading -> onLoading()
    }
}

/**
 * 工具函数：创建成功结果
 */
fun <T> resultOf(value: T): Result<T> = Result.Success(value)

/**
 * 工具函数：创建错误结果
 */
fun <T> errorOf(exception: Throwable): Result<T> = Result.Error(exception)

/**
 * 工具函数：创建错误结果（带消息）
 */
fun <T> errorOf(message: String): Result<T> = Result.Error(Exception(message))

/**
 * 工具函数：创建加载结果
 */
fun <T> loadingResult(): Result<T> = Result.Loading

/**
 * 工具函数：安全执行操作并返回结果
 */
inline fun <T> safeCall(action: () -> T): Result<T> {
    return try {
        Result.Success(action())
    } catch (e: Exception) {
        Result.Error(e)
    }
}

/**
 * 工具函数：安全执行挂起操作并返回结果
 */
suspend inline fun <T> safeSuspendCall(crossinline action: suspend () -> T): Result<T> {
    return try {
        Result.Success(action())
    } catch (e: Exception) {
        Result.Error(e)
    }
}