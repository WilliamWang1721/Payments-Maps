import { AuthService } from "../auth/AuthService.js";
import { POSService, POSSearchFilters, POSMachineData } from "../services/POSService.js";

/**
 * MCP 工具处理器 - 处理所有 MCP 工具调用
 */
export class ToolHandlers {
  constructor(
    private authService: AuthService,
    private posService: POSService,
    private currentUser?: any // 预认证用户
  ) {}

  /**
   * 处理获取用户信息请求
   */
  async handleGetUserInfo(args: any) {
    if (!this.currentUser) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 用户未认证",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: "当前用户信息",
        },
        {
          type: "text",
          text: JSON.stringify({
            user: {
              id: this.currentUser.id,
              email: this.currentUser.email,
              name: this.currentUser.user_metadata?.display_name,
              avatar: this.currentUser.user_metadata?.avatar_url,
              provider: this.currentUser.user_metadata?.provider,
            },
            session: {
              authenticated: true,
              timestamp: new Date().toISOString(),
            },
          }, null, 2),
        },
      ],
    };
  }

  /**
   * 处理 POS 机搜索请求
   */
  async handleSearchPOSMachines(args: any) {
    const {
      query,
      latitude,
      longitude,
      radius = 5,
      filters = {},
      limit = 50,
    } = args;

    const result = await this.posService.searchPOSMachines(
      query,
      latitude,
      longitude,
      radius,
      filters as POSSearchFilters,
      limit
    );

    if (result.success) {
      const posList = result.data.map((pos: any) => ({
        id: pos.id,
        merchant_name: pos.merchant_name,
        address: pos.address,
        distance: pos.distance ? `${pos.distance.toFixed(2)} km` : undefined,
        status: pos.status,
        supports: {
          apple_pay: pos.basic_info?.supports_apple_pay,
          google_pay: pos.basic_info?.supports_google_pay,
          contactless: pos.basic_info?.supports_contactless,
          card_networks: pos.basic_info?.supported_card_networks,
        },
        created_at: pos.created_at,
      }));

      return {
        content: [
          {
            type: "text",
            text: `找到 ${result.total} 个 POS 机设备`,
          },
          {
            type: "text",
            text: JSON.stringify({
              total: result.total,
              query_params: {
                query,
                location: latitude && longitude ? { latitude, longitude, radius } : null,
                filters,
              },
              results: posList,
            }, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `搜索失败: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * 处理获取 POS 机详细信息请求
   */
  async handleGetPOSMachineDetails(args: any) {
    const { pos_id } = args;

    if (!pos_id) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 缺少 POS 机 ID",
          },
        ],
        isError: true,
      };
    }

    const result = await this.posService.getPOSMachineDetails(pos_id);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: `POS 机详细信息 - ${result.data.merchant_name}`,
          },
          {
            type: "text",
            text: JSON.stringify({
              basic_info: {
                id: result.data.id,
                merchant_name: result.data.merchant_name,
                address: result.data.address,
                location: {
                  latitude: result.data.latitude,
                  longitude: result.data.longitude,
                },
                status: result.data.status,
              },
              technical_info: result.data.basic_info,
              verification_modes: result.data.verification_modes,
              attempts: result.data.attempts,
              remarks: result.data.remarks,
              created_by: result.data.created_by,
              created_at: result.data.created_at,
              updated_at: result.data.updated_at,
            }, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `获取 POS 机信息失败: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * 处理添加 POS 机请求
   */
  async handleAddPOSMachine(args: any) {
    if (!this.currentUser) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 用户未认证",
          },
        ],
        isError: true,
      };
    }

    const {
      address,
      latitude,
      longitude,
      merchant_name,
      basic_info,
      remarks,
    } = args;

    if (!address || !latitude || !longitude || !merchant_name) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 缺少必要的字段（address, latitude, longitude, merchant_name）",
          },
        ],
        isError: true,
      };
    }

    const posData: POSMachineData = {
      address,
      latitude,
      longitude,
      merchant_name,
      basic_info,
      remarks,
    };

    const userId = this.currentUser.id;
    const result = await this.posService.addPOSMachine(posData, userId);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: `POS 机添加成功: ${merchant_name}`,
          },
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              pos_machine: {
                id: result.data.id,
                merchant_name: result.data.merchant_name,
                address: result.data.address,
                status: result.data.status,
                created_at: result.data.created_at,
              },
              message: result.message,
            }, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `添加 POS 机失败: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * 处理更新 POS 机请求
   */
  async handleUpdatePOSMachine(args: any) {
    if (!this.currentUser) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 用户未认证",
          },
        ],
        isError: true,
      };
    }

    const { pos_id, updates } = args;

    if (!pos_id || !updates) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 缺少 pos_id 或 updates 参数",
          },
        ],
        isError: true,
      };
    }

    const userId = this.currentUser.id;
    const result = await this.posService.updatePOSMachine(pos_id, updates, userId);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: `POS 机更新成功: ${result.data.merchant_name}`,
          },
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              updated_pos: {
                id: result.data.id,
                merchant_name: result.data.merchant_name,
                address: result.data.address,
                status: result.data.status,
                updated_at: result.data.updated_at,
              },
              message: result.message,
            }, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `更新 POS 机失败: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * 处理删除 POS 机请求
   */
  async handleDeletePOSMachine(args: any) {
    if (!this.currentUser) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 用户未认证",
          },
        ],
        isError: true,
      };
    }

    const { pos_id } = args;

    if (!pos_id) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 缺少 pos_id 参数",
          },
        ],
        isError: true,
      };
    }

    const userId = this.currentUser.id;
    const result = await this.posService.deletePOSMachine(pos_id, userId);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `删除 POS 机失败: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * 处理获取用户 POS 机列表请求
   */
  async handleGetMyPOSMachines(args: any) {
    if (!this.currentUser) {
      return {
        content: [
          {
            type: "text",
            text: "错误: 用户未认证",
          },
        ],
        isError: true,
      };
    }

    const { status = "all", limit = 100 } = args;

    const userId = this.currentUser.id;
    const result = await this.posService.getUserPOSMachines(userId, status, limit);

    if (result.success) {
      const posList = result.data.map((pos: any) => ({
        id: pos.id,
        merchant_name: pos.merchant_name,
        address: pos.address,
        status: pos.status,
        supports: {
          apple_pay: pos.basic_info?.supports_apple_pay,
          google_pay: pos.basic_info?.supports_google_pay,
          contactless: pos.basic_info?.supports_contactless,
          card_networks: pos.basic_info?.supported_card_networks,
        },
        created_at: pos.created_at,
        updated_at: pos.updated_at,
      }));

      return {
        content: [
          {
            type: "text",
            text: `您共有 ${result.total} 个 POS 机设备`,
          },
          {
            type: "text",
            text: JSON.stringify({
              total: result.total,
              filter: { status },
              pos_machines: posList,
            }, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `获取 POS 机列表失败: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }
}