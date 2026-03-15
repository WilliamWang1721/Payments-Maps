import express from "express";
import { AuthService } from "./AuthService.js";
import { SessionManager } from "./SessionManager.js";
import { escapeHtml, isSafeLoopbackCallback } from "../utils/contentSanitizer.js";

/**
 * 认证页面服务 - 为 MCP 客户端提供友好的认证界面
 */
export class AuthPageService {
  private app: express.Application;
  private authService: AuthService;
  private sessionManager: SessionManager;

  constructor(authService: AuthService, sessionManager: SessionManager) {
    this.app = express();
    this.authService = authService;
    this.sessionManager = sessionManager;
    this.setupRoutes();
  }

  private setupRoutes() {
    // 认证起始页面
    this.app.get('/auth/start', (req: express.Request, res: express.Response) => {
      const { callback } = req.query;
      
      if (typeof callback !== 'string' || !isSafeLoopbackCallback(callback)) {
        return res.status(400).send("回调 URL 无效");
      }

      // 渲染认证选择页面
      res.send(this.getAuthSelectionPage(callback));
    });

    // OAuth 提供商选择：使用 state 传递 provider 与 callback
    this.app.get('/auth/provider/:provider', (req: express.Request, res: express.Response) => {
      const { provider } = req.params as { provider: string };
      const { callback } = req.query;

      if (typeof callback !== 'string' || !isSafeLoopbackCallback(callback)) {
        return res.status(400).send("回调 URL 无效");
      }

      try {
        const stateObj = { provider, callback };
        const state = JSON.stringify(stateObj);
        const authUrl = this.authService.getAuthUrl(provider, state);
        res.redirect(authUrl);
      } catch (error) {
        const safeErrorMessage = error instanceof Error ? escapeHtml(error.message) : '获取授权链接失败';
        res.status(400).send(safeErrorMessage);
      }
    });

    // 统一 OAuth 回调处理，依赖 state 解析 provider 和 callback
    this.app.get('/auth/callback', async (req: express.Request, res: express.Response) => {
      const { code, state } = req.query as { code?: string; state?: string };

      if (!code || !state) {
        return res.status(400).send('缺少必要参数');
      }

      try {
        let parsed: any = null;
        try {
          parsed = JSON.parse(state);
        } catch (e) {
          return res.status(400).send('非法 state 参数');
        }

        const { provider, callback } = parsed || {};
        if (!provider || !callback || !isSafeLoopbackCallback(callback)) {
          return res.status(400).send('state 缺少 provider 或 callback');
        }

        const result = await this.authService.handleOAuthCallback(provider, code, state);
        if (result.success) {
          const sessionId = this.sessionManager.createSession(result.user);
          const expiresIn = 24 * 60 * 60; // 86400 秒
          // 目前服务端未校验 authToken，这里与 sessionId 一致或生成随机字符串均可
          const authToken = sessionId;

          const callbackUrl = new URL(callback);
          callbackUrl.searchParams.set('sessionId', sessionId);
          callbackUrl.searchParams.set('authToken', authToken);
          callbackUrl.searchParams.set('expiresIn', String(expiresIn));
          
          res.redirect(callbackUrl.toString());
        } else {
          res.status(401).send(`认证失败: ${escapeHtml(result.error)}`);
        }
      } catch (error) {
        console.error('OAuth 回调错误:', error);
        res.status(500).send('认证过程中发生错误');
      }
    });
  }

  /**
   * 获取认证选择页面 HTML
   */
  private getAuthSelectionPage(callback: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payments Maps - 身份认证</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
          }
          .container { 
            background: white; padding: 40px; border-radius: 16px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 400px; width: 90%;
          }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #333; font-size: 28px; margin-bottom: 8px; }
          .logo p { color: #666; font-size: 14px; }
          .auth-buttons { display: flex; flex-direction: column; gap: 12px; }
          .auth-btn { 
            display: flex; align-items: center; justify-content: center; gap: 12px;
            padding: 14px 20px; border: none; border-radius: 8px; font-size: 16px;
            text-decoration: none; transition: all 0.2s; cursor: pointer;
          }
          .google { background: #4285f4; color: white; }
          .google:hover { background: #357ae8; }
          .github { background: #333; color: white; }
          .github:hover { background: #24292e; }
          .microsoft { background: #0078d4; color: white; }
          .microsoft:hover { background: #106ebe; }
          .linuxdo { background: #ff6b35; color: white; }
          .linuxdo:hover { background: #e55a2b; }
          .footer { text-align: center; margin-top: 24px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>💳 Payments Maps</h1>
            <p>POS 机管理助手</p>
          </div>
          
          <div class="auth-buttons">
            <a href="/auth/provider/google?callback=${encodeURIComponent(callback)}" class="auth-btn google">
              <span>🌟</span>
              <span>使用 Google 账户登录</span>
            </a>
            
            <a href="/auth/provider/github?callback=${encodeURIComponent(callback)}" class="auth-btn github">
              <span>🐱</span>
              <span>使用 GitHub 账户登录</span>
            </a>
            
            <a href="/auth/provider/microsoft?callback=${encodeURIComponent(callback)}" class="auth-btn microsoft">
              <span>🏢</span>
              <span>使用 Microsoft 账户登录</span>
            </a>
            
            <a href="/auth/provider/linuxdo?callback=${encodeURIComponent(callback)}" class="auth-btn linuxdo">
              <span>🐧</span>
              <span>使用 Linux.do 账户登录</span>
            </a>
          </div>
          
          <div class="footer">
            登录后，您可以在 Claude Desktop 中管理 POS 机数据
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getExpressApp() {
    return this.app;
  }
}
