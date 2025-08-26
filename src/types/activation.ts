// 激活码相关类型定义

export interface ActivationCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivationLog {
  id: string;
  user_id: string;
  activation_code_id: string;
  activated_at: string;
  user_email: string;
  activation_code: string;
}

export interface GenerateActivationCodeRequest {
  name: string;
  description?: string;
}

export interface GenerateActivationCodeResponse {
  id: string;
  code: string;
}

export interface ActivateBetaPermissionRequest {
  code: string;
}

export interface ActivateBetaPermissionResponse {
  success: boolean;
  message: string;
}

export interface DeactivateActivationCodeRequest {
  codeId: string;
}

// 扩展用户角色类型，添加beta角色
export type UserRole = 'regular' | 'beta' | 'admin' | 'super_admin';

// 激活码管理相关的状态类型
export interface ActivationCodeManagementState {
  codes: ActivationCode[];
  logs: ActivationLog[];
  loading: boolean;
  error: string | null;
}

// 激活弹窗状态类型
export interface BetaActivationModalState {
  isOpen: boolean;
  code: string;
  loading: boolean;
  error: string | null;
}

// API响应包装类型
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// 分页相关类型
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 激活码统计类型
export interface ActivationCodeStats {
  totalCodes: number;
  activeCodes: number;
  totalUsage: number;
  recentActivations: number;
}