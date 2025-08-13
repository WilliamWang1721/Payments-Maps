// 高德地图配置和工具函数

// 检测开发环境
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'

// 高德地图配置
export const AMAP_CONFIG = {
  key: import.meta.env.VITE_AMAP_KEY,
  version: '2.0',
  plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation', 'AMap.Geocoder'],
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
  // 获取当前位置（带重试机制和默认位置）
  getCurrentPosition: (maxRetries: number = 3): Promise<{ longitude: number; latitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('浏览器不支持地理位置获取，使用默认位置')
        // 使用北京市中心作为默认位置
        resolve({
          longitude: 116.397428,
          latitude: 39.90923
        })
        return
      }

      let retryCount = 0
      
      const attemptGetLocation = () => {
        console.log(`开始获取位置 (尝试 ${retryCount + 1}/${maxRetries})`)
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('位置获取成功:', {
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
            console.warn('位置获取失败详情:', errorDetails)
            
            if (retryCount < maxRetries) {
              console.log(`将在1秒后重试 (${retryCount}/${maxRetries})`)
              // 减少重试间隔时间到1秒
              setTimeout(() => {
                attemptGetLocation()
              }, 1000)
            } else {
              console.error('所有重试均失败，使用默认位置')
              // 提供默认位置而不是拒绝
              resolve({
                longitude: 116.397428, // 北京市中心
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
      // 使用高德地图逆地理编码API
      const AMap = await loadAMap()
      
      return new Promise((resolve, reject) => {
        // 使用 AMap.plugin 显式加载 Geocoder 插件
        AMap.plugin('AMap.Geocoder', () => {
          try {
            const geocoder = new AMap.Geocoder({
              radius: 1000,
              extensions: 'all'
            })
            
            geocoder.getAddress([longitude, latitude], (status: string, result: any) => {
              if (status === 'complete' && result.info === 'OK') {
                const regeocode = result.regeocode
                if (regeocode) {
                  // 优先使用详细地址组合
                  const addressComponent = regeocode.addressComponent
                  if (addressComponent) {
                    const province = addressComponent.province || ''
                    const city = addressComponent.city || addressComponent.province || ''
                    const district = addressComponent.district || ''
                    const township = addressComponent.township || ''
                    const street = addressComponent.streetNumber?.street || ''
                    const number = addressComponent.streetNumber?.number || ''
                    
                    // 构建详细地址
                    let detailedAddress = ''
                    if (province && province !== city) detailedAddress += province
                    if (city) detailedAddress += city
                    if (district) detailedAddress += district
                    if (township) detailedAddress += township
                    if (street) detailedAddress += street
                    if (number) detailedAddress += number
                    
                    if (detailedAddress) {
                      resolve(detailedAddress)
                      return
                    }
                  }
                  
                  // 回退到格式化地址
                  const formattedAddress = regeocode.formattedAddress
                  if (formattedAddress) {
                    resolve(formattedAddress)
                    return
                  }
                }
                
                // 最后回退
                resolve('地址解析成功，但无详细信息')
              } else {
                console.warn('地址解析状态异常:', status, result)
                reject(new Error(`地址解析失败: ${status}`))
              }
            })
          } catch (pluginError) {
            console.error('Geocoder插件初始化失败:', pluginError)
            reject(new Error(`Geocoder插件初始化失败: ${pluginError}`))
          }
        })
      })
    } catch (error) {
      console.error('获取地址失败:', error)
      throw error // 抛出错误而不是返回字符串
    }
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
export const loadAMap = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      console.log('高德地图已加载，直接返回');
      return resolve(window.AMap);
    }

    if (!AMAP_CONFIG.key) {
      const error = new Error('高德地图API密钥未配置 (VITE_AMAP_KEY)');
      console.error(error);
      return reject(error);
    }

    if (AMAP_CONFIG.securityJsCode) {
      window._AMapSecurityConfig = {
        securityJsCode: AMAP_CONFIG.securityJsCode,
      };
      console.log('高德地图安全密钥已设置');
    } else {
      console.warn('高德地图安全密钥未设置，部分功能可能受限');
    }

    const callbackName = 'amapInitCallback_' + Date.now();

    const timeoutId = setTimeout(() => {
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
      const error = handleApiError('高德地图加载超时(15s)，请检查网络或API配置');
      console.error(error);
      reject(error);
    }, 15000);

    (window as any)[callbackName] = () => {
      clearTimeout(timeoutId);
      delete (window as any)[callbackName];
      if (window.AMap) {
        console.log('高德地图API加载成功');
        resolve(window.AMap);
      } else {
        const error = handleApiError('高德地图加载失败：window.AMap 未定义');
        console.error(error);
        reject(error);
      }
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=${AMAP_CONFIG.plugins.join(',')}&callback=${callbackName}`;
    script.async = true;
    script.onerror = (event) => {
      clearTimeout(timeoutId);
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
      const error = handleApiError('高德地图脚本加载失败，请检查网络连接或CSP策略');
      console.error('Script load error:', event);
      reject(error);
    };

    document.head.appendChild(script);
    console.log('正在加载高德地图API脚本...');
  });
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