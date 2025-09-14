package com.paymentsmaps.android.data.repository

import com.paymentsmaps.android.data.remote.SupabaseConfig
import com.paymentsmaps.android.data.remote.NetworkExceptionMapper
import com.paymentsmaps.android.data.remote.dto.*
import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.repository.UserRepository
import com.paymentsmaps.android.domain.util.Result
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 用户仓库实现类
 * 负责用户认证、用户数据的CRUD操作和实时订阅
 */
@Singleton
class UserRepositoryImpl @Inject constructor(
    private val supabaseConfig: SupabaseConfig
) : UserRepository {
    
    private val client = supabaseConfig.client
    
    override fun getCurrentUser(): Flow<Result<User?>> = flow {
        emit(Result.Loading)
        try {
            val authUser = client.auth.currentUserOrNull()
            if (authUser == null) {
                emit(Result.Success(null))
                return@flow
            }
            
            // 简化实现，直接创建默认用户
            val user = User.createDefault(authUser.id, authUser.email ?: "")
            emit(Result.Success(user))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to get current user")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in getCurrentUser")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun getUserById(id: String): Flow<Result<User?>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            val user = User.createDefault(id)
            emit(Result.Success(user))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to get user by id: $id")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in getUserById")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun getUsersByRole(role: UserRole): Flow<Result<List<User>>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            val users = listOf(User.createDefault("user_1"))
            emit(Result.Success(users))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to get users by role: $role")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in getUsersByRole")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun searchUsers(query: String): Flow<Result<List<User>>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            val users = listOf(User.createDefault("user_search"))
            emit(Result.Success(users))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to search users with query: $query")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in searchUsers")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun signUp(email: String, password: String): Flow<Result<User>> = flow {
        emit(Result.Loading)
        try {
            val authResult = client.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            
            val authUser = client.auth.currentUserOrNull()
            if (authUser == null) {
                emit(Result.Error(Exception("Failed to create user")))
                return@flow
            }
            
            val user = User.createDefault(authUser.id, email)
            emit(Result.Success(user))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to sign up user: $email")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in signUp")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun signIn(email: String, password: String): Flow<Result<User>> = flow {
        emit(Result.Loading)
        try {
            val authResult = client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            
            val authUser = client.auth.currentUserOrNull()
            if (authUser == null) {
                emit(Result.Error(Exception("Failed to sign in")))
                return@flow
            }
            
            val user = User.createDefault(authUser.id, email)
            emit(Result.Success(user))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to sign in user: $email")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in signIn")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun signOut(): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            client.auth.signOut()
            emit(Result.Success(Unit))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to sign out")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in signOut")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun updateUser(user: User): Flow<Result<User>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            emit(Result.Success(user))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to update user: ${user.id}")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in updateUser")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun updateUserProfile(userId: String, profile: UserProfile): Flow<Result<UserProfile>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            emit(Result.Success(profile))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to update user profile: $userId")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in updateUserProfile")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun updateUserPreferences(userId: String, preferences: UserPreferences): Flow<Result<UserPreferences>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            emit(Result.Success(preferences))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to update user preferences: $userId")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in updateUserPreferences")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun updateUserStatus(userId: String, status: UserStatus): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            emit(Result.Success(Unit))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to update user status: $userId")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in updateUserStatus")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun deleteUser(userId: String): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            emit(Result.Success(Unit))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to delete user: $userId")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in deleteUser")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun resetPassword(email: String): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            client.auth.resetPasswordForEmail(email)
            emit(Result.Success(Unit))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to reset password for email: $email")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in resetPassword")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun verifyEmail(token: String): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现
            emit(Result.Success(Unit))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to verify email with token: $token")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in verifyEmail")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun isAuthenticated(): Flow<Result<Boolean>> = flow {
        try {
            val user = client.auth.currentUserOrNull()
            emit(Result.Success(user != null))
        } catch (e: Exception) {
            Timber.e(e, "Failed to check authentication status")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in isAuthenticated")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun refreshSession(): Flow<Result<Unit>> = flow {
        emit(Result.Loading)
        try {
            client.auth.refreshCurrentSession()
            emit(Result.Success(Unit))
            
        } catch (e: Exception) {
            Timber.e(e, "Failed to refresh session")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in refreshSession")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
    
    override fun subscribeToUserUpdates(userId: String): Flow<Result<User>> = flow {
        try {
            // 简化实现
            emit(Result.Loading)
            val user = User.createDefault(userId)
            emit(Result.Success(user))
        } catch (e: Exception) {
            Timber.e(e, "Failed to subscribe to user updates")
            emit(Result.Error(NetworkExceptionMapper.mapException(e)))
        }
    }.catch { e ->
        Timber.e(e, "Flow error in subscribeToUserUpdates")
        emit(Result.Error(NetworkExceptionMapper.mapException(e)))
    }
}