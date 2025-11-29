export type GlobalSearchQuery = {
  raw: string
  keyword?: string
  coordinates?: { lat: number; lng: number }
  acquiringInstitution?: string
  dateRange?: { from?: string; to?: string }
}

const normalizeDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

const tryParseCoordinates = (input: string) => {
  const coordMatch = input.trim().match(/(-?\\d{1,3}\\.\\d+)\\s*,\\s*(-?\\d{1,3}\\.\\d+)/)
  if (!coordMatch) return undefined
  const lat = Number(coordMatch[1])
  const lng = Number(coordMatch[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  return { lat, lng }
}

export const parseSearchInput = (raw: string): GlobalSearchQuery => {
  const trimmed = raw?.trim() || ''
  const result: GlobalSearchQuery = { raw: trimmed }

  if (!trimmed) {
    return result
  }

  // 经纬度优先识别
  const coords = tryParseCoordinates(trimmed)
  if (coords) {
    result.coordinates = coords
  }

  const tokens = trimmed.split(/\\s+/)
  const keywordParts: string[] = []

  tokens.forEach((token) => {
    const [rawKey, ...rawRest] = token.split(':')
    const key = rawKey?.toLowerCase()
    const value = rawRest.join(':')

    // key:value 模式解析
    if (rawRest.length > 0) {
      switch (key) {
        case 'acq':
        case 'inst':
        case '收单':
        case '收单机构':
          if (value) result.acquiringInstitution = value
          return
        case 'added':
        case 'date':
        case 'time':
        case '添加':
        case '日期': {
          if (!value) return
          if (value.includes('..')) {
            const [from, to] = value.split('..')
            result.dateRange = {
              from: normalizeDate(from),
              to: normalizeDate(to),
            }
          } else {
            const normalized = normalizeDate(value)
            if (normalized) {
              result.dateRange = { from: normalized }
            }
          }
          return
        }
        default:
          keywordParts.push(token)
          return
      }
    }

    // 非 key:value 视为关键词
    keywordParts.push(token)
  })

  const keyword = keywordParts.join(' ').trim()
  if (keyword) {
    result.keyword = keyword
  }

  return result
}
