import { FormEvent, useMemo, useState } from 'react'
import { Building2, CalendarClock, MapPin, Search, type LucideIcon } from 'lucide-react'
import { parseSearchInput } from '@/utils/searchParser'

type Suggestion = {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  value: string
  submit?: boolean
}

type GlobalSearchBarProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
}

const GlobalSearchBar = ({
  value,
  onChange,
  onSubmit,
  placeholder = '全域搜索：商户 / 地址 / 坐标 / 收单机构 / 时间'
}: GlobalSearchBarProps) => {
  const [open, setOpen] = useState(false)

  const parsed = useMemo(() => parseSearchInput(value || ''), [value])
  const coordLabel = parsed.coordinates
    ? `${parsed.coordinates.lat.toFixed(4)}, ${parsed.coordinates.lng.toFixed(4)}`
    : ''

  const today = useMemo(() => new Date(), [])
  const formatDate = (date: Date) => date.toISOString().slice(0, 10)
  const quickDateRange = `${formatDate(new Date(today.getTime() - 29 * 24 * 3600 * 1000))}..${formatDate(today)}`

  const suggestions: Suggestion[] = useMemo(() => {
    const list: Suggestion[] = []
    const trimmed = value.trim()

    if (trimmed) {
      list.push({
        id: 'keyword',
        label: `搜索 “${trimmed}”`,
        description: '匹配商户名、地址、备注等任意字段',
        icon: Search,
        value: trimmed,
        submit: true,
      })
    }

    if (parsed.coordinates) {
      list.push({
        id: 'coord',
        label: `按坐标附近筛选 (${coordLabel})`,
        description: '在该坐标附近查找 POS 位置',
        icon: MapPin,
        value: trimmed || coordLabel,
        submit: true,
      })
    }

    if (trimmed) {
      list.push({
        id: 'acq',
        label: `收单机构：${trimmed}`,
        description: '插入参数 acq:<机构>',
        icon: Building2,
        value: `acq:${trimmed}`,
      })
    }

    const dateMatch = trimmed.match(/\\d{4}-\\d{2}-\\d{2}/)?.[0]
    if (dateMatch) {
      list.push({
        id: 'date',
        label: `按添加时间：${dateMatch}`,
        description: '插入参数 added:<日期>',
        icon: CalendarClock,
        value: `added:${dateMatch}`,
      })
    }

    return list
  }, [coordLabel, parsed.coordinates, value])

  const quickChips = [
    { label: '收单机构', token: 'acq:' },
    { label: '今天新增', token: `added:${formatDate(today)}` },
    { label: '近30天', token: `added:${quickDateRange}` },
    { label: '经纬度', token: '39.90,116.40' },
  ]

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    onSubmit(value)
    setOpen(false)
  }

  const applySuggestion = (suggestion: Suggestion) => {
    if (suggestion.submit) {
      onSubmit(suggestion.value)
      setOpen(false)
    } else {
      onChange(suggestion.value)
      setOpen(true)
    }
  }

  const appendToken = (token: string) => {
    const prefix = value.trim()
    const next = prefix ? `${prefix} ${token}` : token
    onChange(next)
    setOpen(true)
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative group w-full">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-accent-yellow transition-colors pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          placeholder={placeholder}
          className="bg-white dark:bg-slate-900 pl-10 pr-4 py-3 rounded-2xl text-sm w-full shadow-soft border border-transparent dark:border-slate-800 focus:border-accent-yellow/50 focus:outline-none focus:ring-4 focus:ring-accent-yellow/10 transition-all placeholder:text-gray-400 text-soft-black dark:text-gray-100"
        />
      </form>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-40 p-3 space-y-2">
          <div className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400">全域搜索</div>

          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">输入关键词、坐标或参数进行搜索</div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySuggestion(item)}
                className="w-full flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <item.icon className="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-soft-black dark:text-gray-100">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                  )}
                </div>
              </button>
            ))
          )}

          <div className="px-1 pt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">快速参数</div>
          <div className="flex flex-wrap gap-2 px-1 pb-1">
            {quickChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => appendToken(chip.token)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalSearchBar
