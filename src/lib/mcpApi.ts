import { supabase } from '@/lib/supabase'

/**
 * MCP 管理 API 工具函数
 */

export interface MCPSession {
  id: string
  session_name: string
  client_type: string
  last_active: string
  created_at: string
  permissions: {
    search: boolean
    add_pos: boolean
    update_pos: boolean
    delete_pos: boolean
    view_details: boolean
  }
  is_active: boolean
}

/**
 * 生成新的 MCP 会话
 */
export async function generateMCPSession(userId: string, sessionName: string = 'Claude Desktop') {
  try {
    const { data, error } = await supabase.rpc('generate_mcp_session', {
      p_user_id: userId,
      p_session_name: sessionName
    })

    if (error) {
      // 检查是否是函数不存在的错误
      if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
        return {
          success: false,
          error: 'MCP功能尚未完全配置。请联系管理员完成数据库设置。'
        }
      }
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('生成会话失败')
    }

    return {
      success: true,
      sessionToken: data[0].session_token
    }
  } catch (error) {
    console.error('生成 MCP 会话失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成会话失败'
    }
  }
}

/**
 * 获取用户的 MCP 会话列表
 */
export async function getUserMCPSessions(userId: string): Promise<{ success: boolean; sessions: MCPSession[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('mcp_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active', { ascending: false })

    if (error) {
      // 检查是否是表不存在的错误
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          success: false,
          sessions: [],
          error: 'MCP功能尚未完全配置。请联系管理员完成数据库设置。'
        }
      }
      throw error
    }

    return {
      success: true,
      sessions: data || []
    }
  } catch (error) {
    console.error('获取 MCP 会话列表失败:', error)
    return {
      success: false,
      sessions: [],
      error: error instanceof Error ? error.message : '获取会话列表失败'
    }
  }
}

/**
 * 更新 MCP 会话权限
 */
export async function updateMCPSessionPermissions(
  sessionId: string, 
  userId: string, 
  permissions: MCPSession['permissions']
) {
  try {
    const { error } = await supabase
      .from('mcp_sessions')
      .update({ 
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      // 检查是否是表不存在的错误
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          success: false,
          error: 'MCP功能尚未完全配置。请联系管理员完成数据库设置。'
        }
      }
      throw error
    }

    return {
      success: true,
      message: '权限更新成功'
    }
  } catch (error) {
    console.error('更新 MCP 会话权限失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新权限失败'
    }
  }
}

/**
 * 撤销 MCP 会话
 */
export async function revokeMCPSession(sessionId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('mcp_sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      // 检查是否是表不存在的错误
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          success: false,
          error: 'MCP功能尚未完全配置。请联系管理员完成数据库设置。'
        }
      }
      throw error
    }

    return {
      success: true,
      message: '会话已撤销'
    }
  } catch (error) {
    console.error('撤销 MCP 会话失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '撤销会话失败'
    }
  }
}

/**
 * 生成 Claude Desktop 配置
 */
export function generateClaudeDesktopConfig(sessionToken: string, serverUrl: string = 'https://www.payments-maps.asia') {
  return {
    mcpServers: {
      "payments-maps": {
        command: "bash",
        args: [
          "-c", 
          "curl -fsSL https://raw.githubusercontent.com/WilliamWang1721/Payments-Maps/main/mcp-client/start.sh | bash"
        ],
        env: {
          PAYMENTS_MAPS_SERVER: serverUrl,
          SESSION_TOKEN: sessionToken
        }
      }
    }
  }
}