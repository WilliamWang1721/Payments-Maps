// 品牌类型定义

// 品牌业务类型枚举（线上线下）
export enum BrandBusinessType {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

// 品牌分类枚举
export enum BrandCategory {
  RESTAURANT = 'restaurant',
  RETAIL = 'retail',
  COFFEE = 'coffee',
  FAST_FOOD = 'fast_food',
  CONVENIENCE = 'convenience',
  SUPERMARKET = 'supermarket',
  FASHION = 'fashion',
  ELECTRONICS = 'electronics',
  PHARMACY = 'pharmacy',
  GAS_STATION = 'gas_station',
  HOTEL = 'hotel',
  ECOMMERCE = 'ecommerce',
  FOOD_DELIVERY = 'food_delivery',
  OTHER = 'other'
}

// 品牌状态枚举
export enum BrandStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon'
}

// 品牌接口定义
export interface Brand {
  id: string;
  name: string;
  nameEn?: string; // 英文名称
  description?: string;
  notes?: string; // 品牌备注信息
  category: BrandCategory;
  businessType: BrandBusinessType; // 线上线下分类
  status: BrandStatus;
  iconUrl?: string; // 品牌图标URL
  logo?: string; // 品牌logo URL或图标名称（保持兼容性）
  color?: string; // 品牌主色调
  website?: string;
  founded?: number; // 成立年份
  headquarters?: string; // 总部位置
  isSystemBrand: boolean; // 是否为系统预置品牌
  createdBy?: string; // 创建者用户ID
  posSupport: {
    supported: boolean;
    supportedRegions?: string[]; // 支持的地区
    supportedPaymentMethods?: string[]; // 支持的支付方式
    notes?: string; // 备注信息
  };
  createdAt?: string;
  updatedAt?: string;
}

// 品牌筛选选项
export interface BrandFilterOptions {
  category?: BrandCategory[];
  businessType?: BrandBusinessType[];
  status?: BrandStatus[];
  posSupported?: boolean;
  isSystemBrand?: boolean;
  createdBy?: string;
  searchQuery?: string;
}

// 品牌统计信息
export interface BrandStats {
  totalBrands: number;
  activeBrands: number;
  posEnabledBrands: number;
  categoryCounts: Record<BrandCategory, number>;
}

// 品牌选择器选项
export interface BrandSelectorOption {
  value: string;
  label: string;
  logo?: string;
  iconUrl?: string;
  category: BrandCategory;
  businessType: BrandBusinessType;
  notes?: string;
  disabled?: boolean;
}

// 新增品牌表单数据
export interface CreateBrandFormData {
  name: string;
  description?: string;
  notes?: string;
  category: BrandCategory;
  businessType: BrandBusinessType;
  iconUrl?: string;
  website?: string;
}

// 品牌管理操作类型
export enum BrandManagementAction {
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  VIEW = 'view'
}

// 所有类型已在上方直接导出