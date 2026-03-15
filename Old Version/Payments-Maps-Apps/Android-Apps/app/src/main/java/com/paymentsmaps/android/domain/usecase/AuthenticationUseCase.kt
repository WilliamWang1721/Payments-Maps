package com.paymentsmaps.android.domain.usecase

import com.paymentsmaps.android.domain.util.Result
import com.paymentsmaps.android.domain.model.User
import com.paymentsmaps.android.domain.repository.UserRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 用户认证用例
 * 处理用户登录、注册、登出等认证相关业务逻辑
 */
@Singleton
class AuthenticationUseCase @Inject constructor(
    private val userRepository: UserRepository
) {
    
    /**
     * 用户注册
     * @param email 邮箱地址
     * @param password 密码
     * @return 注册结果
     */
    fun signUp(email: String, password: String): Flow<Result<User>> {
        return userRepository.signUp(email, password)
    }
    
    /**
     * 用户登录
     * @param email 邮箱地址
     * @param password 密码
     * @return 登录结果
     */
    fun signIn(email: String, password: String): Flow<Result<User>> {
        return userRepository.signIn(email, password)
    }
    
    /**
     * 用户登出
     * @return 登出结果
     */
    fun signOut(): Flow<Result<Unit>> {
        return userRepository.signOut()
    }
    
    /**
     * 重置密码
     * @param email 邮箱地址
     * @return 重置结果
     */
    fun resetPassword(email: String): Flow<Result<Unit>> {
        return userRepository.resetPassword(email)
    }
    
    /**
     * 验证邮箱
     * @param token 验证令牌
     * @return 验证结果
     */
    fun verifyEmail(token: String): Flow<Result<Unit>> {
        return userRepository.verifyEmail(token)
    }
    
    /**
     * 检查是否已认证
     * @return 认证状态
     */
    fun isAuthenticated(): Flow<Result<Boolean>> {
        return userRepository.isAuthenticated()
    }
    
    /**
     * 获取当前用户信息
     * @return 当前用户
     */
    fun getCurrentUser(): Flow<Result<User?>> {
        return userRepository.getCurrentUser()
    }
    
    /**
     * 刷新会话
     * @return 刷新结果
     */
    fun refreshSession(): Flow<Result<Unit>> {
        return userRepository.refreshSession()
    }
}