package com.paymentsmaps.android.data.repository

import com.paymentsmaps.android.data.remote.SupabaseConfig
import com.paymentsmaps.android.data.remote.NetworkExceptionMapper
import com.paymentsmaps.android.data.remote.dto.*
import com.paymentsmaps.android.domain.model.*
import com.paymentsmaps.android.domain.repository.POSRepository
import com.paymentsmaps.android.domain.repository.POSMachineStats
import com.paymentsmaps.android.domain.util.Result
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.PostgrestQueryBuilder
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import java.time.LocalDateTime

/**
 * POS机仓库实现类
 * 负责POS机数据的CRUD操作和实时订阅
 */
@Singleton
class POSRepositoryImpl @Inject constructor(
    private val supabaseConfig: SupabaseConfig
) : POSRepository {
    
    private val client = supabaseConfig.client
    
    override suspend fun getAllPOSMachines(): Flow<Result<List<POSMachine>>> = flow {
        emit(Result.Loading)
        try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select()
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }
            emit(Result.Success(posMachines))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machines")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun getPOSMachineById(id: String): Flow<Result<POSMachine?>> = flow {
        emit(Result.Loading)
        try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select {
                    filter { 
                        POSMachineDto::id eq id
                    }
                }
                .decodeSingleOrNull<POSMachineDto>()
            
            val posMachine = response?.toDomain()
            emit(Result.Success(posMachine))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machine by id: $id")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun getPOSMachinesByMerchantId(merchantId: String): Flow<Result<List<POSMachine>>> = flow {
        emit(Result.Loading)
        try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select {
                    filter {
                        POSMachineDto::merchantId eq merchantId
                    }
                }
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }
            emit(Result.Success(posMachines))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machines by merchant id: $merchantId")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun getPOSMachinesByStatus(status: POSStatus): Flow<Result<List<POSMachine>>> = flow {
        emit(Result.Loading)
        try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select {
                    filter {
                        POSMachineDto::status eq status.name.lowercase()
                    }
                }
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }
            emit(Result.Success(posMachines))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machines by status: $status")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun getPOSMachinesInRange(
        centerLat: Double, 
        centerLng: Double, 
        radiusKm: Double
    ): Flow<Result<List<POSMachine>>> = flow {
        emit(Result.Loading)
        try {
            // 简化实现，返回所有机器（实际应该有地理查询）
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select()
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }.filter { posMachine ->
                // 简单的距离过滤（实际应该在数据库层面做）
                val distance = calculateDistance(
                    centerLat, centerLng,
                    posMachine.location.latitude, posMachine.location.longitude
                )
                distance <= radiusKm
            }
            emit(Result.Success(posMachines))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machines in range")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun searchPOSMachines(query: String): Flow<Result<List<POSMachine>>> = flow {
        emit(Result.Loading)
        try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select {
                    filter {
                        POSMachineDto::serialNumber ilike "%$query%"
                    }
                }
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }
            emit(Result.Success(posMachines))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to search POS machines with query: $query")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun createPOSMachine(posMachine: POSMachine): Result<POSMachine> {
        return try {
            val dto = posMachine.toDto()
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .insert(dto)
                .decodeSingle<POSMachineDto>()
            
            Result.Success(response.toDomain())
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to create POS machine")
            Result.Error(networkException)
        }
    }
    
    override suspend fun updatePOSMachine(posMachine: POSMachine): Result<POSMachine> {
        return try {
            val dto = posMachine.toDto()
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .update(dto) {
                    filter {
                        POSMachineDto::id eq posMachine.id
                    }
                }
                .decodeSingle<POSMachineDto>()
            
            Result.Success(response.toDomain())
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to update POS machine")
            Result.Error(networkException)
        }
    }
    
    override suspend fun updatePOSMachineStatus(id: String, status: POSStatus): Result<POSMachine> {
        return try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .update(
                    buildJsonObject {
                        put("status", status.name.lowercase())
                        put("updated_at", LocalDateTime.now().toString())
                    }
                ) {
                    filter {
                        POSMachineDto::id eq id
                    }
                }
                .decodeSingle<POSMachineDto>()
            
            Result.Success(response.toDomain())
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to update POS machine status")
            Result.Error(networkException)
        }
    }
    
    override suspend fun deletePOSMachine(id: String): Result<Unit> {
        return try {
            client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .delete {
                    filter {
                        POSMachineDto::id eq id
                    }
                }
            
            Result.Success(Unit)
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to delete POS machine")
            Result.Error(networkException)
        }
    }
    
    override suspend fun activatePOSMachine(id: String): Result<POSMachine> {
        return updatePOSMachineStatus(id, POSStatus.ACTIVE)
    }
    
    override suspend fun deactivatePOSMachine(id: String): Result<POSMachine> {
        return updatePOSMachineStatus(id, POSStatus.INACTIVE)
    }
    
    override suspend fun updatePOSMachineLocation(
        id: String, 
        latitude: Double, 
        longitude: Double, 
        address: String
    ): Result<POSMachine> {
        return try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .update(
                    buildJsonObject {
                        put("location_latitude", latitude)
                        put("location_longitude", longitude)
                        put("location_address", address)
                        put("updated_at", LocalDateTime.now().toString())
                    }
                ) {
                    filter {
                        POSMachineDto::id eq id
                    }
                }
                .decodeSingle<POSMachineDto>()
            
            Result.Success(response.toDomain())
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to update POS machine location")
            Result.Error(networkException)
        }
    }
    
    override suspend fun getPOSMachinesNeedingMaintenance(): Flow<Result<List<POSMachine>>> = flow {
        emit(Result.Loading)
        try {
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select {
                    filter {
                        POSMachineDto::status eq POSStatus.MAINTENANCE.name.lowercase()
                    }
                }
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }
            emit(Result.Success(posMachines))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machines needing maintenance")
            emit(Result.Error(networkException))
        }
    }
    
    override suspend fun getPOSMachineStats(): Flow<Result<POSMachineStats>> = flow {
        emit(Result.Loading)
        try {
            // 简化统计实现
            val response = client
                .from(SupabaseConfig.Tables.POS_MACHINES)
                .select()
                .decodeList<POSMachineDto>()
            
            val posMachines = response.map { it.toDomain() }
            val stats = POSMachineStats(
                totalCount = posMachines.size,
                activeCount = posMachines.count { it.status == POSStatus.ACTIVE },
                inactiveCount = posMachines.count { it.status == POSStatus.INACTIVE },
                maintenanceCount = posMachines.count { it.status == POSStatus.MAINTENANCE },
                errorCount = posMachines.count { it.status == POSStatus.ERROR },
                pendingCount = posMachines.count { it.status == POSStatus.PENDING },
                averageTransactionVolume = 0.0,
                topPerformingMachines = emptyList(),
                recentlyAddedCount = 0,
                maintenanceDueCount = 0
            )
            
            emit(Result.Success(stats))
            
        } catch (e: Exception) {
            val networkException = NetworkExceptionMapper.mapException(e)
            Timber.e(networkException, "Failed to fetch POS machine stats")
            emit(Result.Error(networkException))
        }
    }
    
    /**
     * 计算两点间距离（简化的哈弗辛公式）
     */
    private fun calculateDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val earthRadius = 6371.0 // 地球半径（公里）
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadius * c
    }
}