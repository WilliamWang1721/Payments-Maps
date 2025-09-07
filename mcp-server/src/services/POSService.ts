import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * POS 机搜索筛选条件
 */
export interface POSSearchFilters {
  supportsApplePay?: boolean;
  supportsGooglePay?: boolean;
  supportsContactless?: boolean;
  supportsVisa?: boolean;
  supportsMastercard?: boolean;
  supportsUnionPay?: boolean;
  supportsAmex?: boolean;
  supportsJCB?: boolean;
  supportsDiners?: boolean;
  supportsDiscover?: boolean;
  status?: string;
}

/**
 * POS 机数据接口
 */
export interface POSMachineData {
  id?: string;
  address: string;
  latitude: number;
  longitude: number;
  merchant_name: string;
  basic_info?: {
    model?: string;
    acquiring_institution?: string;
    checkout_location?: "自助收银" | "人工收银";
    supports_foreign_cards?: boolean;
    supports_apple_pay?: boolean;
    supports_google_pay?: boolean;
    supports_contactless?: boolean;
    supports_hce_simulation?: boolean;
    supports_dcc?: boolean;
    supports_edc?: boolean;
    acquiring_modes?: string[];
    min_amount_no_pin?: number;
    supported_card_networks?: string[];
  };
  remarks?: string;
  status?: "active" | "inactive" | "maintenance" | "disabled";
  created_by?: string;
}

/**
 * POS 机服务 - 处理 POS 机数据的 CRUD 操作
 */
export class POSService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("缺少 Supabase 配置: SUPABASE_URL 和 SUPABASE_SERVICE_KEY");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * 搜索 POS 机
   */
  async searchPOSMachines(
    query?: string,
    latitude?: number,
    longitude?: number,
    radius = 5,
    filters: POSSearchFilters = {},
    limit = 50
  ) {
    try {
      let queryBuilder = this.supabase
        .from("pos_machines")
        .select(`
          id,
          address,
          latitude,
          longitude,
          merchant_name,
          basic_info,
          status,
          created_by,
          created_at,
          updated_at,
          remarks,
          review_count
        `);

      // 文本搜索
      if (query) {
        queryBuilder = queryBuilder.or(
          `merchant_name.ilike.%${query}%,address.ilike.%${query}%`
        );
      }

      // 状态筛选
      if (filters.status) {
        queryBuilder = queryBuilder.eq("status", filters.status);
      } else {
        // 默认只显示活跃状态的 POS 机
        queryBuilder = queryBuilder.eq("status", "active");
      }

      // 地理位置搜索（简化实现）
      if (latitude !== undefined && longitude !== undefined) {
        const latRange = radius / 111; // 大约 1 度 = 111 公里
        const lngRange = radius / (111 * Math.cos(latitude * Math.PI / 180));

        queryBuilder = queryBuilder
          .gte("latitude", latitude - latRange)
          .lte("latitude", latitude + latRange)
          .gte("longitude", longitude - lngRange)
          .lte("longitude", longitude + lngRange);
      }

      queryBuilder = queryBuilder.limit(limit);

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(`搜索 POS 机失败: ${error.message}`);
      }

      // 应用基本信息筛选
      let filteredData = data || [];

      if (Object.keys(filters).length > 0) {
        filteredData = filteredData.filter((pos) => {
          const basicInfo = pos.basic_info || {};

          // 支付方式筛选
          if (filters.supportsApplePay !== undefined) {
            if (basicInfo.supports_apple_pay !== filters.supportsApplePay) {
              return false;
            }
          }

          if (filters.supportsGooglePay !== undefined) {
            if (basicInfo.supports_google_pay !== filters.supportsGooglePay) {
              return false;
            }
          }

          if (filters.supportsContactless !== undefined) {
            if (basicInfo.supports_contactless !== filters.supportsContactless) {
              return false;
            }
          }

          // 卡组织支持筛选
          const supportedNetworks = basicInfo.supported_card_networks || [];
          
          if (filters.supportsVisa && !supportedNetworks.includes("Visa")) {
            return false;
          }
          
          if (filters.supportsMastercard && !supportedNetworks.includes("Mastercard")) {
            return false;
          }
          
          if (filters.supportsUnionPay && !supportedNetworks.includes("UnionPay")) {
            return false;
          }

          if (filters.supportsAmex && !supportedNetworks.includes("American Express")) {
            return false;
          }

          if (filters.supportsJCB && !supportedNetworks.includes("JCB")) {
            return false;
          }

          if (filters.supportsDiners && !supportedNetworks.includes("Diners Club")) {
            return false;
          }

          if (filters.supportsDiscover && !supportedNetworks.includes("Discover")) {
            return false;
          }

          return true;
        });
      }

      // 计算距离（如果提供了坐标）
      if (latitude !== undefined && longitude !== undefined) {
        filteredData = filteredData.map((pos) => ({
          ...pos,
          distance: this.calculateDistance(
            latitude,
            longitude,
            pos.latitude,
            pos.longitude
          ),
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return {
        success: true,
        data: filteredData,
        total: filteredData.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "搜索失败";
      return {
        success: false,
        error: errorMessage,
        data: [],
        total: 0,
      };
    }
  }

  /**
   * 获取 POS 机详细信息
   */
  async getPOSMachineDetails(posId: string) {
    try {
      const { data, error } = await this.supabase
        .from("pos_machines")
        .select(`
          *,
          brands:brand_id (
            id,
            name,
            logo_url
          )
        `)
        .eq("id", posId)
        .single();

      if (error) {
        throw new Error(`获取 POS 机信息失败: ${error.message}`);
      }

      if (!data) {
        throw new Error("POS 机不存在");
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取失败";
      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }
  }

  /**
   * 添加新的 POS 机
   */
  async addPOSMachine(posData: POSMachineData, userId: string) {
    try {
      const newPOS = {
        ...posData,
        id: this.generateId(),
        status: posData.status || "active",
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extended_fields: {},
      };

      const { data, error } = await this.supabase
        .from("pos_machines")
        .insert(newPOS)
        .select()
        .single();

      if (error) {
        throw new Error(`添加 POS 机失败: ${error.message}`);
      }

      return {
        success: true,
        data,
        message: "POS 机添加成功",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "添加失败";
      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }
  }

  /**
   * 更新 POS 机信息
   */
  async updatePOSMachine(posId: string, updates: Partial<POSMachineData>, userId: string) {
    try {
      // 验证用户权限
      const { data: existing } = await this.supabase
        .from("pos_machines")
        .select("created_by")
        .eq("id", posId)
        .single();

      if (!existing) {
        throw new Error("POS 机不存在");
      }

      if (existing.created_by !== userId) {
        throw new Error("无权限修改此 POS 机");
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from("pos_machines")
        .update(updateData)
        .eq("id", posId)
        .select()
        .single();

      if (error) {
        throw new Error(`更新 POS 机失败: ${error.message}`);
      }

      return {
        success: true,
        data,
        message: "POS 机信息更新成功",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "更新失败";
      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }
  }

  /**
   * 删除 POS 机
   */
  async deletePOSMachine(posId: string, userId: string) {
    try {
      // 验证用户权限
      const { data: existing } = await this.supabase
        .from("pos_machines")
        .select("created_by, merchant_name")
        .eq("id", posId)
        .single();

      if (!existing) {
        throw new Error("POS 机不存在");
      }

      if (existing.created_by !== userId) {
        throw new Error("无权限删除此 POS 机");
      }

      const { error } = await this.supabase
        .from("pos_machines")
        .delete()
        .eq("id", posId);

      if (error) {
        throw new Error(`删除 POS 机失败: ${error.message}`);
      }

      return {
        success: true,
        message: `POS 机 "${existing.merchant_name}" 删除成功`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "删除失败";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 获取用户的 POS 机列表
   */
  async getUserPOSMachines(userId: string, status = "all", limit = 100) {
    try {
      let queryBuilder = this.supabase
        .from("pos_machines")
        .select(`
          id,
          address,
          latitude,
          longitude,
          merchant_name,
          basic_info,
          status,
          created_at,
          updated_at,
          remarks,
          review_count
        `)
        .eq("created_by", userId);

      if (status !== "all") {
        queryBuilder = queryBuilder.eq("status", status);
      }

      queryBuilder = queryBuilder
        .order("created_at", { ascending: false })
        .limit(limit);

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(`获取用户 POS 机失败: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
        total: data?.length || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取失败";
      return {
        success: false,
        error: errorMessage,
        data: [],
        total: 0,
      };
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算两点间距离（公里）
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // 地球半径（公里）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}