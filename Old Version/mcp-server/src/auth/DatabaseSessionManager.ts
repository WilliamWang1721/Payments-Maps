import { createClient } from "@supabase/supabase-js";

/**
 * MCP 会话管理服务 - 数据库版本
 */
export class DatabaseSessionManager {
  private supabase;

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
   * 生成新的 MCP 会话
   */
  async generateSession(userId: string, sessionName: string = 'Claude Desktop') {
    try {
      const { data, error } = await this.supabase.rpc('generate_mcp_session', {
        p_user_id: userId,
        p_session_name: sessionName
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('生成会话失败');
      }

      return {
        success: true,
        sessionToken: data[0].session_token
      };
    } catch (error) {
      console.error('生成会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成会话失败'
      };
    }
  }

  /**
   * 验证会话令牌
   */
  async verifySession(sessionToken: string) {
    try {
      const { data, error } = await this.supabase.rpc('verify_mcp_session', {
        p_token: sessionToken
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0 || !data[0].is_valid) {
        return {
          isValid: false,
          error: '无效的会话令牌'
        };
      }

      return {
        isValid: true,
        userId: data[0].user_id,
        sessionId: data[0].session_id,
        permissions: data[0].permissions
      };
    } catch (error) {
      console.error('验证会话失败:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '验证会话失败'
      };
    }
  }

  /**
   * 获取用户的 MCP 会话列表
   */
  async getUserSessions(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('mcp_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        sessions: data || []
      };
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取会话列表失败',
        sessions: []
      };
    }
  }

  /**
   * 更新会话权限
   */
  async updateSessionPermissions(sessionId: string, userId: string, permissions: any) {
    try {
      const { error } = await this.supabase
        .from('mcp_sessions')
        .update({ 
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: '权限更新成功'
      };
    } catch (error) {
      console.error('更新权限失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新权限失败'
      };
    }
  }

  /**
   * 撤销会话
   */
  async revokeSession(sessionId: string, userId: string) {
    try {
      const { error } = await this.supabase
        .from('mcp_sessions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: '会话已撤销'
      };
    } catch (error) {
      console.error('撤销会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '撤销会话失败'
      };
    }
  }
}