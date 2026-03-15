#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import open from "open";
import fetch from "node-fetch";
import { WebSocket } from "ws";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Payments Maps MCP 客户端包装器
 * 自动处理认证并代理到远程服务器
 */
class PaymentsMapsClient {
  private server: Server;
  private authToken: string | null = null;
  private sessionId: string | null = null;
  private remoteServerUrl: string;
  private localPort: number = 0;
  private authServer?: express.Application;
  private configPath: string;

  constructor() {
    this.remoteServerUrl = process.env.PAYMENTS_MAPS_SERVER || 'https://your-mcp-server.com';
    this.configPath = path.join(__dirname, '../config/auth.json');
    
    this.server = new Server(
      {
        name: "payments-maps-client",
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

    this.setupServer();
  }

  private setupServer() {
    // 工具列表 - 代理远程服务器的工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.sessionId) {
        await this.ensureAuthenticated();
      }
      
      return this.proxyToRemote('/tools');
    });

    // 工具调用 - 代理到远程服务器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.sessionId) {
        await this.ensureAuthenticated();
      }

      return this.proxyToRemote('/tools/call', {
        method: 'POST',
        body: JSON.stringify(request.params)
      });
    });

    // 资源列表
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      if (!this.sessionId) {
        await this.ensureAuthenticated();
      }
      
      return this.proxyToRemote('/resources');
    });

    // 资源读取
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (!this.sessionId) {
        await this.ensureAuthenticated();
      }

      return this.proxyToRemote('/resources/read', {
        method: 'POST',
        body: JSON.stringify(request.params)
      });
    });

    // Prompt 列表
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      if (!this.sessionId) {
        await this.ensureAuthenticated();
      }
      
      return this.proxyToRemote('/prompts');
    });

    // Prompt 获取
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      if (!this.sessionId) {
        await this.ensureAuthenticated();
      }

      return this.proxyToRemote('/prompts/get', {
        method: 'POST',
        body: JSON.stringify(request.params)
      });
    });
  }

  /**
   * 确保用户已认证
   */
  private async ensureAuthenticated() {
    // 检查本地存储的认证信息
    const auth = await this.loadAuthConfig();
    
    if (auth && auth.sessionId && auth.expiresAt > Date.now()) {
      this.sessionId = auth.sessionId;
      this.authToken = auth.authToken;
      console.error("✅ 使用已保存的认证信息");
      return;
    }

    console.error("🔐 需要进行身份认证...");
    
    // 启动认证流程
    await this.startAuthFlow();
  }

  /**
   * 启动认证流程 - 打开浏览器
   */
  private async startAuthFlow() {
    return new Promise<void>((resolve, reject) => {
      // 启动本地认证服务器
      this.authServer = express();
      this.authServer.use(express.json());

      // 认证成功回调
      this.authServer.get('/auth/success', async (req, res) => {
        const { sessionId, authToken, expiresIn } = req.query;

        if (sessionId && authToken) {
          this.sessionId = sessionId as string;
          this.authToken = authToken as string;
          
          // 保存认证信息
          await this.saveAuthConfig({
            sessionId: this.sessionId,
            authToken: this.authToken,
            expiresAt: Date.now() + (parseInt(expiresIn as string) * 1000)
          });

          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>认证成功</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       display: flex; justify-content: center; align-items: center; height: 100vh; 
                       margin: 0; background: #f5f5f5; }
                .container { text-align: center; background: white; padding: 40px; 
                           border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
                .message { color: #6c757d; margin-bottom: 30px; }
                .close-btn { background: #007bff; color: white; border: none; 
                           padding: 12px 24px; border-radius: 6px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">✅ 认证成功！</div>
                <div class="message">
                  您已成功登录 Payments Maps MCP 服务<br>
                  现在可以关闭此窗口并返回 Claude Desktop
                </div>
                <button class="close-btn" onclick="window.close()">关闭窗口</button>
              </div>
              <script>
                // 3 秒后自动关闭
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
            </html>
          `);

          console.error("✅ 认证成功！可以开始使用 MCP 工具了");
          
          // 关闭认证服务器
          setTimeout(() => {
            this.authServer?.listen().close();
            resolve();
          }, 1000);

        } else {
          res.status(400).send("认证失败：缺少必要参数");
          reject(new Error("认证失败"));
        }
      });

      // 启动本地服务器
      const server = this.authServer.listen(0, 'localhost', () => {
        this.localPort = (server.address() as any).port;
        console.error(`🌐 本地认证服务器启动: http://localhost:${this.localPort}`);
        
        // 构建认证 URL
        const callbackUrl = `http://localhost:${this.localPort}/auth/success`;
        const authUrl = `${this.remoteServerUrl}/auth/start?callback=${encodeURIComponent(callbackUrl)}`;
        
        console.error("🔐 正在打开浏览器进行身份认证...");
        console.error(`🌍 认证地址: ${authUrl}`);
        
        // 打开系统默认浏览器
        open(authUrl).catch(error => {
          console.error("❌ 无法自动打开浏览器，请手动访问以下地址:");
          console.error(`   ${authUrl}`);
        });
      });

      // 超时处理
      setTimeout(() => {
        if (!this.sessionId) {
          reject(new Error("认证超时，请重新尝试"));
        }
      }, 300000); // 5 分钟超时
    });
  }

  /**
   * 代理请求到远程服务器
   */
  private async proxyToRemote(endpoint: string, options: any = {}) {
    if (!this.sessionId) {
      throw new Error("用户未认证");
    }

    const url = `${this.remoteServerUrl}/mcp/${this.sessionId}${endpoint}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
        ...options.headers
      },
      body: options.body
    });

    if (!response.ok) {
      if (response.status === 401) {
        // 认证过期，清除本地认证信息
        await this.clearAuthConfig();
        this.sessionId = null;
        this.authToken = null;
        throw new Error("认证已过期，请重新认证");
      }
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 加载本地认证配置
   */
  private async loadAuthConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * 保存认证配置
   */
  private async saveAuthConfig(config: any) {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("保存认证配置失败:", error);
    }
  }

  /**
   * 清除认证配置
   */
  private async clearAuthConfig() {
    try {
      await fs.unlink(this.configPath);
    } catch (error) {
      // 文件不存在，忽略错误
    }
  }

  /**
   * 启动 MCP 服务器
   */
  async start() {
    console.error("🚀 Payments Maps MCP Client 启动中...");
    console.error("📱 连接到远程服务器:", this.remoteServerUrl);
    
    // 预先检查认证状态
    const auth = await this.loadAuthConfig();
    if (!auth || auth.expiresAt <= Date.now()) {
      console.error("⚠️  需要身份认证，首次使用工具时将自动打开浏览器");
    } else {
      console.error("✅ 找到有效的认证信息");
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("✨ MCP Client 已就绪，等待 Claude Desktop 连接...");
  }
}

// 启动客户端
const client = new PaymentsMapsClient();
client.start().catch((error) => {
  console.error("❌ MCP Client 启动失败:", error);
  process.exit(1);
});