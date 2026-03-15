#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { AuthService } from "./auth/AuthService.js";
import { POSService } from "./services/POSService.js";
import { ToolHandlers } from "./handlers/ToolHandlers.js";
import { SessionManager } from "./auth/SessionManager.js";
import { AuthPageService } from "./auth/AuthPageService.js";

// Load environment variables
dotenv.config();

/**
 * Payments Maps 公共 MCP 服务器
 * 为所有用户提供统一的 POS 机管理接口
 */
class PaymentsMapsPublicServer {
  private app: express.Application;
  private sessionManager: SessionManager;
  private authService: AuthService;
  private posService: POSService;
  private mcpServers: Map<string, Server> = new Map();

  constructor() {
    this.app = express();
    this.sessionManager = new SessionManager();
    this.authService = new AuthService();
    this.posService = new POSService();
    
    this.setupExpress();
  }

  private setupExpress() {
    this.app.use(cors({
      origin: true,
      credentials: true
    }));
    this.app.use(express.json());

    // 健康检查
    this.app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ 
        status: 'ok', 
        service: 'Payments Maps MCP Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // 集成认证页面服务
    const authPage = new AuthPageService(this.authService, this.sessionManager);
    this.app.use(authPage.getExpressApp());

    // OAuth 回调处理（兼容旧的 POST 接口）
    this.app.post('/auth/callback', async (req: express.Request, res: express.Response) => {
      try {
        const { provider, code, state } = req.body as { provider: string; code: string; state?: string };
        const result = await this.authService.handleOAuthCallback(provider, code, state);
        
        if (result.success) {
          const sessionId = this.sessionManager.createSession(result.user);
          res.json({
            success: true,
            sessionId,
            user: result.user,
            message: '认证成功'
          });
        } else {
          res.status(401).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '认证失败'
        });
      }
    });

    // 获取 OAuth 授权 URL（兼容旧的 POST 接口）
    this.app.post('/auth/url', (req: express.Request, res: express.Response) => {
      try {
        const { provider, callback } = req.body as { provider: string; callback?: string };
        const state = callback ? JSON.stringify({ provider, callback }) : undefined;
        const authUrl = this.authService.getAuthUrl(provider, state);
        res.json({ 
          success: true, 
          authUrl,
          provider 
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : '获取授权链接失败'
        });
      }
    });

    // MCP 服务器端点 - 支持 HTTP 传输（SSE）
    this.app.get('/mcp/:sessionId', async (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({
          error: '无效的会话'
        });
      }

      // 为此会话创建 MCP 服务器实例
      if (!this.mcpServers.has(sessionId)) {
        const server = this.createMCPServer(sessionId);
        this.mcpServers.set(sessionId, server);
      }

      const transport = new SSEServerTransport('/mcp/' + sessionId, res);
      const server = this.mcpServers.get(sessionId)!;
      await server.connect(transport);
    });

    // REST 端点：工具列表
    this.app.get('/mcp/:sessionId/tools', (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({ error: '无效的会话' });
      }

      const server = this.mcpServers.get(sessionId) || this.createMCPServer(sessionId);
      const user = this.sessionManager.getUser(sessionId);
      const toolHandlers = new ToolHandlers(this.authService, this.posService, user);

      // 与 MCP ListTools 结果保持一致
      const tools = [
        {
          name: "search_pos_machines",
          description: "搜索和查找 POS 机设备",
          inputSchema: server["capabilities"] ? undefined : {
            type: "object",
            properties: {
              query: { type: "string", description: "搜索关键词（商户名称、地址等）" },
              latitude: { type: "number", description: "搜索中心点纬度" },
              longitude: { type: "number", description: "搜索中心点经度" },
              radius: { type: "number", description: "搜索半径（公里），默认为 5km", default: 5 },
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
              limit: { type: "number", description: "返回结果数量限制，默认为 50", default: 50 },
            },
          },
        },
        { name: "get_pos_machine_details", description: "获取特定 POS 机的详细信息", inputSchema: { type: "object", properties: { pos_id: { type: "string", description: "POS 机的唯一标识符" } }, required: ["pos_id"] } },
        { name: "add_pos_machine", description: "添加新的 POS 机", inputSchema: { type: "object", properties: { address: { type: "string", description: "POS 机地址" }, latitude: { type: "number", description: "纬度" }, longitude: { type: "number", description: "经度" }, merchant_name: { type: "string", description: "商户名称" }, basic_info: { type: "object", description: "基本信息" }, remarks: { type: "string", description: "备注信息" } }, required: ["address", "latitude", "longitude", "merchant_name"] } },
        { name: "update_pos_machine", description: "更新 POS 机信息（仅限用户自己添加的设备）", inputSchema: { type: "object", properties: { pos_id: { type: "string", description: "POS 机 ID" }, updates: { type: "object", description: "要更新的字段" } }, required: ["pos_id", "updates"] } },
        { name: "delete_pos_machine", description: "删除 POS 机（仅限用户自己添加的设备）", inputSchema: { type: "object", properties: { pos_id: { type: "string", description: "要删除的 POS 机 ID" } }, required: ["pos_id"] } },
        { name: "get_my_pos_machines", description: "获取当前用户添加的所有 POS 机", inputSchema: { type: "object", properties: { status: { type: "string", enum: ["active", "inactive", "maintenance", "disabled", "all"], description: "筛选状态，默认为 all", default: "all" }, limit: { type: "number", description: "返回数量限制", default: 100 } } } },
        { name: "get_user_info", description: "获取当前用户信息", inputSchema: { type: "object", properties: {} } },
      ];

      res.json({ tools });
    });

    // REST 端点：工具调用
    this.app.post('/mcp/:sessionId/tools/call', async (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({ error: '无效的会话' });
      }
      const user = this.sessionManager.getUser(sessionId);
      const toolHandlers = new ToolHandlers(this.authService, this.posService, user);

      try {
        const { name, arguments: args } = req.body as { name: string; arguments: any };
        switch (name) {
          case "search_pos_machines":
            return res.json(await toolHandlers.handleSearchPOSMachines(args));
          case "get_pos_machine_details":
            return res.json(await toolHandlers.handleGetPOSMachineDetails(args));
          case "add_pos_machine":
            return res.json(await toolHandlers.handleAddPOSMachine(args));
          case "update_pos_machine":
            return res.json(await toolHandlers.handleUpdatePOSMachine(args));
          case "delete_pos_machine":
            return res.json(await toolHandlers.handleDeletePOSMachine(args));
          case "get_my_pos_machines":
            return res.json(await toolHandlers.handleGetMyPOSMachines(args));
          case "get_user_info":
            return res.json(await toolHandlers.handleGetUserInfo(args));
          default:
            return res.status(400).json({ error: `未知的工具: ${name}` });
        }
      } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : '工具调用失败' });
      }
    });

    // REST 端点：资源列表
    this.app.get('/mcp/:sessionId/resources', (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({ error: '无效的会话' });
      }

      return res.json({
        resources: [
          { uri: "pos://machines/schema", mimeType: "application/json", name: "POS 机数据模式", description: "POS 机数据结构定义" },
          { uri: "pos://user/profile", mimeType: "application/json", name: "用户资料", description: "当前用户信息" },
        ]
      });
    });

    // REST 端点：资源读取
    this.app.post('/mcp/:sessionId/resources/read', (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({ error: '无效的会话' });
      }

      const { uri } = req.body as { uri: string };
      switch (uri) {
        case "pos://machines/schema":
          return res.json({
            contents: [{
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
                  basic_info: { type: "object" },
                  status: { type: "string", enum: ["active", "inactive", "maintenance", "disabled"] },
                  created_by: { type: "string" },
                  created_at: { type: "string" },
                  updated_at: { type: "string" }
                }
              }, null, 2),
            }],
          });
        case "pos://user/profile":
          const user = this.sessionManager.getUser(sessionId);
          return res.json({
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ user: user || null, sessionId, timestamp: new Date().toISOString() }, null, 2),
            }],
          });
        default:
          return res.status(400).json({ error: `未知的资源: ${uri}` });
      }
    });

    // REST 端点：Prompt 列表
    this.app.get('/mcp/:sessionId/prompts', (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({ error: '无效的会话' });
      }

      return res.json({
        prompts: [
          { name: "pos_search_guide", description: "POS 机搜索使用指南", arguments: [{ name: "search_type", description: "搜索类型", required: false }] },
          { name: "pos_add_guide", description: "添加 POS 机指南" },
        ],
      });
    });

    // REST 端点：Prompt 获取
    this.app.post('/mcp/:sessionId/prompts/get', (req: express.Request, res: express.Response) => {
      const sessionId = req.params.sessionId;
      if (!this.sessionManager.isValidSession(sessionId)) {
        return res.status(401).json({ error: '无效的会话' });
      }

      const { name } = req.body as { name: string };
      switch (name) {
        case "pos_search_guide":
          return res.json({
            description: "POS 机搜索使用指南",
            messages: [
              { role: "user", content: { type: "text", text: "如何使用 MCP 工具搜索 POS 机？" } },
              { role: "assistant", content: { type: "text", text: `# POS 机搜索指南\n\n使用 search_pos_machines 工具可以搜索 POS 机设备：\n\n## 基本搜索\n\n{\n  \"query\": \"星巴克\",\n  \"latitude\": 39.9042,\n  \"longitude\": 116.4074,\n  \"radius\": 2\n}\n\n## 高级筛选\n\n{\n  \"query\": \"便利店\",\n  \"latitude\": 39.9042,\n  \"longitude\": 116.4074,\n  \"filters\": {\n    \"supportsApplePay\": true,\n    \"supportsContactless\": true,\n    \"status\": \"active\"\n  }\n}\n\n## 获取详细信息\n使用返回的 pos_id 调用 get_pos_machine_details 获取完整信息。` } },
            ],
          });
        case "pos_add_guide":
          return res.json({
            description: "添加 POS 机指南",
            messages: [
              { role: "user", content: { type: "text", text: "如何添加新的 POS 机？" } },
              { role: "assistant", content: { type: "text", text: `# POS 机添加指南\n\n## 1. 首先进行认证\n\n{\n  \"provider\": \"google\",\n  \"access_token\": \"your_access_token\"\n}\n\n## 2. 添加 POS 机\n\n{\n  \"address\": \"北京市朝阳区三里屯太古里\",\n  \"latitude\": 39.9369,\n  \"longitude\": 116.4466,\n  \"merchant_name\": \"星巴克咖啡\",\n  \"basic_info\": {\n    \"model\": \"Ingenico iCT250\",\n    \"acquiring_institution\": \"中国银联\",\n    \"checkout_location\": \"人工收银\",\n    \"supports_apple_pay\": true,\n    \"supports_google_pay\": true,\n    \"supports_contactless\": true,\n    \"supported_card_networks\": [\"Visa\", \"Mastercard\", \"UnionPay\"]\n  },\n  \"remarks\": \"支持多种支付方式，服务良好\"\n}\n\n## 管理自己的 POS 机\n- 使用 get_my_pos_machines 查看自己添加的设备\n- 使用 update_pos_machine 更新信息\n- 使用 delete_pos_machine 删除设备` } },
            ],
          });
        default:
          return res.status(400).json({ error: `未知的 prompt: ${name}` });
      }
    });
  }

  private createMCPServer(sessionId: string): Server {
    const server = new Server(
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

    const user = this.sessionManager.getUser(sessionId);
    const toolHandlers = new ToolHandlers(this.authService, this.posService, user);

    this.setupMCPHandlers(server, toolHandlers, sessionId);
    return server;
  }

  private setupMCPHandlers(server: Server, toolHandlers: ToolHandlers, sessionId: string) {
    // 工具列表处理器
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
              address: { type: "string", description: "POS 机地址" },
              latitude: { type: "number", description: "纬度" },
              longitude: { type: "number", description: "经度" },
              merchant_name: { type: "string", description: "商户名称" },
              basic_info: {
                type: "object",
                description: "基本信息",
                properties: {
                  model: { type: "string" },
                  acquiring_institution: { type: "string" },
                  checkout_location: { type: "string", enum: ["自助收银", "人工收银"] },
                  supports_foreign_cards: { type: "boolean" },
                  supports_apple_pay: { type: "boolean" },
                  supports_google_pay: { type: "boolean" },
                  supports_contactless: { type: "boolean" },
                  supported_card_networks: { type: "array", items: { type: "string" } },
                },
              },
              remarks: { type: "string", description: "备注信息" },
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
              pos_id: { type: "string", description: "POS 机 ID" },
              updates: {
                type: "object",
                description: "要更新的字段",
                properties: {
                  address: { type: "string" },
                  merchant_name: { type: "string" },
                  basic_info: { type: "object" },
                  remarks: { type: "string" },
                  status: { type: "string", enum: ["active", "inactive", "maintenance", "disabled"] },
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
              pos_id: { type: "string", description: "要删除的 POS 机 ID" },
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
              limit: { type: "number", description: "返回数量限制", default: 100 },
            },
          },
        },
        {
          name: "get_user_info",
          description: "获取当前用户信息",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    // 工具调用处理器
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // 检查会话有效性
      if (!this.sessionManager.isValidSession(sessionId)) {
        return {
          content: [{
            type: "text",
            text: "错误: 会话已过期，请重新认证",
          }],
          isError: true,
        };
      }

      try {
        switch (name) {
          case "search_pos_machines":
            return await toolHandlers.handleSearchPOSMachines(args);
            
          case "get_pos_machine_details":
            return await toolHandlers.handleGetPOSMachineDetails(args);
            
          case "add_pos_machine":
            return await toolHandlers.handleAddPOSMachine(args);
            
          case "update_pos_machine":
            return await toolHandlers.handleUpdatePOSMachine(args);
            
          case "delete_pos_machine":
            return await toolHandlers.handleDeletePOSMachine(args);
            
          case "get_my_pos_machines":
            return await toolHandlers.handleGetMyPOSMachines(args);

          case "get_user_info":
            return await toolHandlers.handleGetUserInfo(args);
            
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        return {
          content: [{
            type: "text",
            text: `错误: ${errorMessage}`,
          }],
          isError: true,
        };
      }
    });

    // 资源处理器
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "pos://machines/schema",
          mimeType: "application/json",
          name: "POS 机数据模式",
          description: "POS 机数据结构定义",
        },
        {
          uri: "pos://user/profile",
          mimeType: "application/json", 
          name: "用户资料",
          description: "当前用户信息",
        },
      ],
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case "pos://machines/schema":
          return {
            contents: [{
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
                  basic_info: { type: "object" },
                  status: { type: "string", enum: ["active", "inactive", "maintenance", "disabled"] },
                  created_by: { type: "string" },
                  created_at: { type: "string" },
                  updated_at: { type: "string" }
                }
              }, null, 2),
            }],
          };

        case "pos://user/profile":
          const user = this.sessionManager.getUser(sessionId);
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify({
                user: user || null,
                sessionId,
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };

        default:
          throw new Error(`未知的资源: ${uri}`);
      }
    });
  }

  async start() {
    const port = process.env.PORT || 3001;
    
    this.app.listen(port, () => {
      console.log(`🚀 Payments Maps 公共 MCP Server 启动成功`);
      console.log(`📡 服务地址: http://localhost:${port}`);
      console.log(`🔗 健康检查: http://localhost:${port}/health`);
      console.log(`📖 认证流程: POST /auth/url 获取授权链接`);
      console.log(`🔐 OAuth 回调: POST /auth/callback 处理认证结果`);
      console.log(`🛠️  MCP 连接: GET /mcp/:sessionId 连接 MCP 服务`);
      console.log(`✨ 用户现在可以通过 Claude Desktop 连接到此服务器！`);
    });

    // 定期清理过期会话
    setInterval(() => {
      const expiredSessions = this.sessionManager.cleanupExpiredSessions();
      expiredSessions.forEach(sessionId => {
        this.mcpServers.delete(sessionId);
      });
    }, 60000); // 每分钟清理一次
  }
}

// 启动服务器
const server = new PaymentsMapsPublicServer();
server.start().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});