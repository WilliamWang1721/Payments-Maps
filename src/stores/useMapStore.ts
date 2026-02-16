import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { locationUtils } from '@/lib/amap'
import { useAuthStore } from '@/stores/useAuthStore'
import { parseSearchInput, type GlobalSearchQuery } from '@/utils/searchParser'
import type { POSMachine } from '@/types'

const ADD_POS_IDEMPOTENCY_STORAGE_KEY = 'pos_add_idempotency_v1'
const ADD_POS_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000
const ADD_POS_DEDUPE_WINDOW_MS = ADD_POS_IDEMPOTENCY_TTL_MS
const inFlightAddPOS = new Map<string, Promise<POSMachine>>()

type IdempotencyRecord = { id: string; createdAt: number }

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const loadIdempotencyMap = (): Record<string, IdempotencyRecord> => {
  const storage = getLocalStorage()
  if (!storage) return {}
  try {
    const raw = storage.getItem(ADD_POS_IDEMPOTENCY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, IdempotencyRecord>) : {}
  } catch {
    return {}
  }
}

const saveIdempotencyMap = (map: Record<string, IdempotencyRecord>) => {
  const storage = getLocalStorage()
  if (!storage) return
  try {
    storage.setItem(ADD_POS_IDEMPOTENCY_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage write errors
  }
}

const pruneIdempotencyMap = (map: Record<string, IdempotencyRecord>, now: number) => {
  Object.entries(map).forEach(([key, value]) => {
    if (!value?.createdAt || now - value.createdAt > ADD_POS_IDEMPOTENCY_TTL_MS) {
      delete map[key]
    }
  })
}

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const getOrCreateIdempotencyKey = (fingerprint: string) => {
  const now = Date.now()
  const map = loadIdempotencyMap()
  pruneIdempotencyMap(map, now)
  const existing = map[fingerprint]
  if (existing?.id) {
    saveIdempotencyMap(map)
    return existing.id
  }
  const id = generateIdempotencyKey()
  map[fingerprint] = { id, createdAt: now }
  saveIdempotencyMap(map)
  return id
}

const clearIdempotencyKey = (fingerprint: string) => {
  const map = loadIdempotencyMap()
  if (map[fingerprint]) {
    delete map[fingerprint]
    saveIdempotencyMap(map)
  }
}

const buildAddPOSFingerprint = (data: { merchant_name?: string; address?: string; latitude?: number; longitude?: number }, userId: string) => {
  const name = (data.merchant_name || '').trim().toLowerCase()
  const address = (data.address || '').trim().toLowerCase()
  const latitude = Number(data.latitude || 0).toFixed(6)
  const longitude = Number(data.longitude || 0).toFixed(6)
  return [userId, name, address, latitude, longitude].join('|')
}

const isNetworkError = (error: any) => {
  const message = error?.message?.toLowerCase?.() || ''
  return message.includes('timeout') || message.includes('network') || message.includes('fetch')
}

const processPOSMachine = (data: POSMachine) => ({
  ...data,
  longitude: Number(data.longitude),
  latitude: Number(data.latitude),
  avgRating: 0,
  distance: 0,
  reviewCount: 0,
})

const findPOSMachineByIdempotency = async (userId: string, requestId: string) => {
  if (!requestId) return null
  const { data, error } = await supabase
    .from('pos_machines')
    .select('*')
    .eq('created_by', userId)
    .contains('extended_fields', { client_request_id: requestId })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn('查询幂等请求失败:', error)
    return null
  }
  return data ? processPOSMachine(data as POSMachine) : null
}

const findRecentDuplicate = async (
  userId: string,
  payload: { merchant_name?: string; address?: string; latitude?: number; longitude?: number },
  windowMs: number
) => {
  const since = new Date(Date.now() - windowMs).toISOString()
  const { data, error } = await supabase
    .from('pos_machines')
    .select('*')
    .eq('created_by', userId)
    .eq('merchant_name', payload.merchant_name || '')
    .eq('address', payload.address || '')
    .eq('latitude', payload.latitude || 0)
    .eq('longitude', payload.longitude || 0)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn('查询重复POS失败:', error)
    return null
  }
  return data ? processPOSMachine(data as POSMachine) : null
}

export interface MapState {
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
  searchQuery: GlobalSearchQuery
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
  setCurrentLocation: (
    location: { longitude: number; latitude: number } | null,
    options?: { centerMap?: boolean }
  ) => void
  getCurrentLocation: () => Promise<void>
  loadPOSMachines: (bounds?: { northeast: [number, number]; southwest: [number, number] }) => Promise<void>
  selectPOSMachine: (posMachine: POSMachine | null) => void
  setSearchKeyword: (keyword: string) => void
  setSearchQuery: (query: GlobalSearchQuery) => void
  setFilters: (filters: Partial<MapState['filters']>) => void
  resetFilters: () => void
  setViewMode: (mode: 'map' | 'list') => void
  addPOSMachine: (posMachine: Omit<POSMachine, 'id' | 'created_at' | 'updated_at'>) => Promise<POSMachine>
  updatePOSMachine: (id: string, updates: Partial<POSMachine>) => Promise<void>
  deletePOSMachine: (id: string) => Promise<void>
}

type MapFilters = MapState['filters']
type POSMachineWithMetrics = POSMachine & {
  avgRating: number
  distance: number
  reviewCount: number
}
type ReviewStatsMap = Record<string, { ratingTotal: number; reviewCount: number }>

const BOOLEAN_FILTER_COLUMNS: ReadonlyArray<[keyof MapFilters, string]> = [
  ['supportsApplePay', 'basic_info->>supports_apple_pay'],
  ['supportsGooglePay', 'basic_info->>supports_google_pay'],
  ['supportsContactless', 'basic_info->>supports_contactless'],
  ['supportsHCE', 'basic_info->>supports_hce'],
  ['supportsVisa', 'basic_info->>supports_visa'],
  ['supportsMastercard', 'basic_info->>supports_mastercard'],
  ['supportsUnionPay', 'basic_info->>supports_unionpay'],
  ['supportsAmex', 'basic_info->>supports_amex'],
  ['supportsJCB', 'basic_info->>supports_jcb'],
  ['supportsDiners', 'basic_info->>supports_diners'],
  ['supportsDiscover', 'basic_info->>supports_discover'],
  ['supportsSmallAmountExemption', 'basic_info->>supports_small_amount_exemption'],
  ['supportsPinVerification', 'basic_info->>supports_pin_verification'],
  ['supportsSignatureVerification', 'basic_info->>supports_signature_verification'],
  ['supportsDCC', 'basic_info->>supports_dcc'],
  ['supportsEDC', 'basic_info->>supports_edc'],
]

const LIKE_FILTER_COLUMNS: ReadonlyArray<['acquiringInstitution' | 'posModel', string]> = [
  ['acquiringInstitution', 'basic_info->>acquiring_institution'],
  ['posModel', 'basic_info->>model'],
]

const EXACT_FILTER_COLUMNS: ReadonlyArray<['status' | 'checkoutLocation' | 'merchantType', string]> = [
  ['status', 'status'],
  ['checkoutLocation', 'basic_info->>checkout_location'],
  ['merchantType', 'merchant_info->>transaction_type'],
]

const applyParsedQueryFilters = (query: any, parsedQuery: GlobalSearchQuery, keyword: string) => {
  let nextQuery = query

  if (keyword) {
    const normalizedKeyword = keyword.toLowerCase()
    nextQuery = nextQuery.or(
      `merchant_name.ilike.%${normalizedKeyword}%,` +
      `address.ilike.%${normalizedKeyword}%,` +
      `basic_info->>model.ilike.%${normalizedKeyword}%,` +
      `basic_info->>acquiring_institution.ilike.%${normalizedKeyword}%`
    )
  }

  if (parsedQuery.coordinates) {
    const { lat, lng } = parsedQuery.coordinates
    const delta = 0.02 // 约 2km 范围
    nextQuery = nextQuery
      .gte('latitude', lat - delta)
      .lte('latitude', lat + delta)
      .gte('longitude', lng - delta)
      .lte('longitude', lng + delta)
  }

  if (parsedQuery.acquiringInstitution) {
    nextQuery = nextQuery.ilike('basic_info->>acquiring_institution', `%${parsedQuery.acquiringInstitution}%`)
  }

  if (parsedQuery.dateRange?.from) {
    nextQuery = nextQuery.gte('created_at', parsedQuery.dateRange.from)
  }
  if (parsedQuery.dateRange?.to) {
    nextQuery = nextQuery.lte('created_at', parsedQuery.dateRange.to)
  }

  return nextQuery
}

const applyServerFilters = (query: any, filters: MapFilters) => {
  let nextQuery = BOOLEAN_FILTER_COLUMNS.reduce((current, [filterKey, column]) => {
    return filters[filterKey] ? current.eq(column, true) : current
  }, query)

  for (const [filterKey, column] of LIKE_FILTER_COLUMNS) {
    const value = filters[filterKey]?.toString().trim()
    if (value) {
      nextQuery = nextQuery.ilike(column, `%${value}%`)
    }
  }

  for (const [filterKey, column] of EXACT_FILTER_COLUMNS) {
    const value = filters[filterKey]
    if (value) {
      nextQuery = nextQuery.eq(column, value)
    }
  }

  if (filters.minAmountNoPin !== undefined) {
    nextQuery = nextQuery.gte('basic_info->>min_amount_no_pin', filters.minAmountNoPin)
  }
  if (filters.maxAmountNoPin !== undefined) {
    nextQuery = nextQuery.lte('basic_info->>min_amount_no_pin', filters.maxAmountNoPin)
  }

  if (filters.hasRemarks !== undefined) {
    nextQuery = filters.hasRemarks
      ? nextQuery.not('remarks', 'is', null).neq('remarks', '')
      : nextQuery.or('remarks.is.null,remarks.eq.')
  }

  if (filters.createdAfter) {
    nextQuery = nextQuery.gte('created_at', new Date(filters.createdAfter).toISOString())
  }
  if (filters.createdBefore) {
    nextQuery = nextQuery.lte('created_at', new Date(filters.createdBefore).toISOString())
  }

  return nextQuery
}

const buildReviewStats = (reviews: Array<{ pos_machine_id: string; rating: number }>): ReviewStatsMap => {
  return reviews.reduce((stats, review) => {
    const current = stats[review.pos_machine_id] || { ratingTotal: 0, reviewCount: 0 }
    current.ratingTotal += review.rating
    current.reviewCount += 1
    stats[review.pos_machine_id] = current
    return stats
  }, {} as ReviewStatsMap)
}

const toMachineWithMetrics = (
  machine: POSMachine,
  reviewStats: ReviewStatsMap,
  currentLocation: { longitude: number; latitude: number } | null
): POSMachineWithMetrics => {
  const stats = reviewStats[machine.id] || { ratingTotal: 0, reviewCount: 0 }
  const avgRating = stats.reviewCount > 0 ? stats.ratingTotal / stats.reviewCount : 0

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
    reviewCount: stats.reviewCount,
  }
}

const matchesClientFilters = (machine: POSMachineWithMetrics, filters: MapFilters) => {
  if (filters.minRating !== undefined && machine.avgRating < filters.minRating) {
    return false
  }

  if (filters.maxDistance !== undefined && machine.distance > filters.maxDistance) {
    return false
  }

  if (filters.hasReviews === undefined) {
    return true
  }

  return filters.hasReviews ? machine.reviewCount > 0 : machine.reviewCount === 0
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
  searchQuery: { raw: '' },
  filters: {},
  viewMode: 'map',

  // Actions
  setMapInstance: (map) => {
    set({ mapInstance: map })
  },

  setCurrentLocation: (location, options = {}) => {
    set({ currentLocation: location })

    if (!location || options.centerMap === false) return

    const { mapInstance } = get()
    if (mapInstance) {
      mapInstance.setCenter([location.longitude, location.latitude])
    }
  },

  getCurrentLocation: async () => {
    try {
      set({ locationLoading: true })
      const location = await locationUtils.getCurrentPosition()
      get().setCurrentLocation(location)
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
      
      const { searchKeyword, searchQuery, filters } = get()
      const parsedQuery = searchQuery?.raw ? searchQuery : parseSearchInput(searchKeyword)
      const keyword = parsedQuery.keyword || (searchKeyword?.trim() || '')
      
      // 构建查询
      let query = supabase
        .from('pos_machines')
        .select('*')
      query = applyParsedQueryFilters(query, parsedQuery, keyword)
      query = applyServerFilters(query, filters)
      
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
      
      const reviewStats = buildReviewStats((reviewsData || []) as Array<{ pos_machine_id: string; rating: number }>)
      const processedData = (posMachines || [])
        .map((machine) => toMachineWithMetrics(machine as POSMachine, reviewStats, currentLocation))
        .filter((machine) => matchesClientFilters(machine, filters))
      
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
    const parsed = parseSearchInput(keyword || '')
    set({ searchKeyword: keyword, searchQuery: parsed })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, searchKeyword: query.raw || '' })
  },

  setFilters: (newFilters) => {
    set(state => ({ filters: { ...state.filters, ...newFilters } }))
  },

  resetFilters: () => {
    set({ filters: {} })
  },

  setViewMode: (mode) => {
    set({ viewMode: mode })
  },

  addPOSMachine: async (posMachineData) => {
    const commitPOSMachine = (machine: POSMachine) => {
      set(state => {
        if (state.posMachines.some(item => item.id === machine.id)) {
          return state
        }
        return { posMachines: [...state.posMachines, machine] }
      })
    }

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
      const fingerprint = buildAddPOSFingerprint(baseData, userId)
      const idempotencyKey = getOrCreateIdempotencyKey(fingerprint)

      const existingPromise = inFlightAddPOS.get(fingerprint)
      if (existingPromise) {
        return await existingPromise
      }

      const taskPromise = (async () => {
        const existingById = await findPOSMachineByIdempotency(userId, idempotencyKey)
        if (existingById) {
          commitPOSMachine(existingById)
          clearIdempotencyKey(fingerprint)
          return existingById
        }

        const recentDuplicate = await findRecentDuplicate(userId, baseData, ADD_POS_DEDUPE_WINDOW_MS)
        if (recentDuplicate) {
          commitPOSMachine(recentDuplicate)
          clearIdempotencyKey(fingerprint)
          return recentDuplicate
        }

        const newPOSMachine = {
          ...baseData,
          name: baseData.merchant_name || '未命名POS机', // 确保name字段有值
          created_by: userId,
          status: 'active' as const,
          extended_fields: {
            ...(baseData.extended_fields || {}),
            client_request_id: idempotencyKey,
            client_request_created_at: new Date().toISOString(),
          },
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
        if (error && isNetworkError(error)) {
          console.error('检测到网络相关错误:', error)
          const existingAfterError = await findPOSMachineByIdempotency(userId, idempotencyKey)
          if (existingAfterError) {
            commitPOSMachine(existingAfterError)
            clearIdempotencyKey(fingerprint)
            return existingAfterError
          }
          const recentAfterError = await findRecentDuplicate(userId, baseData, ADD_POS_DEDUPE_WINDOW_MS)
          if (recentAfterError) {
            commitPOSMachine(recentAfterError)
            clearIdempotencyKey(fingerprint)
            return recentAfterError
          }
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
            if (isNetworkError(retryError)) {
              const existingAfterRetry = await findPOSMachineByIdempotency(userId, idempotencyKey)
              if (existingAfterRetry) {
                commitPOSMachine(existingAfterRetry)
                clearIdempotencyKey(fingerprint)
                return existingAfterRetry
              }
            }
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

        const processedMachine = processPOSMachine(data as POSMachine)
        commitPOSMachine(processedMachine)
        clearIdempotencyKey(fingerprint)
        return processedMachine
      })()

      inFlightAddPOS.set(fingerprint, taskPromise)
      try {
        return await taskPromise
      } finally {
        inFlightAddPOS.delete(fingerprint)
      }
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
