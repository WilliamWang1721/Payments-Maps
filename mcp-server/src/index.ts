#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { AuthService } from "./auth/AuthService.js";
import { POSService } from "./services/POSService.js";
import { ToolHandlers } from "./handlers/ToolHandlers.js";
import { SessionManager } from "./auth/SessionManager.js";

// Load environment variables
dotenv.config();

/**
 * Payments Maps MCP Server
 * 为支付地图应用提供 MCP 接口，支持 POS 机管理功能
 */
class PaymentsMapsServer {
  private server: Server;
  private authService: AuthService;
  private posService: POSService;
  private toolHandlers: ToolHandlers;

  constructor() {
    this.server = new Server(
      {
        name: "payments-maps-pos-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.authService = new AuthService();
    this.posService = new POSService();
    this.toolHandlers = new ToolHandlers(this.authService, this.posService);

    this.setupHandlers();
  }

  private setupHandlers() {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_pos_machines",
          description: "搜索和查找 POS 机设备",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "搜索关键词（商户名称、地址等）",
              },
              latitude: {
                type: "number",
                description: "搜索中心点纬度",
              },
              longitude: {
                type: "number", 
                description: "搜索中心点经度",
              },
              radius: {
                type: "number",
                description: "搜索半径（公里），默认为 5km",
                default: 5,
              },
              filters: {
                type: "object",
                description: "筛选条件",
                properties: {
                  supportsApplePay: { type: "boolean" },
                  supportsGooglePay: { type: "boolean" },
                  supportsContactless: { type: "boolean" },
                  supportsVisa: { type: "boolean" },
                  supportsMastercard: { type: "boolean" },
                  supportsUnionPay: { type: "boolean" },
                  status: { type: "string", enum: ["active", "inactive", "maintenance"] },
                },
              },
              limit: {
                type: "number",
                description: "返回结果数量限制，默认为 50",
                default: 50,
              },
            },
          },
        },
        {
          name: "get_pos_machine_details",
          description: "获取特定 POS 机的详细信息",
          inputSchema: {
            type: "object",
            properties: {
              pos_id: {
                type: "string",
                description: "POS 机的唯一标识符",
              },
            },
            required: ["pos_id"],
          },
        },
        {
          name: "add_pos_machine",
          description: "添加新的 POS 机",
          inputSchema: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "POS 机地址",
              },
              latitude: {
                type: "number",
                description: "纬度",
              },
              longitude: {
                type: "number",
                description: "经度",
              },
              merchant_name: {
                type: "string",
                description: "商户名称",
              },
              basic_info: {
                type: "object",
                description: "基本信息",
                properties: {
                  model: { type: "string", description: "POS 机型号" },
                  acquiring_institution: { type: "string", description: "收单机构" },
                  checkout_location: { 
                    type: "string", 
                    enum: ["自助收银", "人工收银"],
                    description: "收银位置" 
                  },
                  supports_foreign_cards: { type: "boolean" },
                  supports_apple_pay: { type: "boolean" },
                  supports_google_pay: { type: "boolean" },
                  supports_contactless: { type: "boolean" },
                  supports_hce_simulation: { type: "boolean" },
                  supports_dcc: { type: "boolean" },
                  supports_edc: { type: "boolean" },
                  supported_card_networks: {
                    type: "array",
                    items: { type: "string" },
                    description: "支持的卡组织",
                  },
                  min_amount_no_pin: { type: "number" },
                },
              },
              remarks: {
                type: "string",
                description: "备注信息",
              },
            },
            required: ["address", "latitude", "longitude", "merchant_name"],
          },
        },
        {
          name: "update_pos_machine",
          description: "更新 POS 机信息（仅限用户自己添加的设备）",
          inputSchema: {
            type: "object",
            properties: {
              pos_id: {
                type: "string",
                description: "POS 机 ID",
              },
              updates: {
                type: "object",
                description: "要更新的字段",
                properties: {
                  address: { type: "string" },
                  merchant_name: { type: "string" },
                  basic_info: { type: "object" },
                  remarks: { type: "string" },
                  status: { 
                    type: "string", 
                    enum: ["active", "inactive", "maintenance", "disabled"] 
                  },
                },
              },
            },
            required: ["pos_id", "updates"],
          },
        },
        {
          name: "delete_pos_machine",
          description: "删除 POS 机（仅限用户自己添加的设备）",
          inputSchema: {
            type: "object",
            properties: {
              pos_id: {
                type: "string",
                description: "要删除的 POS 机 ID",
              },
            },
            required: ["pos_id"],
          },
        },
        {
          name: "get_my_pos_machines",
          description: "获取当前用户添加的所有 POS 机",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["active", "inactive", "maintenance", "disabled", "all"],
                description: "筛选状态，默认为 all",
                default: "all",
              },
              limit: {
                type: "number",
                description: "返回数量限制",
                default: 100,
              },
            },
          },
        },
        {
          name: "authenticate",
          description: "使用 OAuth 进行用户认证",
          inputSchema: {
            type: "object",
            properties: {
              provider: {
                type: "string",
                enum: ["google", "github", "microsoft", "linuxdo"],
                description: "OAuth 提供商",
              },
              access_token: {
                type: "string",
                description: "OAuth 访问令牌",
              },
            },
            required: ["provider", "access_token"],
          },
        },
      ],
    }));

    // 工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "authenticate":
            return await this.toolHandlers.handleAuthenticate(args);
            
          case "search_pos_machines":
            return await this.toolHandlers.handleSearchPOSMachines(args);
            
          case "get_pos_machine_details":
            return await this.toolHandlers.handleGetPOSMachineDetails(args);
            
          case "add_pos_machine":
            return await this.toolHandlers.handleAddPOSMachine(args);
            
          case "update_pos_machine":
            return await this.toolHandlers.handleUpdatePOSMachine(args);
            
          case "delete_pos_machine":
            return await this.toolHandlers.handleDeletePOSMachine(args);
            
          case "get_my_pos_machines":
            return await this.toolHandlers.handleGetMyPOSMachines(args);
            
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        return {
          content: [
            {
              type: "text",
              text: `错误: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // 资源列表处理器
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "pos://machines/schema",
          mimeType: "application/json",
          name: "POS 机数据模式",
          description: "POS 机数据结构定义",
        },
        {
          uri: "pos://auth/status",
          mimeType: "application/json", 
          name: "认证状态",
          description: "当前用户认证状态",
        },
      ],
    }));

    // 资源读取处理器
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case "pos://machines/schema":
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    address: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    merchant_name: { type: "string" },
                    basic_info: {
                      type: "object",
                      properties: {
                        model: { type: "string" },
                        acquiring_institution: { type: "string" },
                        checkout_location: { 
                          type: "string", 
                          enum: ["自助收银", "人工收银"] 
                        },
                        supports_foreign_cards: { type: "boolean" },
                        supports_apple_pay: { type: "boolean" },
                        supports_google_pay: { type: "boolean" },
                        supports_contactless: { type: "boolean" },
                        supported_card_networks: {
                          type: "array",
                          items: { type: "string" }
                        }
                      }
                    },
                    status: { 
                      type: "string", 
                      enum: ["active", "inactive", "maintenance", "disabled"] 
                    },
                    created_by: { type: "string" },
                    created_at: { type: "string" },
                    updated_at: { type: "string" }
                  }
                }, null, 2),
              },
            ],
          };

        case "pos://auth/status":
          const authStatus = await this.authService.getCurrentUser();
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  authenticated: !!authStatus,
                  user: authStatus || null,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };

        default:
          throw new Error(`未知的资源: ${uri}`);
      }
    });

    // Prompt 处理器
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "pos_search_guide",
          description: "POS 机搜索使用指南",
          arguments: [
            {
              name: "search_type",
              description: "搜索类型",
              required: false,
            },
          ],
        },
        {
          name: "pos_add_guide",
          description: "添加 POS 机指南",
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "pos_search_guide":
          return {
            description: "POS 机搜索使用指南",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "如何使用 MCP 工具搜索 POS 机？",
                },
              },
              {
                role: "assistant",
                content: {
                  type: "text",
                  text: `# POS 机搜索指南

使用 search_pos_machines 工具可以搜索 POS 机设备：

## 基本搜索
\`\`\`json
{
  "query": "星巴克",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "radius": 2
}
\`\`\`

## 高级筛选
\`\`\`json
{
  "query": "便利店",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "filters": {
    "supportsApplePay": true,
    "supportsContactless": true,
    "status": "active"
  }
}
\`\`\`

## 获取详细信息
使用返回的 pos_id 调用 get_pos_machine_details 获取完整信息。`,
                },
              },
            ],
          };

        case "pos_add_guide":
          return {
            description: "添加 POS 机指南",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "如何添加新的 POS 机？",
                },
              },
              {
                role: "assistant",
                content: {
                  type: "text",
                  text: `# POS 机添加指南

## 1. 首先进行认证
\`\`\`json
{
  "provider": "google",
  "access_token": "your_access_token"
}
\`\`\`

## 2. 添加 POS 机
\`\`\`json
{
  "address": "北京市朝阳区三里屯太古里",
  "latitude": 39.9369,
  "longitude": 116.4466,
  "merchant_name": "星巴克咖啡",
  "basic_info": {
    "model": "Ingenico iCT250",
    "acquiring_institution": "中国银联",
    "checkout_location": "人工收银",
    "supports_apple_pay": true,
    "supports_google_pay": true,
    "supports_contactless": true,
    "supported_card_networks": ["Visa", "Mastercard", "UnionPay"]
  },
  "remarks": "支持多种支付方式，服务良好"
}
\`\`\`

## 管理自己的 POS 机
- 使用 get_my_pos_machines 查看自己添加的设备
- 使用 update_pos_machine 更新信息
- 使用 delete_pos_machine 删除设备`,
                },
              },
            ],
          };

        default:
          throw new Error(`未知的 prompt: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("Payments Maps MCP Server 已启动");
    console.error("服务器版本: 1.0.0");
    console.error("支持的功能: POS 机搜索、添加、更新、删除");
  }
}

// 启动服务器
const server = new PaymentsMapsServer();
server.run().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});