// 高德地图配置和工具函数

// 检测开发环境
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'

const normalizeEnvValue = (
  value: unknown,
  options: { stripAllWhitespace?: boolean } = {}
): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed
  const normalized = options.stripAllWhitespace ? unquoted.replace(/\s+/g, '') : unquoted
  return normalized ? normalized : undefined
}

const amapKey = normalizeEnvValue(import.meta.env.VITE_AMAP_KEY, { stripAllWhitespace: true })

// 兼容旧的环境变量命名（README 曾使用 VITE_AMAP_SECURITY_KEY）
const securityJsCode =
  normalizeEnvValue(import.meta.env.VITE_AMAP_SECURITY_JS_CODE, { stripAllWhitespace: true }) ||
  normalizeEnvValue(import.meta.env.VITE_AMAP_SECURITY_KEY, { stripAllWhitespace: true })

let amapLoadPromise: Promise<any> | null = null
let geocoderPromise: Promise<any> | null = null
let geocoderInstance: any | null = null

// 高德地图配置
export const AMAP_CONFIG = {
  key: amapKey,
  version: '2.0',
  plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation', 'AMap.Geocoder'],
  securityJsCode,
  isDevelopment,
}

// 地图样式配置
export const MAP_STYLES = {
  normal: 'amap://styles/normal',
  dark: 'amap://styles/dark',
  light: 'amap://styles/light',
  satellite: 'amap://styles/satellite',
}

// 默认地图配置
export const DEFAULT_MAP_CONFIG = {
  zoom: 15,
  center: [116.397428, 39.90923] as [number, number], // 北京天安门
  mapStyle: MAP_STYLES.normal,
  showIndoorMap: false,
  resizeEnable: true,
  rotateEnable: true,
  pitchEnable: true,
  zoomEnable: true,
  dragEnable: true,
}

// 地理位置工具函数
export const locationUtils = {
  // 获取当前位置（带重试机制和默认位置）
  getCurrentPosition: (maxRetries: number = 3): Promise<{ longitude: number; latitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('Browser does not support geolocation, using default location / 浏览器不支持地理位置获取，使用默认位置')
        // 使用北京市中心作为默认位置 / Use Beijing center as default
        resolve({
          longitude: 116.397428,
          latitude: 39.90923
        })
        return
      }

      let retryCount = 0

      const attemptGetLocation = () => {
        console.log(`Getting location (attempt ${retryCount + 1}/${maxRetries}) / 开始获取位置 (尝试 ${retryCount + 1}/${maxRetries})`)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location obtained successfully / 位置获取成功:', {
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
              accuracy: position.coords.accuracy
            })
            resolve({
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
            })
          },
          (error) => {
            retryCount++
            const errorDetails = {
              code: error.code,
              message: error.message,
              attempt: retryCount,
              maxRetries
            }
            console.warn('Location acquisition failed / 位置获取失败:', errorDetails)

            if (retryCount < maxRetries) {
              console.log(`Retrying in 1 second / 将在1秒后重试 (${retryCount}/${maxRetries})`)
              // 减少重试间隔时间到1秒
              setTimeout(() => {
                attemptGetLocation()
              }, 1000)
            } else {
              console.error('All retries failed, using default location / 所有重试均失败，使用默认位置')
              // 提供默认位置而不是拒绝 / Provide default location instead of rejecting
              resolve({
                longitude: 116.397428, // 北京市中心 / Beijing center
                latitude: 39.90923
              })
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000, // 减少到10秒
            maximumAge: 60000,
          }
        )
      }
      
      attemptGetLocation()
    })
  },

  // 计算两点间距离（米）
  calculateDistance: (
    point1: { longitude: number; latitude: number },
    point2: { longitude: number; latitude: number }
  ): number => {
    const R = 6371e3 // 地球半径（米）
    const φ1 = (point1.latitude * Math.PI) / 180
    const φ2 = (point2.latitude * Math.PI) / 180
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  },

  // 格式化距离显示
  formatDistance: (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`
    }
    return `${(distance / 1000).toFixed(1)}km`
  },

  // 根据经纬度获取地址信息
  getAddress: async (longitude: number, latitude: number): Promise<string> => {
    try {
      const geocoder = await loadGeocoder()
      const address = await new Promise<string>((resolve, reject) => {
        geocoder.getAddress([longitude, latitude], (status: string, result: any) => {
          if (status === 'complete' && result?.info === 'OK') {
            const resolved = formatRegeocodeAddress(result.regeocode)
            resolve(resolved || '地址解析成功，但无详细信息')
            return
          }

          console.warn('[amap] 地址解析状态异常:', status, result)
          const hint = [result?.info, result?.infocode, status].filter(Boolean).join(' ') || '未知错误'
          reject(handleApiError(hint, 'address'))
        })
      })

      if (!address || address === '地址解析成功，但无详细信息') {
        const restAddress = await fetchAddressByRestApi(longitude, latitude)
        if (restAddress) return restAddress
      }

      return address
    } catch (error) {
      const restAddress = await fetchAddressByRestApi(longitude, latitude)
      if (restAddress) return restAddress
      console.error('获取地址失败:', error)
      throw error // 抛出错误而不是返回字符串
    }
  },
}

// API错误处理函数
const handleApiError = (error: any, context: 'map' | 'address' = 'map'): Error => {
  const errorMessage = error?.message || error?.toString() || '未知错误'
  
  if (errorMessage.includes('USERKEY_PLAT_NOMATCH')) {
    return new Error('API配置错误: 域名白名单配置不匹配。请在高德地图控制台添加当前域名到白名单中。')
  }
  
  if (errorMessage.includes('INVALID_USER_KEY')) {
    return new Error('API配置错误: API密钥无效，请检查密钥是否正确。')
  }
  
  if (errorMessage.includes('DAILY_QUERY_OVER_LIMIT')) {
    return new Error('API配置错误: 今日调用量已超限，请升级套餐或明日再试。')
  }
  
  if (errorMessage.includes('USER_KEY_RECYCLED')) {
    return new Error('API配置错误: API密钥已被回收，请重新申请。')
  }

  if (errorMessage.includes('INVALID_USER_SCODE')) {
    return new Error(
      'API配置错误: 安全密钥无效或未配置。请检查 VITE_AMAP_SECURITY_JS_CODE（或旧版 VITE_AMAP_SECURITY_KEY）是否正确，并确认高德控制台已开启安全密钥。'
    )
  }

  if (context === 'address' && errorMessage.trim().toLowerCase() === 'error') {
    return new Error(
      '地址解析失败: error（高德服务返回 error，通常是安全密钥/域名白名单/服务权限配置问题；请先检查 VITE_AMAP_SECURITY_JS_CODE 是否包含多余空格或换行）'
    )
  }
  
  if (context === 'address') {
    return new Error(`地址解析失败: ${errorMessage}`)
  }
  return new Error(`地图加载失败: ${errorMessage}`)
}

const loadGeocoder = async (): Promise<any> => {
  if (geocoderInstance) return geocoderInstance
  if (geocoderPromise) return geocoderPromise

  geocoderPromise = new Promise((resolve, reject) => {
    loadAMap()
      .then((AMap) => {
        AMap.plugin('AMap.Geocoder', () => {
          try {
            if (!AMap.Geocoder) {
              reject(new Error('Geocoder插件加载失败: AMap.Geocoder 未定义'))
              return
            }
            geocoderInstance = new AMap.Geocoder({
              radius: 1000,
              extensions: 'all',
            })
            resolve(geocoderInstance)
          } catch (pluginError) {
            reject(pluginError)
          }
        })
      })
      .catch(reject)
  }).catch((error) => {
    geocoderPromise = null
    geocoderInstance = null
    throw error
  })

  return geocoderPromise
}

const formatRegeocodeAddress = (regeocode: any): string => {
  if (!regeocode) return ''

  const addressComponent = regeocode.addressComponent
  const formattedAddress = regeocode.formattedAddress || ''

  const normalizeLandmarkName = (value: unknown): string => {
    if (typeof value !== 'string') return ''
    return value.trim()
  }

  const pickNearestLandmark = (): { name: string; distance?: number } | null => {
    const poi = Array.isArray(regeocode.pois) ? regeocode.pois[0] : null
    const aoi = Array.isArray(regeocode.aois) ? regeocode.aois[0] : null

    const poiName = normalizeLandmarkName(poi?.name)
    const aoiName = normalizeLandmarkName(aoi?.name)

    if (poiName) {
      const distance = Number(poi?.distance)
      return Number.isFinite(distance) ? { name: poiName, distance } : { name: poiName }
    }
    if (aoiName) {
      const distance = Number(aoi?.distance)
      return Number.isFinite(distance) ? { name: aoiName, distance } : { name: aoiName }
    }
    return null
  }

  if (addressComponent) {
    const asText = (value: unknown): string => {
      if (Array.isArray(value)) return value.join('')
      if (typeof value === 'string') return value
      return ''
    }

    const province = asText(addressComponent.province)
    const city = asText(addressComponent.city) || province
    const district = asText(addressComponent.district)
    const township = asText(addressComponent.township)
    const street = asText(addressComponent.streetNumber?.street)
    const number = asText(addressComponent.streetNumber?.number)
    const building = asText(addressComponent.building?.name)
    const neighborhood = asText(addressComponent.neighborhood?.name)

    let detailedAddress = ''
    if (province && province !== city) detailedAddress += province
    if (city) detailedAddress += city
    if (district) detailedAddress += district
    if (township) detailedAddress += township
    if (street) detailedAddress += street
    if (number) detailedAddress += number

    // 更精确：补充小区/楼宇信息（如果有）
    const maybeAppend = (value: string) => {
      if (!value) return
      if (detailedAddress.includes(value)) return
      detailedAddress += value
    }
    maybeAppend(neighborhood)
    maybeAppend(building)

    // 选择更“长”的版本（通常更详细）
    const base = [formattedAddress, detailedAddress].reduce((best: string, current: string) => {
      if (!current) return best
      return current.length > best.length ? current : best
    }, '')

    if (!base) return ''

    const landmark = pickNearestLandmark()
    if (!landmark?.name) return base
    if (base.includes(landmark.name)) return base

    const distanceText =
      typeof landmark.distance === 'number' && landmark.distance > 0
        ? `（约${Math.round(landmark.distance)}m）`
        : ''

    return `${base}（附近：${landmark.name}${distanceText}）`
  }

  const base = formattedAddress
  if (!base) return ''
  const landmark = pickNearestLandmark()
  if (!landmark?.name) return base
  if (base.includes(landmark.name)) return base

  const distanceText =
    typeof landmark.distance === 'number' && landmark.distance > 0 ? `（约${Math.round(landmark.distance)}m）` : ''

  return `${base}（附近：${landmark.name}${distanceText}）`
}

const fetchAddressByRestApi = async (longitude: number, latitude: number): Promise<string | null> => {
  if (!AMAP_CONFIG.key) return null

  try {
    const url = new URL('https://restapi.amap.com/v3/geocode/regeo')
    url.searchParams.set('key', AMAP_CONFIG.key)
    url.searchParams.set('location', `${longitude},${latitude}`)
    url.searchParams.set('radius', '1000')
    url.searchParams.set('extensions', 'all')
    url.searchParams.set('output', 'JSON')

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data: any = await response.json()
    if (data?.status !== '1') {
      return null
    }

    const regeocode = data?.regeocode
    if (!regeocode) return null

    const addressComponent = regeocode.addressComponent
    const formattedAddress = regeocode.formatted_address || ''

    if (addressComponent) {
      const province = addressComponent.province || ''
      const city = addressComponent.city || province || ''
      const district = addressComponent.district || ''
      const township = addressComponent.township || ''
      const street = addressComponent.streetNumber?.street || ''
      const number = addressComponent.streetNumber?.number || ''
      const building = addressComponent.building?.name || ''
      const neighborhood = addressComponent.neighborhood?.name || ''

      let detailedAddress = ''
      if (province && province !== city) detailedAddress += province
      if (city) detailedAddress += city
      if (district) detailedAddress += district
      if (township) detailedAddress += township
      if (street) detailedAddress += street
      if (number) detailedAddress += number
      if (neighborhood && !detailedAddress.includes(neighborhood)) detailedAddress += neighborhood
      if (building && !detailedAddress.includes(building)) detailedAddress += building

      const base = [formattedAddress, detailedAddress].reduce((best: string, current: string) => {
        if (!current) return best
        return current.length > best.length ? current : best
      }, '')

      if (!base) return null

      const poi = Array.isArray(regeocode.pois) ? regeocode.pois[0] : null
      const aoi = Array.isArray(regeocode.aois) ? regeocode.aois[0] : null
      const landmarkName =
        (typeof poi?.name === 'string' && poi.name.trim()) ||
        (typeof aoi?.name === 'string' && aoi.name.trim()) ||
        ''

      if (!landmarkName) return base
      if (base.includes(landmarkName)) return base

      const distance = Number(poi?.distance ?? aoi?.distance)
      const distanceText = Number.isFinite(distance) && distance > 0 ? `（约${Math.round(distance)}m）` : ''

      return `${base}（附近：${landmarkName}${distanceText}）`
    }

    if (!formattedAddress) return null
    const poi = Array.isArray(regeocode.pois) ? regeocode.pois[0] : null
    const aoi = Array.isArray(regeocode.aois) ? regeocode.aois[0] : null
    const landmarkName =
      (typeof poi?.name === 'string' && poi.name.trim()) || (typeof aoi?.name === 'string' && aoi.name.trim()) || ''
    if (!landmarkName) return formattedAddress
    if (formattedAddress.includes(landmarkName)) return formattedAddress

    const distance = Number(poi?.distance ?? aoi?.distance)
    const distanceText = Number.isFinite(distance) && distance > 0 ? `（约${Math.round(distance)}m）` : ''

    return `${formattedAddress}（附近：${landmarkName}${distanceText}）`
  } catch (error) {
    console.warn('[amap] REST reverse geocode failed:', error)
    return null
  }
}

// 地图加载器
export const loadAMap = (): Promise<any> => {
  if (window.AMap) {
    console.log('高德地图已加载，直接返回')
    return Promise.resolve(window.AMap)
  }

  if (amapLoadPromise) return amapLoadPromise

  amapLoadPromise = new Promise((resolve, reject) => {
    if (!AMAP_CONFIG.key) {
      const error = new Error('高德地图API密钥未配置 (VITE_AMAP_KEY)')
      console.error(error)
      reject(error)
      return
    }

    if (AMAP_CONFIG.securityJsCode) {
      if (AMAP_CONFIG.securityJsCode.length !== 32) {
        console.warn(
          `[amap] securityJsCode 长度异常（${AMAP_CONFIG.securityJsCode.length}），请检查环境变量是否包含多余字符`
        )
      }
      window._AMapSecurityConfig = {
        securityJsCode: AMAP_CONFIG.securityJsCode,
      }
      console.log('高德地图安全密钥已设置')
    } else {
      console.warn('高德地图安全密钥未设置（VITE_AMAP_SECURITY_JS_CODE），部分功能可能受限')
    }

    const callbackName = 'amapInitCallback_' + Date.now()

    const timeoutId = setTimeout(() => {
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName]
      }
      const error = handleApiError('高德地图加载超时(15s)，请检查网络或API配置')
      console.error(error)
      reject(error)
    }, 15000)

    ;(window as any)[callbackName] = () => {
      clearTimeout(timeoutId)
      delete (window as any)[callbackName]
      if (window.AMap) {
        console.log('高德地图API加载成功')
        resolve(window.AMap)
      } else {
        const error = handleApiError('高德地图加载失败：window.AMap 未定义')
        console.error(error)
        reject(error)
      }
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=${AMAP_CONFIG.plugins.join(',')}&callback=${callbackName}`
    script.async = true
    script.onerror = (event) => {
      clearTimeout(timeoutId)
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName]
      }
      const error = handleApiError('高德地图脚本加载失败，请检查网络连接或CSP策略')
      console.error('Script load error:', event)
      reject(error)
    }

    document.head.appendChild(script)
    console.log('正在加载高德地图API脚本...')
  }).catch((error) => {
    amapLoadPromise = null
    throw error
  })

  return amapLoadPromise
};

// 扩展全局类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
}
