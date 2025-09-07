// MCP 服务器的类型定义
import { z } from 'zod'

// 用户认证信息模式
export const UserAuthSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  user_id: z.string(),
  email: z.string().email(),
  display_name: z.string().optional(),
  provider: z.enum(['google', 'github', 'microsoft', 'linuxdo']),
})

// POS 机基本信息模式
export const POSMachineSchema = z.object({
  id: z.string().optional(),
  merchant_name: z.string().min(1, "商户名称不能为空"),
  address: z.string().min(1, "地址不能为空"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  brand_id: z.string().optional(),
  
  // 基本信息
  basic_info: z.object({
    model: z.string().optional(),
    acquiring_institution: z.string().optional(),
    checkout_location: z.enum(['自助收银', '人工收银']).optional(),
    supports_foreign_cards: z.boolean().optional(),
    supports_apple_pay: z.boolean().optional(),
    supports_google_pay: z.boolean().optional(),
    supports_contactless: z.boolean().optional(),
    supports_hce_simulation: z.boolean().optional(),
    supports_dcc: z.boolean().optional(),
    supports_edc: z.boolean().optional(),
    acquiring_modes: z.array(z.string()).optional(),
    min_amount_no_pin: z.number().min(0).optional(),
    supported_card_networks: z.array(z.string()).optional(),
  }),
  
  // 商户信息
  merchant_info: z.object({
    transaction_name: z.string().optional(),
    transaction_type: z.string().optional(),
  }).optional(),
  
  // 验证模式
  verification_modes: z.object({
    small_amount_no_pin: z.array(z.string()).optional(),
    small_amount_no_pin_unsupported: z.boolean().optional(),
    small_amount_no_pin_uncertain: z.boolean().optional(),
    requires_password: z.array(z.string()).optional(),
    requires_password_unsupported: z.boolean().optional(),
    requires_password_uncertain: z.boolean().optional(),
    requires_signature: z.array(z.string()).optional(),
    requires_signature_unsupported: z.boolean().optional(),
    requires_signature_uncertain: z.boolean().optional(),
  }).optional(),
  
  remarks: z.string().optional(),
  custom_links: z.array(z.object({
    platform: z.string(),
    url: z.string().url(),
    title: z.string(),
  })).optional(),
  
  status: z.enum(['active', 'inactive', 'maintenance', 'disabled']).default('active'),
})

// POS 机搜索参数模式
export const POSSearchSchema = z.object({
  keyword: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().positive().optional(),
  
  // 支付功能筛选
  supports_apple_pay: z.boolean().optional(),
  supports_google_pay: z.boolean().optional(),
  supports_contactless: z.boolean().optional(),
  supports_foreign_cards: z.boolean().optional(),
  
  // 卡网络筛选
  supports_visa: z.boolean().optional(),
  supports_mastercard: z.boolean().optional(),
  supports_unionpay: z.boolean().optional(),
  supports_amex: z.boolean().optional(),
  supports_jcb: z.boolean().optional(),
  supports_diners: z.boolean().optional(),
  supports_discover: z.boolean().optional(),
  
  // 其他筛选
  acquiring_institution: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'disabled']).optional(),
  checkout_location: z.enum(['自助收银', '人工收银']).optional(),
  
  // 分页
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

// 导出类型
export type UserAuth = z.infer<typeof UserAuthSchema>
export type POSMachine = z.infer<typeof POSMachineSchema>
export type POSSearch = z.infer<typeof POSSearchSchema>