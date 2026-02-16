export type KnownPOSStatus = 'active' | 'inactive' | 'maintenance' | 'disabled'

type POSStatusMeta = {
  label: string
  dotClass: string
  badgeClass: string
  mapColor: string
}

const POS_STATUS_META: Record<KnownPOSStatus | 'unknown', POSStatusMeta> = {
  active: {
    label: '正常运行',
    dotClass: 'bg-green-500',
    badgeClass: 'bg-green-50 text-green-700 border-green-100',
    mapColor: '#4318FF',
  },
  inactive: {
    label: '暂时不可用',
    dotClass: 'bg-gray-500',
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-100',
    mapColor: '#94A3B8',
  },
  maintenance: {
    label: '维修中',
    dotClass: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-100',
    mapColor: '#FBBF24',
  },
  disabled: {
    label: '已停用',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-100',
    mapColor: '#EF4444',
  },
  unknown: {
    label: '未知状态',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-100',
    mapColor: '#05CD99',
  },
}

const isKnownStatus = (status?: string): status is KnownPOSStatus => {
  return status === 'active' || status === 'inactive' || status === 'maintenance' || status === 'disabled'
}

export const getPOSStatusMeta = (status?: string): POSStatusMeta => {
  return POS_STATUS_META[isKnownStatus(status) ? status : 'unknown']
}

export const getPOSStatusLabel = (status?: string) => getPOSStatusMeta(status).label
export const getPOSStatusDotClass = (status?: string) => getPOSStatusMeta(status).dotClass
export const getPOSStatusBadgeClass = (status?: string) => getPOSStatusMeta(status).badgeClass
export const getPOSStatusMapColor = (status?: string) => getPOSStatusMeta(status).mapColor
