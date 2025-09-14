package com.paymentsmaps.android.domain.repository

import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.Flow

/**
 * 用户仓库接口
 * 定义用户认证和用户数据管理的抽象方法
 */
interface UserRepository {
    
    // 认证相关
    /**
     * 用户注册
     * @param email 邮箱地址
     * @param password 密码
     * @return 注册成功的用户信息
     */
    fun signUp(email: String, password: String): Flow<Result<User>>
    
    /**
     * 用户登录
     * @param email 邮箱地址
     * @param password 密码
     * @return 登录成功的用户信息
     */
    fun signIn(email: String, password: String): Flow<Result<User>>
    
    /**
     * 用户登出
     */
    fun signOut(): Flow<Result<Unit>>
    
    /**
     * 重置密码
     * @param email 邮箱地址
     */
    fun resetPassword(email: String): Flow<Result<Unit>>
    
    /**
     * 验证邮箱
     * @param token 验证令牌
     */
    fun verifyEmail(token: String): Flow<Result<Unit>>
    
    /**
     * 检查是否已认证
     */
    fun isAuthenticated(): Flow<Result<Boolean>>
    
    /**
     * 刷新会话
     */
    fun refreshSession(): Flow<Result<Unit>>
    
    // 用户数据管理
    /**
     * 获取当前用户信息
     */
    fun getCurrentUser(): Flow<Result<User?>>
    
    /**
     * 根据ID获取用户信息
     * @param id 用户ID
     */
    fun getUserById(id: String): Flow<Result<User?>>
    
    /**
     * 根据角色获取用户列表
     * @param role 用户角色
     */
    fun getUsersByRole(role: UserRole): Flow<Result<List<User>>>
    
    /**
     * 搜索用户
     * @param query 搜索关键词
     */
    fun searchUsers(query: String): Flow<Result<List<User>>>
    
    /**
     * 更新用户信息
     * @param user 用户信息
     */
    fun updateUser(user: User): Flow<Result<User>>
    
    /**
     * 更新用户档案
     * @param userId 用户ID
     * @param profile 用户档案
     */
    fun updateUserProfile(userId: String, profile: UserProfile): Flow<Result<UserProfile>>
    
    /**
     * 更新用户偏好设置
     * @param userId 用户ID
     * @param preferences 用户偏好设置
     */
    fun updateUserPreferences(userId: String, preferences: UserPreferences): Flow<Result<UserPreferences>>
    
    /**
     * 更新用户状态
     * @param userId 用户ID
     * @param status 用户状态
     */
    fun updateUserStatus(userId: String, status: UserStatus): Flow<Result<Unit>>
    
    /**
     * 删除用户（软删除）
     * @param userId 用户ID
     */
    fun deleteUser(userId: String): Flow<Result<Unit>>
    
    // 实时订阅
    /**
     * 订阅用户更新
     * @param userId 用户ID
     */
    fun subscribeToUserUpdates(userId: String): Flow<Result<User>>
}