// 高德地图配置和工具函数

// 检测开发环境
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'

// 高德地图配置
export const AMAP_CONFIG = {
  key: import.meta.env.VITE_AMAP_KEY,
  version: '2.0',
  plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation'],
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JS_CODE,
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
  // 获取当前位置（带重试机制）
  getCurrentPosition: (maxRetries: number = 3): Promise<{ longitude: number; latitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置获取'))
        return
      }

      let retryCount = 0
      
      const attemptGetLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
            })
          },
          (error) => {
            retryCount++
            console.warn(`位置获取失败 (尝试 ${retryCount}/${maxRetries}):`, error.message)
            
            if (retryCount < maxRetries) {
              // 等待2秒后重试
              setTimeout(() => {
                attemptGetLocation()
              }, 2000)
            } else {
              reject(new Error(`位置获取失败: ${error.message}`))
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // 增加到30秒
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
}

// API错误处理函数
const handleApiError = (error: any): Error => {
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
  
  return new Error(`地图加载失败: ${errorMessage}`)
}

// 地图加载器
export const loadAMap = (): Promise<typeof AMap> => {
  return new Promise((resolve, reject) => {
    console.log('开始加载高德地图...')
    console.log('API配置:', {
      key: AMAP_CONFIG.key ? `${AMAP_CONFIG.key.substring(0, 8)}...` : '未设置',
      version: AMAP_CONFIG.version,
      plugins: AMAP_CONFIG.plugins,
      securityJsCode: AMAP_CONFIG.securityJsCode ? `${AMAP_CONFIG.securityJsCode.substring(0, 8)}...` : '未设置',
      isDevelopment: AMAP_CONFIG.isDevelopment
    })
    
    if (window.AMap) {
      console.log('高德地图已加载，直接返回')
      resolve(window.AMap)
      return
    }

    // 检查API密钥
    if (!AMAP_CONFIG.key) {
      const error = new Error('高德地图API密钥未配置，请在环境变量中设置VITE_AMAP_KEY')
      console.error(error)
      reject(error)
      return
    }
    
    // 开发环境提示
    if (AMAP_CONFIG.isDevelopment) {
      console.log('当前为开发环境，如遇到域名白名单问题，请在高德地图控制台添加localhost到白名单')
    }

    // 设置安全密钥（必须在脚本加载之前设置）
    if (AMAP_CONFIG.securityJsCode) {
      window._AMapSecurityConfig = {
        securityJsCode: AMAP_CONFIG.securityJsCode,
      }
      console.log('安全密钥已设置')
    } else {
      console.warn('安全密钥未设置，可能影响地图加载')
    }

    // 创建全局回调函数
    const callbackName = 'amapInitCallback_' + Date.now()
    ;(window as any)[callbackName] = () => {
      console.log('高德地图回调函数执行')
      if (window.AMap) {
        console.log('高德地图API可用')
      // 清理回调函数
      clearTimeout(timeoutId)
      delete (window as any)[callbackName]
      resolve(window.AMap)
      } else {
        clearTimeout(timeoutId)
        const error = handleApiError('高德地图加载失败：window.AMap未定义')
        console.error(error)
        delete (window as any)[callbackName]
        reject(error)
      }
    }

    const script = document.createElement('script')
    
    // 超时处理，15 秒未回调则判定失败
    const timeoutId = setTimeout(() => {
      const error = handleApiError('高德地图加载超时，请检查网络或 API 配置')
      console.error(error)
      delete (window as any)[callbackName]
      reject(error)
    }, 15000)
    
    // 添加callback参数来解决USERKEY_PLAT_NOMATCH问题
    const scriptUrl = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=${AMAP_CONFIG.plugins.join(',')}&callback=${callbackName}`
    console.log('加载脚本URL:', scriptUrl)
    
    script.src = scriptUrl
    script.async = true
    script.onerror = (event) => {
      clearTimeout(timeoutId);
      const error = handleApiError('高德地图脚本加载失败，可能是网络问题或API配置错误')
      console.error('脚本加载错误:', event)
      // 清理回调函数
      delete (window as any)[callbackName]
      reject(error)
    }
    

    
    document.head.appendChild(script)
  })
}

// 扩展全局类型
declare global {
  interface Window {
    AMap: typeof AMap
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
}