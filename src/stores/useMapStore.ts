import { create } from 'zustand'
import { type POSMachine } from '@/lib/supabase'
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
      
      // 使用模拟数据，移除数据库依赖
      const mockPOSMachines: POSMachine[] = [
        {
          id: '1',
          name: '星巴克POS机',
          merchant_name: '星巴克咖啡',
          address: '北京市朝阳区建国门外大街1号',
          longitude: 116.4074,
          latitude: 39.9042,
          basic_info: {
            supports_apple_pay: true,
            supports_google_pay: true,
            supports_foreign_cards: true,
            supports_contactless: true
          },
          extended_fields: {},
          status: 'active',
           created_by: 'mock-user-id',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: '麦当劳POS机',
          merchant_name: '麦当劳',
          address: '北京市朝阳区三里屯路19号',
          longitude: 116.4551,
          latitude: 39.9368,
          basic_info: {
            supports_apple_pay: true,
            supports_google_pay: false,
            supports_foreign_cards: true,
            supports_contactless: true
          },
           extended_fields: {},
           status: 'active',
           created_by: 'mock-user-id',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: '3',
           name: '中关村银行POS机',
           merchant_name: '中关村银行',
           address: '北京市海淀区中关村大街1号',
           longitude: 116.3119,
           latitude: 39.9830,
           basic_info: {
             supports_apple_pay: false,
             supports_google_pay: false,
             supports_foreign_cards: false,
             supports_contactless: true
           },
           extended_fields: {},
           status: 'active',
           created_by: 'mock-user-id',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
        }
      ]
      
      // 计算平均评分和距离
      const { currentLocation } = get()
      const processedData = mockPOSMachines.map(machine => {
        // 模拟评分数据
        const avgRating = Math.random() * 2 + 3 // 3-5分随机评分
        const reviewCount = Math.floor(Math.random() * 50) + 1 // 1-50个评论
        
        let distance = 0
        if (currentLocation) {
          distance = locationUtils.calculateDistance(
            currentLocation,
            { longitude: machine.longitude, latitude: machine.latitude }
          )
        }
        
        return {
          ...machine,
          avgRating,
          distance,
          reviewCount,
        }
      })
      
      set({ posMachines: processedData })
    } catch (error) {
      console.error('加载POS机数据失败:', error)
      // 即使出错也要设置空数组，避免界面卡住
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
      // 生成本地ID和时间戳
      const newPOSMachine: POSMachine = {
        ...posMachineData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // 更新本地状态
      set(state => ({
        posMachines: [...state.posMachines, newPOSMachine]
      }))
      
      return newPOSMachine
    } catch (error) {
      console.error('添加POS机失败:', error)
      throw error
    }
  },

  updatePOSMachine: async (id, updates) => {
    try {
      // 添加更新时间戳
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      // 更新本地状态
      set(state => ({
        posMachines: state.posMachines.map(machine => 
          machine.id === id ? { ...machine, ...updatesWithTimestamp } : machine
        ),
        selectedPOSMachine: state.selectedPOSMachine?.id === id 
          ? { ...state.selectedPOSMachine, ...updatesWithTimestamp }
          : state.selectedPOSMachine
      }))
    } catch (error) {
      console.error('更新POS机失败:', error)
      throw error
    }
  },

  deletePOSMachine: async (id) => {
    try {
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