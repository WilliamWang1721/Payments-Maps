import { Brand, BrandCategory, BrandStatus, BrandFilterOptions, BrandStats, BrandBusinessType } from '../types/brands';

// 预置品牌数据
export const PRESET_BRANDS: Brand[] = [
  {
    id: 'mcdonalds',
    name: '麦当劳',
    nameEn: "McDonald's",
    description: '全球知名快餐连锁品牌，提供汉堡、薯条等快餐食品',
    category: BrandCategory.FAST_FOOD,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '🍟',
    color: '#FFC72C',
    website: 'https://www.mcdonalds.com',
    founded: 1955,
    headquarters: '美国芝加哥',
    posSupport: {
      supported: true,
      supportedRegions: ['全球'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'Apple Pay', 'Google Pay'],
      notes: '支持多种支付方式，包括移动支付'
    }
  },
  {
    id: 'starbucks',
    name: '星巴克',
    nameEn: 'Starbucks',
    description: '全球最大的咖啡连锁店，提供各种咖啡饮品和轻食',
    category: BrandCategory.COFFEE,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '☕',
    color: '#00704A',
    website: 'https://www.starbucks.com',
    founded: 1971,
    headquarters: '美国西雅图',
    posSupport: {
      supported: true,
      supportedRegions: ['全球'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'Apple Pay', 'Starbucks Card'],
      notes: '支持星巴克会员卡和移动支付'
    }
  },
  {
    id: 'uniqlo',
    name: '优衣库',
    nameEn: 'UNIQLO',
    description: '日本快时尚品牌，以基本款服装和创新面料著称',
    category: BrandCategory.FASHION,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '👕',
    color: '#FF0000',
    website: 'https://www.uniqlo.com',
    founded: 1984,
    headquarters: '日本东京',
    posSupport: {
      supported: true,
      supportedRegions: ['亚洲', '欧洲', '北美'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'JCB', 'Apple Pay'],
      notes: '支持多种国际支付方式'
    }
  },
  {
    id: 'kfc',
    name: '肯德基',
    nameEn: 'KFC',
    description: '全球知名炸鸡快餐连锁品牌',
    category: BrandCategory.FAST_FOOD,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '🍗',
    color: '#E4002B',
    website: 'https://www.kfc.com',
    founded: 1952,
    headquarters: '美国肯塔基州',
    posSupport: {
      supported: true,
      supportedRegions: ['全球'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'Apple Pay', 'Google Pay'],
      notes: '支持移动支付和外卖平台支付'
    }
  },
  {
    id: 'walmart',
    name: '沃尔玛',
    nameEn: 'Walmart',
    description: '全球最大的零售连锁企业',
    category: BrandCategory.SUPERMARKET,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '🛒',
    color: '#004C91',
    website: 'https://www.walmart.com',
    founded: 1962,
    headquarters: '美国阿肯色州',
    posSupport: {
      supported: true,
      supportedRegions: ['北美', '亚洲'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'American Express', 'Walmart Pay'],
      notes: '支持自有支付应用Walmart Pay'
    }
  },
  {
    id: 'apple-store',
    name: 'Apple Store',
    nameEn: 'Apple Store',
    description: '苹果公司官方零售店',
    category: BrandCategory.ELECTRONICS,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '🍎',
    color: '#007AFF',
    website: 'https://www.apple.com',
    founded: 2001,
    headquarters: '美国加利福尼亚州',
    posSupport: {
      supported: true,
      supportedRegions: ['全球'],
      supportedPaymentMethods: ['Apple Pay', 'Visa', 'Mastercard', '银联', 'American Express'],
      notes: '优先支持Apple Pay，提供无接触支付体验'
    }
  },
  {
    id: 'seven-eleven',
    name: '7-Eleven',
    nameEn: '7-Eleven',
    description: '全球最大的便利店连锁品牌',
    category: BrandCategory.CONVENIENCE,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '🏪',
    color: '#FF6600',
    website: 'https://www.7-eleven.com',
    founded: 1927,
    headquarters: '美国德克萨斯州',
    posSupport: {
      supported: true,
      supportedRegions: ['全球'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'Apple Pay', 'Google Pay', '现金'],
      notes: '24小时营业，支持多种便民支付方式'
    }
  },
  {
    id: 'zara',
    name: 'ZARA',
    nameEn: 'ZARA',
    description: '西班牙快时尚品牌，以快速更新时尚潮流著称',
    category: BrandCategory.FASHION,
    businessType: BrandBusinessType.OFFLINE,
    status: BrandStatus.ACTIVE,
    isSystemBrand: true,
    logo: '👗',
    color: '#000000',
    website: 'https://www.zara.com',
    founded: 1975,
    headquarters: '西班牙拉科鲁尼亚',
    posSupport: {
      supported: true,
      supportedRegions: ['全球'],
      supportedPaymentMethods: ['Visa', 'Mastercard', '银联', 'Apple Pay', 'PayPal'],
      notes: '支持线上线下一体化支付'
    }
  }
];

// 品牌工具函数
export class BrandService {
  // 获取所有品牌
  static getAllBrands(): Brand[] {
    return PRESET_BRANDS;
  }

  // 根据ID获取品牌
  static getBrandById(id: string): Brand | undefined {
    return PRESET_BRANDS.find(brand => brand.id === id);
  }

  // 根据分类筛选品牌
  static getBrandsByCategory(category: BrandCategory): Brand[] {
    return PRESET_BRANDS.filter(brand => brand.category === category);
  }

  // 获取支持POS的品牌
  static getPOSSupportedBrands(): Brand[] {
    return PRESET_BRANDS.filter(brand => brand.posSupport.supported);
  }

  // 搜索品牌
  static searchBrands(query: string): Brand[] {
    const lowerQuery = query.toLowerCase();
    return PRESET_BRANDS.filter(brand => 
      brand.name.toLowerCase().includes(lowerQuery) ||
      brand.nameEn?.toLowerCase().includes(lowerQuery) ||
      brand.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // 筛选品牌
  static filterBrands(options: BrandFilterOptions): Brand[] {
    let filteredBrands = PRESET_BRANDS;

    // 按分类筛选
    if (options.category && options.category.length > 0) {
      filteredBrands = filteredBrands.filter(brand => 
        options.category!.includes(brand.category)
      );
    }

    // 按状态筛选
    if (options.status && options.status.length > 0) {
      filteredBrands = filteredBrands.filter(brand => 
        options.status!.includes(brand.status)
      );
    }

    // 按POS支持筛选
    if (options.posSupported !== undefined) {
      filteredBrands = filteredBrands.filter(brand => 
        brand.posSupport.supported === options.posSupported
      );
    }

    // 按搜索关键词筛选
    if (options.searchQuery) {
      const lowerQuery = options.searchQuery.toLowerCase();
      filteredBrands = filteredBrands.filter(brand => 
        brand.name.toLowerCase().includes(lowerQuery) ||
        brand.nameEn?.toLowerCase().includes(lowerQuery) ||
        brand.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return filteredBrands;
  }

  // 获取品牌统计信息
  static getBrandStats(): BrandStats {
    const totalBrands = PRESET_BRANDS.length;
    const activeBrands = PRESET_BRANDS.filter(brand => brand.status === BrandStatus.ACTIVE).length;
    const posEnabledBrands = PRESET_BRANDS.filter(brand => brand.posSupport.supported).length;
    
    const categoryCounts = Object.values(BrandCategory).reduce((acc, category) => {
      acc[category] = PRESET_BRANDS.filter(brand => brand.category === category).length;
      return acc;
    }, {} as Record<BrandCategory, number>);

    return {
      totalBrands,
      activeBrands,
      posEnabledBrands,
      categoryCounts
    };
  }

  // 获取分类选项
  static getCategoryOptions() {
    return Object.values(BrandCategory).map(category => ({
      value: category,
      label: this.getCategoryLabel(category)
    }));
  }

  // 获取分类标签
  static getCategoryLabel(category: BrandCategory): string {
    const labels: Record<BrandCategory, string> = {
      [BrandCategory.RESTAURANT]: '餐厅',
      [BrandCategory.RETAIL]: '零售',
      [BrandCategory.COFFEE]: '咖啡',
      [BrandCategory.FAST_FOOD]: '快餐',
      [BrandCategory.CONVENIENCE]: '便利店',
      [BrandCategory.SUPERMARKET]: '超市',
      [BrandCategory.FASHION]: '时尚',
      [BrandCategory.ELECTRONICS]: '电子产品',
      [BrandCategory.PHARMACY]: '药店',
      [BrandCategory.GAS_STATION]: '加油站',
      [BrandCategory.HOTEL]: '酒店',
      [BrandCategory.ECOMMERCE]: '电商平台',
      [BrandCategory.FOOD_DELIVERY]: '外卖配送',
      [BrandCategory.OTHER]: '其他'
    };
    return labels[category] || category;
  }

  // 获取状态标签
  static getStatusLabel(status: BrandStatus): string {
    const labels: Record<BrandStatus, string> = {
      [BrandStatus.ACTIVE]: '活跃',
      [BrandStatus.INACTIVE]: '非活跃',
      [BrandStatus.COMING_SOON]: '即将推出'
    };
    return labels[status] || status;
  }
}