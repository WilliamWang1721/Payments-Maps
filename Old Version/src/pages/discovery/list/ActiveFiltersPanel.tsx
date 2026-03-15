import { memo, useMemo } from 'react'
import { Filter } from 'lucide-react'
import { type MapState } from '@/stores/useMapStore'

type Filters = MapState['filters']

type ActiveFilterChip = {
  key: string
  label: string
  chipClassName: string
  buttonClassName: string
  clearPayload: Partial<Filters>
}

type ActiveFiltersPanelProps = {
  filters: Filters
  onClearFilter: (next: Partial<Filters>) => void
  onClearAll: () => void
}

type BooleanFilterChipConfig = {
  key:
    | 'supportsApplePay'
    | 'supportsGooglePay'
    | 'supportsContactless'
    | 'supportsHCE'
    | 'supportsVisa'
    | 'supportsMastercard'
    | 'supportsUnionPay'
    | 'supportsAmex'
    | 'supportsJCB'
    | 'supportsDiners'
    | 'supportsSmallAmountExemption'
    | 'supportsPinVerification'
    | 'supportsSignatureVerification'
    | 'supportsDCC'
    | 'supportsEDC'
  label: string
  chipClassName: string
  buttonClassName: string
}

const BOOLEAN_FILTER_CHIPS: BooleanFilterChipConfig[] = [
  { key: 'supportsApplePay', label: 'Apple Pay', chipClassName: 'bg-blue-100 text-blue-800', buttonClassName: 'text-blue-600 hover:text-blue-800' },
  { key: 'supportsGooglePay', label: 'Google Pay', chipClassName: 'bg-green-100 text-green-800', buttonClassName: 'text-green-600 hover:text-green-800' },
  { key: 'supportsContactless', label: '闪付支持', chipClassName: 'bg-purple-100 text-purple-800', buttonClassName: 'text-purple-600 hover:text-purple-800' },
  { key: 'supportsHCE', label: 'HCE 模拟', chipClassName: 'bg-indigo-100 text-indigo-800', buttonClassName: 'text-indigo-600 hover:text-indigo-800' },
  { key: 'supportsVisa', label: 'Visa', chipClassName: 'bg-blue-100 text-blue-800', buttonClassName: 'text-blue-600 hover:text-blue-800' },
  { key: 'supportsMastercard', label: 'Mastercard', chipClassName: 'bg-red-100 text-red-800', buttonClassName: 'text-red-600 hover:text-red-800' },
  { key: 'supportsUnionPay', label: '银联', chipClassName: 'bg-red-100 text-red-800', buttonClassName: 'text-red-600 hover:text-red-800' },
  { key: 'supportsAmex', label: 'American Express', chipClassName: 'bg-green-100 text-green-800', buttonClassName: 'text-green-600 hover:text-green-800' },
  { key: 'supportsJCB', label: 'JCB', chipClassName: 'bg-yellow-100 text-yellow-800', buttonClassName: 'text-yellow-600 hover:text-yellow-800' },
  { key: 'supportsDiners', label: 'Diners Club', chipClassName: 'bg-gray-100 text-gray-800', buttonClassName: 'text-gray-600 hover:text-gray-800' },
  { key: 'supportsSmallAmountExemption', label: '小额免密', chipClassName: 'bg-emerald-100 text-emerald-800', buttonClassName: 'text-emerald-600 hover:text-emerald-800' },
  { key: 'supportsPinVerification', label: 'PIN 验证', chipClassName: 'bg-orange-100 text-orange-800', buttonClassName: 'text-orange-600 hover:text-orange-800' },
  { key: 'supportsSignatureVerification', label: '签名验证', chipClassName: 'bg-pink-100 text-pink-800', buttonClassName: 'text-pink-600 hover:text-pink-800' },
  { key: 'supportsDCC', label: 'DCC 支持', chipClassName: 'bg-cyan-100 text-cyan-800', buttonClassName: 'text-cyan-600 hover:text-cyan-800' },
  { key: 'supportsEDC', label: 'EDC 支持', chipClassName: 'bg-teal-100 text-teal-800', buttonClassName: 'text-teal-600 hover:text-teal-800' },
]

const buildActiveFilterChips = (filters: Filters): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = BOOLEAN_FILTER_CHIPS.filter((item) => Boolean(filters[item.key])).map((item) => ({
    key: item.key,
    label: item.label,
    chipClassName: item.chipClassName,
    buttonClassName: item.buttonClassName,
    clearPayload: { [item.key]: false } as Partial<Filters>,
  }))

  if (filters.acquiringInstitution) {
    chips.push({
      key: 'acquiringInstitution',
      label: filters.acquiringInstitution,
      chipClassName: 'bg-slate-100 text-slate-800',
      buttonClassName: 'text-slate-600 hover:text-slate-800',
      clearPayload: { acquiringInstitution: undefined },
    })
  }

  if (filters.posModel) {
    chips.push({
      key: 'posModel',
      label: filters.posModel,
      chipClassName: 'bg-amber-100 text-amber-800',
      buttonClassName: 'text-amber-600 hover:text-amber-800',
      clearPayload: { posModel: undefined },
    })
  }

  return chips
}

const ActiveFiltersPanel = ({ filters, onClearFilter, onClearAll }: ActiveFiltersPanelProps) => {
  const chips = useMemo(() => buildActiveFilterChips(filters), [filters])

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="bg-cream rounded-3xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
        <Filter className="w-4 h-4" />
        已应用筛选
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip.key} className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${chip.chipClassName}`}>
            {chip.label}
            <button
              type="button"
              onClick={() => onClearFilter(chip.clearPayload)}
              className={`ml-1 ${chip.buttonClassName}`}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          清除全部
        </button>
      </div>
    </div>
  )
}

export default memo(ActiveFiltersPanel)
