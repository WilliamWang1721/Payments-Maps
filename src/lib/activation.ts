import { supabase } from './supabase';
import type {
  ActivationCode,
  ActivationLog,
  GenerateActivationCodeRequest,
  GenerateActivationCodeResponse,
  ActivateBetaPermissionRequest,
  ActivateBetaPermissionResponse,
  DeactivateActivationCodeRequest,
  ApiResponse,
  ActivationCodeStats
} from '../types/activation';

/**
 * 生成新的激活码
 */
export async function generateActivationCode(
  request: GenerateActivationCodeRequest
): Promise<ApiResponse<GenerateActivationCodeResponse>> {
  try {
    const { data, error } = await supabase.rpc('generate_activation_code', {
      code_name: request.name,
      code_description: request.description || null
    });

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    return {
      data: data[0] // RPC函数返回的是数组，取第一个元素
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : '生成激活码失败'
      }
    };
  }
}

/**
 * 激活Beta权限
 */
export async function activateBetaPermission(
  request: ActivateBetaPermissionRequest
): Promise<ApiResponse<ActivateBetaPermissionResponse>> {
  try {
    const { data, error } = await supabase.rpc('activate_beta_permission', {
      activation_code: request.code
    });

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    return {
      data: data[0] // RPC函数返回的是数组，取第一个元素
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : '激活Beta权限失败'
      }
    };
  }
}

/**
 * 停用激活码
 */
export async function deactivateActivationCode(
  request: DeactivateActivationCodeRequest
): Promise<ApiResponse<boolean>> {
  try {
    const { data, error } = await supabase.rpc('deactivate_activation_code', {
      code_id: request.codeId
    });

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    return {
      data: data
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : '停用激活码失败'
      }
    };
  }
}

/**
 * 获取激活码列表
 */
export async function getActivationCodes(): Promise<ApiResponse<ActivationCode[]>> {
  try {
    const { data, error } = await supabase
      .from('activation_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    return {
      data: data || []
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : '获取激活码列表失败'
      }
    };
  }
}

/**
 * 获取激活日志列表
 */
export async function getActivationLogs(): Promise<ApiResponse<ActivationLog[]>> {
  try {
    const { data, error } = await supabase
      .from('activation_logs')
      .select('*')
      .order('activated_at', { ascending: false });

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    return {
      data: data || []
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : '获取激活日志失败'
      }
    };
  }
}

/**
 * 获取激活码统计信息
 */
export async function getActivationCodeStats(): Promise<ApiResponse<ActivationCodeStats>> {
  try {
    // 获取激活码统计
    const { data: codesData, error: codesError } = await supabase
      .from('activation_codes')
      .select('is_active, usage_count');

    if (codesError) {
      return {
        error: {
          message: codesError.message,
          code: codesError.code
        }
      };
    }

    // 获取最近7天的激活记录
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentLogsData, error: logsError } = await supabase
      .from('activation_logs')
      .select('id')
      .gte('activated_at', sevenDaysAgo.toISOString());

    if (logsError) {
      return {
        error: {
          message: logsError.message,
          code: logsError.code
        }
      };
    }

    const totalCodes = codesData?.length || 0;
    const activeCodes = codesData?.filter(code => code.is_active).length || 0;
    const totalUsage = codesData?.reduce((sum, code) => sum + (code.usage_count || 0), 0) || 0;
    const recentActivations = recentLogsData?.length || 0;

    return {
      data: {
        totalCodes,
        activeCodes,
        totalUsage,
        recentActivations
      }
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : '获取统计信息失败'
      }
    };
  }
}

/**
 * 检查用户是否可以激活Beta权限
 */
export async function canActivateBeta(userRole: string): Promise<boolean> {
  return userRole === 'regular';
}

/**
 * 验证激活码格式
 */
export function validateActivationCode(code: string): boolean {
  // 激活码应该是8位大写字母和数字的组合
  const codeRegex = /^[A-Z0-9]{8}$/;
  return codeRegex.test(code);
}