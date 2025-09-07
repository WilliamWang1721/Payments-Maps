// Supabase 数据库访问层
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * 认证服务 - 处理 OAuth 认证和用户会话管理
 */
export class AuthService {
  private supabase: SupabaseClient;
  private currentUser: any = null;

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
   * 获取 OAuth 授权链接
   */
  getAuthUrl(provider: string, state?: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/auth/callback`;
    const finalState = encodeURIComponent(state || provider);

    switch (provider) {
      case "google":
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        if (!googleClientId) throw new Error("Google OAuth 未配置");
        
        return `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${googleClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid email profile&` +
          `state=${finalState}`;

      case "github":
        const githubClientId = process.env.GITHUB_CLIENT_ID;
        if (!githubClientId) throw new Error("GitHub OAuth 未配置");
        
        return `https://github.com/login/oauth/authorize?` +
          `client_id=${githubClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=user:email&` +
          `state=${finalState}`;

      case "microsoft":
        const msClientId = process.env.MICROSOFT_CLIENT_ID;
        if (!msClientId) throw new Error("Microsoft OAuth 未配置");
        
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${msClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid email profile&` +
          `state=${finalState}`;

      case "linuxdo":
        const linuxdoClientId = process.env.LINUXDO_CLIENT_ID;
        if (!linuxdoClientId) throw new Error("LinuxDO OAuth 未配置");
        
        return `https://connect.linux.do/oauth2/authorize?` +
          `client_id=${linuxdoClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid email profile&` +
          `state=${finalState}`;

      default:
        throw new Error(`不支持的 OAuth 提供商: ${provider}`);
    }
  }

  /**
   * 处理 OAuth 回调
   */
  async handleOAuthCallback(provider: string, code: string, state: string) {
    try {
      const accessToken = await this.exchangeCodeForToken(provider, code);
      return await this.authenticateWithOAuth(provider, accessToken);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "OAuth 回调处理失败"
      };
    }
  }

  /**
   * 交换授权码获取访问令牌
   */
  private async exchangeCodeForToken(provider: string, code: string): Promise<string> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/auth/callback`;

    switch (provider) {
      case "google":
        const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        const googleData = await googleResponse.json();
        if (!googleResponse.ok) throw new Error(googleData.error_description);
        return googleData.access_token;

      case "github":
        const githubResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID!,
            client_secret: process.env.GITHUB_CLIENT_SECRET!,
            code,
          }),
        });
        const githubData = await githubResponse.json();
        if (!githubResponse.ok || githubData.error) throw new Error(githubData.error_description);
        return githubData.access_token;

      case "microsoft":
        const msResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        const msData = await msResponse.json();
        if (!msResponse.ok) throw new Error(msData.error_description);
        return msData.access_token;

      case "linuxdo":
        const linuxdoResponse = await fetch('https://connect.linux.do/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.LINUXDO_CLIENT_ID!,
            client_secret: process.env.LINUXDO_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        const linuxdoData = await linuxdoResponse.json();
        if (!linuxdoResponse.ok) throw new Error(linuxdoData.error_description);
        return linuxdoData.access_token;

      default:
        throw new Error(`不支持的提供商: ${provider}`);
    }
  }

  /**
   * 验证 OAuth 访问令牌并获取用户信息
   */
  async authenticateWithOAuth(provider: string, accessToken: string) {
    try {
      let userInfo: any = null;

      switch (provider) {
        case "google":
          userInfo = await this.validateGoogleToken(accessToken);
          break;
        case "github":
          userInfo = await this.validateGitHubToken(accessToken);
          break;
        case "microsoft":
          userInfo = await this.validateMicrosoftToken(accessToken);
          break;
        case "linuxdo":
          userInfo = await this.validateLinuxDoToken(accessToken);
          break;
        default:
          throw new Error(`不支持的 OAuth 提供商: ${provider}`);
      }

      if (!userInfo) {
        throw new Error("无法获取用户信息");
      }

      // 在 Supabase 中创建或更新用户
      const user = await this.createOrUpdateUser(userInfo, provider);
      this.currentUser = user;

      return {
        success: true,
        user,
        message: "认证成功",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "认证失败";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 验证 Google OAuth 令牌
   */
  private async validateGoogleToken(accessToken: string) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new Error("无效的 Google 访问令牌");
    }

    const data = await response.json();
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar_url: data.picture,
      provider_id: data.id,
    };
  }

  /**
   * 验证 GitHub OAuth 令牌
   */
  private async validateGitHubToken(accessToken: string) {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Payments-Maps-MCP-Server",
      },
    });

    if (!response.ok) {
      throw new Error("无效的 GitHub 访问令牌");
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.email,
      name: data.name || data.login,
      avatar_url: data.avatar_url,
      provider_id: data.id,
    };
  }

  /**
   * 验证 Microsoft OAuth 令牌
   */
  private async validateMicrosoftToken(accessToken: string) {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("无效的 Microsoft 访问令牌");
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      avatar_url: null, // Microsoft Graph API 需要额外调用获取头像
      provider_id: data.id,
    };
  }

  /**
   * 验证 LinuxDO OAuth 令牌
   */
  private async validateLinuxDoToken(accessToken: string) {
    const response = await fetch("https://connect.linux.do/oauth2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("无效的 LinuxDO 访问令牌");
    }

    const data = await response.json();

    return {
      id: data.sub,
      email: data.email,
      name: data.name || data.username,
      avatar_url: data.picture,
      provider_id: data.sub,
      username: data.username,
      trust_level: data.trust_level,
    };
  }

  /**
   * 在 Supabase 中创建或更新用户
   */
  private async createOrUpdateUser(userInfo: any, provider: string) {
    const userId = `${provider}_${userInfo.provider_id}`;

    // 检查用户是否已存在
    const { data: existingUser } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    const userData = {
      id: userId,
      email: userInfo.email,
      created_at: existingUser?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        display_name: userInfo.name,
        avatar_url: userInfo.avatar_url,
        provider,
        provider_id: userInfo.provider_id,
        username: userInfo.username,
        trust_level: userInfo.trust_level,
      },
    };

    if (existingUser) {
      // 更新现有用户
      const { error } = await this.supabase
        .from("users")
        .update(userData)
        .eq("id", userId);

      if (error) {
        throw new Error(`更新用户失败: ${error.message}`);
      }
    } else {
      // 创建新用户
      const { error } = await this.supabase
        .from("users")
        .insert(userData);

      if (error) {
        throw new Error(`创建用户失败: ${error.message}`);
      }
    }

    return userData;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 检查用户是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  /**
   * 获取当前用户 ID
   */
  getCurrentUserId(): string | null {
    return this.currentUser?.id || null;
  }

  /**
   * 登出用户
   */
  logout() {
    this.currentUser = null;
  }

  /**
   * 检查用户是否有权限操作特定 POS 机
   */
  async canModifyPOSMachine(posId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    const { data: posMachine } = await this.supabase
      .from("pos_machines")
      .select("created_by")
      .eq("id", posId)
      .single();

    return posMachine?.created_by === this.getCurrentUserId();
  }
}