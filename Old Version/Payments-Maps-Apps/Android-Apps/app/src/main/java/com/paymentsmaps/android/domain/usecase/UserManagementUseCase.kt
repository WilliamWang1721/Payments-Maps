package com.paymentsmaps.android.domain.usecase

import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.repository.UserRepository
import com.paymentsmaps.android.domain.util.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 用户管理用例
 * 处理用户信息管理、档案更新等业务逻辑
 */
@Singleton
class UserManagementUseCase @Inject constructor(
    private val userRepository: UserRepository
) {
    
    /**
     * 获取当前用户信息
     * @return 当前用户信息
     */
    fun getCurrentUser(): Flow<Result<User?>> {
        return userRepository.getCurrentUser()
    }

    /**
     * 根据ID获取用户信息
     * @param id 用户ID
     * @return 用户信息
     */
    fun getUserById(id: String): Flow<Result<User?>> {
        return userRepository.getUserById(id)
    }
    
    /**
     * 根据角色获取用户列表
     * @param role 用户角色
     * @return 用户列表
     */
    fun getUsersByRole(role: UserRole): Flow<Result<List<User>>> {
        return userRepository.getUsersByRole(role)
    }
    
    /**
     * 搜索用户
     * @param query 搜索关键词
     * @return 搜索结果
     */
    fun searchUsers(query: String): Flow<Result<List<User>>> {
        return userRepository.searchUsers(query)
    }
    
    /**
     * 更新用户信息
     * @param user 用户信息
     * @return 更新结果
     */
    fun updateUser(user: User): Flow<Result<User>> {
        return userRepository.updateUser(user)
    }
    
    /**
     * 更新用户档案
     * @param userId 用户ID
     * @param profile 用户档案
     * @return 更新结果
     */
    fun updateUserProfile(userId: String, profile: UserProfile): Flow<Result<UserProfile>> {
        return userRepository.updateUserProfile(userId, profile)
    }
    
    /**
     * 更新用户偏好设置
     * @param userId 用户ID
     * @param preferences 用户偏好设置
     * @return 更新结果
     */
    fun updateUserPreferences(userId: String, preferences: UserPreferences): Flow<Result<UserPreferences>> {
        return userRepository.updateUserPreferences(userId, preferences)
    }
    
    /**
     * 更新用户状态
     * @param userId 用户ID
     * @param status 用户状态
     * @return 更新结果
     */
    fun updateUserStatus(userId: String, status: UserStatus): Flow<Result<Unit>> {
        return userRepository.updateUserStatus(userId, status)
    }
    
    /**
     * 删除用户（软删除）
     * @param userId 用户ID
     * @return 删除结果
     */
    fun deleteUser(userId: String): Flow<Result<Unit>> {
        return userRepository.deleteUser(userId)
    }
    
    /**
     * 订阅用户更新
     * @param userId 用户ID
     * @return 用户更新流
     */
    fun subscribeToUserUpdates(userId: String): Flow<Result<User>> {
        return userRepository.subscribeToUserUpdates(userId)
    }
    
    /**
     * 验证用户权限
     * @param user 用户信息
     * @param permission 所需权限
     * @return 是否有权限
     */
    fun hasPermission(user: User, permission: Permission): Boolean {
        return user.permissions.contains(permission)
    }
    
    /**
     * 检查用户是否可以管理POS机
     * @param user 用户信息
     * @return 是否可以管理
     */
    fun canManagePOSMachines(user: User): Boolean {
        return user.canManagePOS
    }
    
    /**
     * 检查用户是否已验证
     * @param user 用户信息
     * @return 是否已验证
     */
    fun isUserVerified(user: User): Boolean {
        return user.isVerified
    }
    
    /**
     * 获取用户显示名称
     * @param user 用户信息
     * @return 显示名称
     */
    fun getUserDisplayName(user: User): String {
        return user.displayName
    }
    
    /**
     * 检查用户是否为管理员
     * @param user 用户信息
     * @return 是否为管理员
     */
    fun isAdmin(user: User): Boolean {
        return user.role == UserRole.ADMIN || user.role == UserRole.SUPER_ADMIN
    }
    
    /**
     * 检查用户是否为商户
     * @param user 用户信息
     * @return 是否为商户
     */
    fun isMerchant(user: User): Boolean {
        return user.role == UserRole.MERCHANT
    }
    
    /**
     * 检查用户是否活跃
     * @param user 用户信息
     * @return 是否活跃
     */
    fun isUserActive(user: User): Boolean {
        return user.status == UserStatus.ACTIVE
    }
}
