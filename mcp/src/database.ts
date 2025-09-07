// Supabase 数据库访问层
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { POSMachine, POSSearch, UserAuth } from './types.js'

export class SupabaseService {
  private supabase: SupabaseClient
  private currentAuth: UserAuth | null = null

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // MCP 服务器不需要持久化会话
      },
    })
  }

  /**
   * 设置用户认证信息
   */
  async setAuth(auth: UserAuth): Promise<void> {
    this.currentAuth = auth
    
    // 设置 Supabase 会话
    const { error } = await this.supabase.auth.setSession({
      access_token: auth.access_token,
      refresh_token: auth.refresh_token || '',
    })
    
    if (error) {
      throw new Error(`认证失败: ${error.message}`)
    }
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): UserAuth | null {
    return this.currentAuth
  }

  /**
   * 验证用户认证状态
   */
  async validateAuth(): Promise<boolean> {
    if (!this.currentAuth) {
      return false
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      return !error && user !== null && user.id === this.currentAuth.user_id
    } catch {
      return false
    }
  }

  /**
   * 搜索 POS 机
   */
  async searchPOSMachines(params: POSSearch): Promise<{
    data: POSMachine[]
    total: number
  }> {
    const { keyword, latitude, longitude, radius, limit, offset, ...filters } = params
    
    let query = this.supabase
      .from('pos_machines')
      .select('*', { count: 'exact' })

    // 关键词搜索
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.trim().toLowerCase()
      query = query.or(
        `merchant_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,basic_info->>model.ilike.%${searchTerm}%,basic_info->>acquiring_institution.ilike.%${searchTerm}%`
      )
    }

    // 地理位置筛选（如果提供了坐标和半径）
    if (latitude && longitude && radius) {
      // 使用 PostGIS 扩展进行地理查询（需要在数据库中启用）
      // 这里先用简单的边界框查询作为示例
      const latDelta = radius / 111000 // 大约每度111km
      const lonDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180))
      
      query = query
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lonDelta)
        .lte('longitude', longitude + lonDelta)
    }

    // 应用筛选条件
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key.startsWith('supports_')) {
          const field = key
          if (['supports_visa', 'supports_mastercard', 'supports_unionpay', 'supports_amex', 'supports_jcb', 'supports_diners', 'supports_discover'].includes(field)) {
            // 这些是卡网络支持字段，需要在 basic_info->supported_card_networks 数组中查找
            const cardType = field.replace('supports_', '')
            if (value) {
              query = query.contains('basic_info->supported_card_networks', [cardType])
            }
          } else {
            // 其他支持字段直接在 basic_info 中查找
            query = query.eq(`basic_info->>${field}`, value)
          }
        } else if (key === 'acquiring_institution') {
          query = query.ilike('basic_info->>acquiring_institution', `%${value}%`)
        } else if (key === 'model') {
          query = query.ilike('basic_info->>model', `%${value}%`)
        } else if (key === 'checkout_location') {
          query = query.eq('basic_info->>checkout_location', value)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    // 分页和排序
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`搜索POS机失败: ${error.message}`)
    }

    return {
      data: (data || []).map(item => ({
        ...item,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      })),
      total: count || 0,
    }
  }

  /**
   * 获取单个 POS 机详情
   */
  async getPOSMachine(id: string): Promise<POSMachine | null> {
    const { data, error } = await this.supabase
      .from('pos_machines')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // 未找到记录
        return null
      }
      throw new Error(`获取POS机详情失败: ${error.message}`)
    }

    return {
      ...data,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    }
  }

  /**
   * 创建新的 POS 机
   */
  async createPOSMachine(posData: Omit<POSMachine, 'id'>): Promise<POSMachine> {
    if (!this.currentAuth) {
      throw new Error('用户未认证')
    }

    const newPOSMachine = {
      ...posData,
      created_by: this.currentAuth.user_id,
    }

    const { data, error } = await this.supabase
      .from('pos_machines')
      .insert([newPOSMachine])
      .select()
      .single()

    if (error) {
      throw new Error(`创建POS机失败: ${error.message}`)
    }

    return {
      ...data,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    }
  }

  /**
   * 更新 POS 机
   */
  async updatePOSMachine(id: string, updates: Partial<POSMachine>): Promise<POSMachine> {
    if (!this.currentAuth) {
      throw new Error('用户未认证')
    }

    // 首先检查用户是否有权限修改此 POS 机
    const existing = await this.getPOSMachine(id)
    if (!existing) {
      throw new Error('POS机不存在')
    }

    // 检查权限：只有创建者可以修改
    const { data: posData } = await this.supabase
      .from('pos_machines')
      .select('created_by')
      .eq('id', id)
      .single()

    if (posData?.created_by !== this.currentAuth.user_id) {
      throw new Error('无权限修改此POS机')
    }

    const { data, error } = await this.supabase
      .from('pos_machines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`更新POS机失败: ${error.message}`)
    }

    return {
      ...data,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    }
  }

  /**
   * 删除 POS 机
   */
  async deletePOSMachine(id: string): Promise<void> {
    if (!this.currentAuth) {
      throw new Error('用户未认证')
    }

    // 检查权限
    const { data: posData } = await this.supabase
      .from('pos_machines')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!posData) {
      throw new Error('POS机不存在')
    }

    if (posData.created_by !== this.currentAuth.user_id) {
      throw new Error('无权限删除此POS机')
    }

    const { error } = await this.supabase
      .from('pos_machines')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`删除POS机失败: ${error.message}`)
    }
  }

  /**
   * 获取用户创建的 POS 机列表
   */
  async getUserPOSMachines(limit: number = 50, offset: number = 0): Promise<{
    data: POSMachine[]
    total: number
  }> {
    if (!this.currentAuth) {
      throw new Error('用户未认证')
    }

    const { data, error, count } = await this.supabase
      .from('pos_machines')
      .select('*', { count: 'exact' })
      .eq('created_by', this.currentAuth.user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`获取用户POS机列表失败: ${error.message}`)
    }

    return {
      data: (data || []).map(item => ({
        ...item,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      })),
      total: count || 0,
    }
  }
}