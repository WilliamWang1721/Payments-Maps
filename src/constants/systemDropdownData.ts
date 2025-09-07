// 系统级下拉菜单数据配置
// 提供所有表单中使用的标准化下拉选项

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
}

// 收单机构选项
export const ACQUIRING_INSTITUTIONS: DropdownOption[] = [
  { value: '银联商务', label: '银联商务', description: '中国银联旗下支付服务商' },
  { value: '拉卡拉', label: '拉卡拉', description: '知名第三方支付公司' },
  { value: '富友支付', label: '富友支付', description: '富友集团支付业务' },
  { value: '连通支付', label: '连通支付', description: '连通支付服务' },
  { value: '收钱吧', label: '收钱吧', description: '移动支付服务商' },
  { value: '美团支付', label: '美团支付', description: '美团支付服务' },
  { value: '中国银行', label: '中国银行', description: '中国银行股份有限公司' },
  { value: '工商银行', label: '工商银行', description: '中国工商银行股份有限公司' },
  { value: '建设银行', label: '建设银行', description: '中国建设银行股份有限公司' },
  { value: '交通银行', label: '交通银行', description: '交通银行股份有限公司' }
]

// 设备状态选项
export const DEVICE_STATUS_OPTIONS: DropdownOption[] = [
  { value: 'active', label: '正常运行', description: '设备正常工作，可以正常使用' },
  { value: 'inactive', label: '暂时不可用', description: '设备暂时无法使用，但可能恢复' },
  { value: 'maintenance', label: '维修中', description: '设备正在维修，暂时无法使用' },
  { value: 'disabled', label: '已停用', description: '设备已永久停用' }
]

// 货币选项
export const CURRENCY_OPTIONS: DropdownOption[] = [
  { value: '$', label: '美元 ($)', description: 'US Dollar' },
  { value: '¥', label: '人民币 (¥)', description: 'Chinese Yuan' },
  { value: '€', label: '欧元 (€)', description: 'Euro' },
  { value: '£', label: '英镑 (£)', description: 'British Pound' },
  { value: '₩', label: '韩元 (₩)', description: 'South Korean Won' },
  { value: '¢', label: '分/美分 (¢)', description: 'Cent' }
]

// 收单模式选项
export const ACQUIRING_MODES: DropdownOption[] = [
  { value: 'swipe', label: '刷卡', description: '磁条卡刷卡支付' },
  { value: 'insert', label: '插卡', description: 'IC芯片卡插卡支付' },
  { value: 'tap', label: '挥卡', description: 'NFC非接触支付' },
  { value: 'qr_code', label: '扫码', description: '二维码扫码支付' },
  { value: 'manual', label: '手动输入', description: '手动输入卡号支付' },
  { value: 'online', label: '在线支付', description: '网络在线支付' }
]

// POS机型号选项（常见型号）
export const POS_MODELS: DropdownOption[] = [
  { value: 'NEWLAND_ME31', label: '新大陆 ME31', description: '新大陆智能POS机' },
  { value: 'NEWLAND_ME30', label: '新大陆 ME30', description: '新大陆传统POS机' },
  { value: 'LAKALA_P990', label: '拉卡拉 P990', description: '拉卡拉智能POS机' },
  { value: 'LAKALA_P950', label: '拉卡拉 P950', description: '拉卡拉商户版POS机' },
  { value: 'CUP_UP820', label: '银联商务 UP820', description: '银联商务智能POS机' },
  { value: 'CUP_UP600', label: '银联商务 UP600', description: '银联商务传统POS机' },
  { value: 'HISENSE_K1', label: '海信 K1', description: '海信智能POS机' },
  { value: 'VERIFONE_VX520', label: 'Verifone VX520', description: 'Verifone传统POS机' },
  { value: 'INGENICO_IWL220', label: 'Ingenico iWL220', description: 'Ingenico无线POS机' },
  { value: 'CUSTOM', label: '自定义型号', description: '其他型号或自定义型号' }
]

// 交易类型选项
export const TRANSACTION_TYPES: DropdownOption[] = [
  { value: 'purchase', label: '购买', description: '普通商品购买交易' },
  { value: 'refund', label: '退款', description: '退货退款交易' },
  { value: 'void', label: '撤销', description: '交易撤销' },
  { value: 'preauth', label: '预授权', description: '预授权交易' },
  { value: 'completion', label: '预授权完成', description: '预授权完成交易' },
  { value: 'inquiry', label: '余额查询', description: '账户余额查询' },
  { value: 'settlement', label: '结算', description: '批量结算交易' }
]

// 收银位置选项
export const CHECKOUT_LOCATIONS: DropdownOption[] = [
  { value: '自助收银', label: '自助收银', description: '客户自助操作的收银台' },
  { value: '人工收银', label: '人工收银', description: '店员操作的收银台' }
]

// 平台选项（用于自定义链接）
export const PLATFORM_OPTIONS: DropdownOption[] = [
  { value: 'linuxdo', label: 'LinuxDO', description: 'LinuxDO论坛平台' },
  { value: 'xiaohongshu', label: '小红书', description: '小红书社交平台' },
  { value: 'weibo', label: '微博', description: '新浪微博平台' },
  { value: 'zhihu', label: '知乎', description: '知乎问答平台' },
  { value: 'douyin', label: '抖音', description: '抖音短视频平台' },
  { value: 'bilibili', label: '哔哩哔哩', description: 'B站视频平台' },
  { value: 'wechat', label: '微信', description: '微信平台' },
  { value: 'qq', label: 'QQ', description: 'QQ平台' },
  { value: 'telegram', label: 'Telegram', description: 'Telegram即时通讯' },
  { value: 'other', label: '其他', description: '其他平台' }
]

// 获取指定类型的下拉选项
export const getDropdownOptions = (type: string): DropdownOption[] => {
  switch (type) {
    case 'acquiring_institution':
      return ACQUIRING_INSTITUTIONS
    case 'device_status':
      return DEVICE_STATUS_OPTIONS
    case 'currency':
      return CURRENCY_OPTIONS
    case 'acquiring_modes':
      return ACQUIRING_MODES
    case 'pos_models':
      return POS_MODELS
    case 'transaction_types':
      return TRANSACTION_TYPES
    case 'checkout_locations':
      return CHECKOUT_LOCATIONS
    case 'platforms':
      return PLATFORM_OPTIONS
    default:
      return []
  }
}

// 根据值获取标签
export const getOptionLabel = (type: string, value: string): string => {
  const options = getDropdownOptions(type)
  const option = options.find(opt => opt.value === value)
  return option?.label || value
}

// 根据值获取描述
export const getOptionDescription = (type: string, value: string): string | undefined => {
  const options = getDropdownOptions(type)
  const option = options.find(opt => opt.value === value)
  return option?.description
}