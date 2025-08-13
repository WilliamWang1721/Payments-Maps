import { create } from 'zustand'
import { type POSMachine, supabase } from '@/lib/supabase'
import { locationUtils } from '@/lib/amap'

interface MapState {
  // 地图状态
  mapInstance: AMap.Map | null
  currentLocation: { longitude: number; latitude: number } | null
  
  // POS机数据
  posMachines: POSMachine[]
  selectedPOSMachine: POSMachine | null
  
  // 加载状态
  loading: boolean
  locationLoading: boolean
  
  // 筛选和搜索
  searchKeyword: string
  filters: {
    supportsApplePay?: boolean
    supportsGooglePay?: boolean
    supportsForeignCards?: boolean
    supportsContactless?: boolean
    minRating?: number
    maxDistance?: number
  }
  
  // 视图模式
  viewMode: 'map' | 'list'
  
  // Actions
  setMapInstance: (map: AMap.Map) => void
  getCurrentLocation: () => Promise<void>
  loadPOSMachines: (bounds?: { northeast: [number, number]; southwest: [number, number] }) => Promise<void>
  selectPOSMachine: (posMachine: POSMachine | null) => void
  setSearchKeyword: (keyword: string) => void
  setFilters: (filters: Partial<MapState['filters']>) => void
  setViewMode: (mode: 'map' | 'list') => void
  addPOSMachine: (posMachine: Omit<POSMachine, 'id' | 'created_at' | 'updated_at'>) => Promise<POSMachine>
  updatePOSMachine: (id: string, updates: Partial<POSMachine>) => Promise<void>
  deletePOSMachine: (id: string) => Promise<void>
}

export const useMapStore = create<MapState>((set, get) => ({
  // 初始状态
  mapInstance: null,
  currentLocation: null,
  posMachines: [],
  selectedPOSMachine: null,
  loading: false,
  locationLoading: false,
  searchKeyword: '',
  filters: {},
  viewMode: 'map',

  // Actions
  setMapInstance: (map) => {
    set({ mapInstance: map })
  },

  getCurrentLocation: async () => {
    try {
      set({ locationLoading: true })
      const location = await locationUtils.getCurrentPosition()
      set({ currentLocation: location })
      
      // 如果地图实例存在，移动到当前位置
      const { mapInstance } = get()
      if (mapInstance) {
        mapInstance.setCenter([location.longitude, location.latitude])
      }
    } catch (error) {
      console.error('获取位置失败:', error)
      throw error
    } finally {
      set({ locationLoading: false })
    }
  },

  loadPOSMachines: async (bounds) => {
    try {
      set({ loading: true })
      
      // 从Supabase数据库加载POS机数据
      const { data: posMachines, error } = await supabase
        .from('pos_machines')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('加载POS机数据失败:', error)
        throw error
      }
      
      // 计算距离和评分
      const { currentLocation } = get()
      
      // 获取所有POS机的评价数据
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('pos_machine_id, rating')
      
      // 计算每个POS机的平均评分和评价数量
      const reviewStats = (reviewsData || []).reduce((acc, review) => {
        if (!acc[review.pos_machine_id]) {
          acc[review.pos_machine_id] = { ratings: [], count: 0 }
        }
        acc[review.pos_machine_id].ratings.push(review.rating)
        acc[review.pos_machine_id].count++
        return acc
      }, {} as Record<string, { ratings: number[], count: number }>)
      
      const processedData = (posMachines || []).map(machine => {
        const stats = reviewStats[machine.id] || { ratings: [], count: 0 }
        const avgRating = stats.ratings.length > 0 
          ? stats.ratings.reduce((sum, rating) => sum + rating, 0) / stats.ratings.length
          : 0
        const reviewCount = stats.count
        
        let distance = 0
        if (currentLocation) {
          distance = locationUtils.calculateDistance(
            currentLocation,
            { longitude: Number(machine.longitude), latitude: Number(machine.latitude) }
          )
        }
        
        return {
          ...machine,
          longitude: Number(machine.longitude),
          latitude: Number(machine.latitude),
          avgRating,
          distance,
          reviewCount,
        }
      })
      
      set({ posMachines: processedData })
    } catch (error) {
      console.error('加载POS机数据失败:', error)
      // 设置空数组，避免界面卡住
      set({ posMachines: [] })
    } finally {
      set({ loading: false })
    }
  },

  selectPOSMachine: (posMachine) => {
    set({ selectedPOSMachine: posMachine })
  },

  setSearchKeyword: (keyword) => {
    set({ searchKeyword: keyword })
  },

  setFilters: (newFilters) => {
    set(state => ({ filters: { ...state.filters, ...newFilters } }))
  },

  setViewMode: (mode) => {
    set({ viewMode: mode })
  },

  addPOSMachine: async (posMachineData) => {
    try {
      // 获取当前用户（如果未登录则使用null）
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null
      
      // 准备数据 - 确保name字段有值或者不包含name字段
      const { name, ...baseData } = posMachineData as any
      const newPOSMachine = {
        ...baseData,
        created_by: userId,
        status: 'active' as const,
        // 如果有merchant_name，使用它作为name的默认值，否则不包含name字段
        ...(baseData.merchant_name ? { name: baseData.merchant_name } : {})
      }
      
      // 保存到Supabase数据库
      let { data, error } = await supabase
        .from('pos_machines')
        .insert([newPOSMachine])
        .select()
        .single()
      
      // 如果遇到列不存在的错误（custom_links、remarks 或 checkout_location），尝试移除可能缺失的列后重试
        if (error && error.message && (error.message.includes('custom_links') || error.message.includes('remarks') || error.message.includes('checkout_location'))) {
        console.warn('检测到数据库列缺失，尝试移除相关字段后重试:', error.message)
        
        // 创建备份数据，并仅移除触发错误的列，保留其余字段
        const fallbackData = { ...newPOSMachine }
        if (error.message.includes('custom_links')) delete (fallbackData as any).custom_links
        if (error.message.includes('remarks')) delete (fallbackData as any).remarks
        if (error.message.includes('checkout_location')) {
          // 如果checkout_location字段不存在，从basic_info中移除
          if (fallbackData.basic_info && 'checkout_location' in fallbackData.basic_info) {
            const { checkout_location, ...restBasicInfo } = fallbackData.basic_info
            fallbackData.basic_info = restBasicInfo
          }
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from('pos_machines')
          .insert([fallbackData])
          .select()
          .single()
        
        if (retryError) {
          console.error('重试添加POS机失败:', retryError)
          throw retryError
        }
        
        data = retryData
        error = null
      }
      
      // 处理name字段非空约束违反错误
      if (error && error.code === '23502' && error.message && error.message.includes('name')) {
        console.error('name字段非空约束违反:', {
          error: error.message,
          data: newPOSMachine,
          hasName: 'name' in newPOSMachine,
          nameValue: newPOSMachine.name
        })
      }
      
      if (error) {
        console.error('添加POS机失败:', error)
        throw error
      }
      
      // 更新本地状态
      const processedMachine = {
        ...data,
        longitude: Number(data.longitude),
        latitude: Number(data.latitude),
        avgRating: 0,
        distance: 0,
        reviewCount: 0,
      }
      
      set(state => ({
        posMachines: [...state.posMachines, processedMachine]
      }))
      
      return processedMachine
    } catch (error) {
      console.error('添加POS机失败:', error)
      throw error
    }
  },

  updatePOSMachine: async (id, updates) => {
    try {
      // 准备更新数据 - 确保name字段有值或者不包含name字段
      const { name, ...baseUpdates } = updates as any
      const finalUpdates = {
        ...baseUpdates,
        // 如果有merchant_name，使用它作为name的默认值，否则不包含name字段
        ...(baseUpdates.merchant_name ? { name: baseUpdates.merchant_name } : {})
      }
      
      // 更新Supabase数据库
      let { data, error } = await supabase
        .from('pos_machines')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single()
      
      // 如果遇到列不存在的错误（custom_links、remarks 或 checkout_location），尝试移除相关字段后重试
        if (error && error.message && (error.message.includes('custom_links') || error.message.includes('remarks') || error.message.includes('checkout_location'))) {
        console.warn('检测到数据库列缺失，尝试移除相关字段后重试:', error.message)
        
        // 创建备份更新数据，并仅移除触发错误的列，保留其余字段
        const fallbackUpdates = { ...finalUpdates }
        if (error.message.includes('custom_links')) delete (fallbackUpdates as any).custom_links
        if (error.message.includes('remarks')) delete (fallbackUpdates as any).remarks
        if (error.message.includes('checkout_location')) {
          // 如果checkout_location字段不存在，从basic_info中移除
          if (fallbackUpdates.basic_info && 'checkout_location' in fallbackUpdates.basic_info) {
            const { checkout_location, ...restBasicInfo } = fallbackUpdates.basic_info
            fallbackUpdates.basic_info = restBasicInfo
          }
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from('pos_machines')
          .update(fallbackUpdates)
          .eq('id', id)
          .select()
          .single()
        
        if (retryError) {
          console.error('重试更新POS机失败:', retryError)
          throw retryError
        }
        
        data = retryData
        error = null
      }
      
      if (error) {
        console.error('更新POS机失败:', error)
        throw error
      }
      
      // 更新本地状态
      const processedMachine = {
        ...data,
        longitude: Number(data.longitude),
        latitude: Number(data.latitude),
      }
      
      set(state => ({
        posMachines: state.posMachines.map(machine => 
          machine.id === id ? { ...machine, ...processedMachine } : machine
        ),
        selectedPOSMachine: state.selectedPOSMachine?.id === id 
          ? { ...state.selectedPOSMachine, ...processedMachine }
          : state.selectedPOSMachine
      }))
    } catch (error) {
      console.error('更新POS机失败:', error)
      throw error
    }
  },

  deletePOSMachine: async (id) => {
    try {
      // 从Supabase数据库删除
      const { error } = await supabase
        .from('pos_machines')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('删除POS机失败:', error)
        throw error
      }
      
      // 更新本地状态
      set(state => ({
        posMachines: state.posMachines.filter(machine => machine.id !== id),
        selectedPOSMachine: state.selectedPOSMachine?.id === id ? null : state.selectedPOSMachine
      }))
    } catch (error) {
      console.error('删除POS机失败:', error)
      throw error
    }
  },
}))