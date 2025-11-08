import { create } from 'zustand'
import { type POSMachine, supabase } from '@/lib/supabase'
import { locationUtils } from '@/lib/amap'
import { useAuthStore } from '@/stores/useAuthStore'

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
    // 支付方式筛选
    supportsApplePay?: boolean
    supportsGooglePay?: boolean
    supportsContactless?: boolean
    supportsHCE?: boolean
    
    // 卡组织筛选
    supportsVisa?: boolean
    supportsMastercard?: boolean
    supportsUnionPay?: boolean
    supportsAmex?: boolean
    supportsJCB?: boolean
    supportsDiners?: boolean
    supportsDiscover?: boolean
    
    // 验证模式筛选
    supportsSmallAmountExemption?: boolean
    supportsPinVerification?: boolean
    supportsSignatureVerification?: boolean
    
    // 收单模式筛选
    supportsDCC?: boolean
    supportsEDC?: boolean
    
    // 其他筛选
    acquiringInstitution?: string
    posModel?: string
    status?: string
    
    // 新增高级筛选选项
    // 评分筛选
    minRating?: number
    
    // 距离筛选
    maxDistance?: number
    
    // 收银位置筛选
    checkoutLocation?: string
    
    // 商户类型筛选
    merchantType?: string
    
    // 最低免密金额筛选
    minAmountNoPin?: number
    maxAmountNoPin?: number
    
    // 是否有备注信息筛选
    hasRemarks?: boolean
    
    // 是否有评价筛选
    hasReviews?: boolean
    
    // 创建时间筛选
    createdAfter?: string
  createdBefore?: string
  }
  
  // 视图模式
  viewMode: 'map' | 'list'
  
  // Actions
  setMapInstance: (map: AMap.Map | null) => void
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
      
      const { searchKeyword, filters } = get()
      
      // 构建查询
      let query = supabase
        .from('pos_machines')
        .select('*')
      
      // 如果有搜索关键词，添加搜索条件（支持中文、英文、拼音）
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = searchKeyword.trim().toLowerCase()
        query = query.or(
          `merchant_name.ilike.%${keyword}%,` +
          `merchant_name_en.ilike.%${keyword}%,` +
          `merchant_name_pinyin.ilike.%${keyword}%,` +
          `address.ilike.%${keyword}%,` +
          `address_en.ilike.%${keyword}%,` +
          `address_pinyin.ilike.%${keyword}%,` +
          `basic_info->>model.ilike.%${keyword}%,` +
          `basic_info->>acquiring_institution.ilike.%${keyword}%`
        )
      }
      
      // 添加筛选条件
      // 支付方式筛选
      if (filters.supportsApplePay) {
        query = query.eq('basic_info->>supports_apple_pay', true)
      }
      if (filters.supportsGooglePay) {
        query = query.eq('basic_info->>supports_google_pay', true)
      }
      if (filters.supportsContactless) {
        query = query.eq('basic_info->>supports_contactless', true)
      }
      if (filters.supportsHCE) {
        query = query.eq('basic_info->>supports_hce', true)
      }
      
      // 卡组织筛选
      if (filters.supportsVisa) {
        query = query.eq('basic_info->>supports_visa', true)
      }
      if (filters.supportsMastercard) {
        query = query.eq('basic_info->>supports_mastercard', true)
      }
      if (filters.supportsUnionPay) {
        query = query.eq('basic_info->>supports_unionpay', true)
      }
      if (filters.supportsAmex) {
        query = query.eq('basic_info->>supports_amex', true)
      }
      if (filters.supportsJCB) {
        query = query.eq('basic_info->>supports_jcb', true)
      }
      if (filters.supportsDiners) {
        query = query.eq('basic_info->>supports_diners', true)
      }
      if (filters.supportsDiscover) {
        query = query.eq('basic_info->>supports_discover', true)
      }
      
      // 验证模式筛选
      if (filters.supportsSmallAmountExemption) {
        query = query.eq('basic_info->>supports_small_amount_exemption', true)
      }
      if (filters.supportsPinVerification) {
        query = query.eq('basic_info->>supports_pin_verification', true)
      }
      if (filters.supportsSignatureVerification) {
        query = query.eq('basic_info->>supports_signature_verification', true)
      }
      
      // 收单模式筛选
      if (filters.supportsDCC) {
        query = query.eq('basic_info->>supports_dcc', true)
      }
      if (filters.supportsEDC) {
        query = query.eq('basic_info->>supports_edc', true)
      }
      
      // 其他筛选
      if (filters.acquiringInstitution) {
        query = query.ilike('basic_info->>acquiring_institution', `%${filters.acquiringInstitution}%`)
      }
      if (filters.posModel) {
        query = query.ilike('basic_info->>model', `%${filters.posModel}%`)
      }
      
      // 状态筛选
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      // 收银位置筛选
      if (filters.checkoutLocation) {
        query = query.eq('basic_info->>checkout_location', filters.checkoutLocation)
      }
      
      // 商户类型筛选
      if (filters.merchantType) {
        query = query.eq('merchant_info->>transaction_type', filters.merchantType)
      }
      
      // 最低免密金额筛选
      if (filters.minAmountNoPin !== undefined) {
        query = query.gte('basic_info->>min_amount_no_pin', filters.minAmountNoPin)
      }
      if (filters.maxAmountNoPin !== undefined) {
        query = query.lte('basic_info->>min_amount_no_pin', filters.maxAmountNoPin)
      }
      
      // 是否有备注信息筛选
      if (filters.hasRemarks !== undefined) {
        if (filters.hasRemarks) {
          query = query.not('remarks', 'is', null).neq('remarks', '')
        } else {
          query = query.or('remarks.is.null,remarks.eq.')
        }
      }
      
      // 创建时间筛选
      if (filters.createdAfter) {
        query = query.gte('created_at', new Date(filters.createdAfter).toISOString())
      }
      if (filters.createdBefore) {
        query = query.lte('created_at', new Date(filters.createdBefore).toISOString())
      }
      
      const { data: posMachines, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load POS machine data / 加载POS机数据失败:', error)
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
      }).filter(machine => {
        // 应用客户端筛选（评分、距离、是否有评价）
        
        // 评分筛选
        if (filters.minRating !== undefined && machine.avgRating < filters.minRating) {
          return false
        }
        
        // 距离筛选
        if (filters.maxDistance !== undefined && machine.distance > filters.maxDistance) {
          return false
        }
        
        // 是否有评价筛选
        if (filters.hasReviews !== undefined) {
          if (filters.hasReviews && machine.reviewCount === 0) {
            return false
          }
          if (!filters.hasReviews && machine.reviewCount > 0) {
            return false
          }
        }
        
        return true
      })
      
      set({ posMachines: processedData })
    } catch (error) {
      console.error('Failed to load POS machine data / 加载POS机数据失败:', error)
      // 设置空数组，避免界面卡住 / Set empty array to prevent UI freeze
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
      console.log('开始添加POS机，数据:', posMachineData)
      
      // 优先从全局认证状态获取当前用户，避免网络阻塞
      const authUser = useAuthStore.getState().user
      const userId = authUser?.id || null
      console.log('当前用户ID(来自AuthStore):', userId)
      console.log('完整用户信息:', authUser)
      
      // 验证用户是否已登录
      if (!userId) {
        console.error('用户未登录，无法添加POS机')
        throw new Error('请先登录后再添加POS机')
      }
      
      // 双重验证：检查 Supabase 认证状态
      try {
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()
        console.log('Supabase认证状态:', { user: supabaseUser, error: authError })
        
        if (authError || !supabaseUser) {
          console.error('Supabase认证失败:', authError)
          throw new Error('认证状态异常，请重新登录')
        }
        
        if (supabaseUser.id !== userId) {
          console.warn('用户ID不匹配:', { authStore: userId, supabase: supabaseUser.id })
        }
      } catch (authCheckError) {
        console.error('认证检查失败:', authCheckError)
        throw new Error('无法验证用户身份，请重新登录')
      }
      
      // 准备数据 - 移除attempts字段（attempts应保存到pos_attempts表），使用merchant_name作为name字段
      const { attempts: _, ...baseData } = posMachineData as any
      const newPOSMachine = {
        ...baseData,
        name: baseData.merchant_name || '未命名POS机', // 确保name字段有值
        created_by: userId,
        status: 'active' as const
      }
      
      console.log('准备插入的数据:', newPOSMachine)
      
      // 添加网络状态检查
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试')
      }
      
      console.log('开始数据库插入操作...')
      const startTime = Date.now()
      
      // 保存到Supabase数据库
      let { data, error } = await supabase
        .from('pos_machines')
        .insert([newPOSMachine])
        .select()
        .single()
      
      const endTime = Date.now()
      console.log(`数据库插入耗时: ${endTime - startTime}ms`)
      console.log('数据库插入结果:', { data, error })
      
      // 检查是否是网络超时错误
      if (error && (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('fetch'))) {
        console.error('检测到网络相关错误:', error)
        throw new Error('网络请求超时，请检查网络连接后重试')
      }
      
      // 如果遇到列不存在的错误，尝试移除可能缺失的列后重试
      if (error && error.message && (error.message.includes('custom_links') || error.message.includes('remarks') || error.message.includes('checkout_location') || error.message.includes('verification_modes') || error.message.includes('merchant_info'))) {
        console.warn('检测到数据库列缺失，尝试移除相关字段后重试:', error.message)
        
        // 创建备份数据，并仅移除触发错误的列，保留其余字段
        const fallbackData = { ...newPOSMachine }
        if (error.message.includes('custom_links')) delete (fallbackData as any).custom_links
        if (error.message.includes('remarks')) delete (fallbackData as any).remarks
        if (error.message.includes('verification_modes')) delete (fallbackData as any).verification_modes
        if (error.message.includes('merchant_info')) delete (fallbackData as any).merchant_info
        if (error.message.includes('checkout_location')) {
          // 如果checkout_location字段不存在，从basic_info中移除
          if (fallbackData.basic_info && 'checkout_location' in fallbackData.basic_info) {
            const { checkout_location: _, ...restBasicInfo } = fallbackData.basic_info
            fallbackData.basic_info = restBasicInfo
          }
        }
        
        console.log('重试插入的数据:', fallbackData)
        
        const { data: retryData, error: retryError } = await supabase
          .from('pos_machines')
          .insert([fallbackData])
          .select()
          .single()
        
        console.log('重试插入结果:', { data: retryData, error: retryError })
        
        if (retryError) {
          console.error('重试添加POS机失败:', retryError)
          throw retryError
        }
        
        data = retryData
        error = null
      }
      
      // name字段已从数据库schema中移除，无需处理相关约束错误
      
      if (error) {
        console.error('添加POS机失败:', error)
        throw error
      }
      
      console.log('成功添加POS机:', data)
      
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
      const { name: _, ...baseUpdates } = updates as any
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
            const { checkout_location: _, ...restBasicInfo } = fallbackUpdates.basic_info
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