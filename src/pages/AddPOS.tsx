import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
// import { supabase } from '@/lib/supabase' // 移除数据库依赖
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface FieldConfig {
  id: string
  field_name: string
  field_type: 'text' | 'number' | 'boolean' | 'select'
  is_required: boolean
  options?: string[]
  display_order: number
}

interface LocationValue {
  lng: number
  lat: number
  address?: string
}

interface FormData {
  name: string
  merchant_name: string
  address: string
  latitude: number
  longitude: number
  basic_info: {
    model?: string
    acquiring_institution?: string
    supports_foreign_cards?: boolean
    supports_apple_pay?: boolean
    supports_google_pay?: boolean
    supports_contactless?: boolean
    min_amount_no_pin?: number
  }
  extended_fields: Record<string, any>
}

const AddPOS = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addPOSMachine } = useMapStore()
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [formData, setFormData] = useState<FormData>({
    name: '',
    merchant_name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    basic_info: {
      supports_apple_pay: false,
      supports_google_pay: false,
      supports_foreign_cards: false,
      supports_contactless: false,
    },
    extended_fields: {},
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    loadFieldConfigs()
    initMap()
  }, [user, navigate])

  const loadFieldConfigs = async () => {
    try {
      // 使用模拟字段配置数据，移除数据库依赖
      const mockFieldConfigs = [
        {
          id: '1',
          field_key: 'supports_apple_pay',
          field_name: '支持Apple Pay',
          field_type: 'boolean' as const,
          category: 'payment' as const,
          required: false,
          is_required: false,
          display_order: 1,
          is_active: true
        },
        {
          id: '2',
          field_key: 'supports_google_pay',
          field_name: '支持Google Pay',
          field_type: 'boolean' as const,
          category: 'payment' as const,
          required: false,
          is_required: false,
          display_order: 2,
          is_active: true
        },
        {
          id: '3',
          field_key: 'supports_foreign_cards',
          field_name: '支持外卡',
          field_type: 'boolean' as const,
          category: 'payment' as const,
          required: false,
          is_required: false,
          display_order: 3,
          is_active: true
        },
        {
          id: '4',
          field_key: 'supports_contactless',
          field_name: '支持非接触支付',
          field_type: 'boolean' as const,
          category: 'payment' as const,
          required: false,
          is_required: false,
          display_order: 4,
          is_active: true
        }
      ]
      
      setFieldConfigs(mockFieldConfigs)
      
      // 初始化自定义字段的默认值
      const initialCustomFields: Record<string, any> = {}
      mockFieldConfigs.forEach((config) => {
        if (config.field_type === 'boolean') {
          initialCustomFields[config.field_name] = false
        } else {
          initialCustomFields[config.field_name] = ''
        }
      })
      
      setFormData(prev => ({
        ...prev,
        extended_fields: initialCustomFields
      }))
    } catch (error) {
      console.error('加载字段配置失败:', error)
      toast.error('加载字段配置失败')
    }
  }

  const initMap = async () => {
    try {
      if (!mapRef.current) return
      
      const AMap = await loadAMap()
      
      const map = new AMap.Map(mapRef.current, {
        ...DEFAULT_MAP_CONFIG,
        zoom: 15,
      } as any)
      
      setMapInstance(map)
      
      // 添加地图控件
      const scale = new (window.AMap as any).Scale()
      const toolbar = new (window.AMap as any).ToolBar()
      map.addControl(scale)
      map.addControl(toolbar)
      
      // 地图点击事件
      map.on('click', (e: any) => {
        const { lng, lat } = e.lnglat
        updateLocation(lng, lat)
      })
      
      // 尝试获取当前位置
      try {
        const location = await locationUtils.getCurrentPosition()
        updateLocation(location.longitude, location.latitude)
        map.setCenter([location.longitude, location.latitude])
      } catch (error) {
        console.warn('获取当前位置失败，使用默认位置')
      }
      
    } catch (error) {
      console.error('地图初始化失败:', error)
      toast.error('地图加载失败')
    } finally {
      setMapLoading(false)
    }
  }

  const updateLocation = async (lng: number, lat: number) => {
    if (!mapInstance || !window.AMap) return
    
    // 移除旧标记
    if (marker) {
      mapInstance.remove(marker)
    }
    
    // 添加新标记
    const newMarker = new window.AMap.Marker({
      position: [lng, lat],
      draggable: true,
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(32, 32),
        image: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#EF4444" stroke="white" stroke-width="2"/>
            <path d="M16 8L20 12H18V20H14V12H12L16 8Z" fill="white"/>
          </svg>
        `),
        imageSize: new window.AMap.Size(32, 32),
      }),
    })
    
    // 标记拖拽事件
    newMarker.on('dragend', (e: any) => {
      const { lng, lat } = e.lnglat
      updateFormLocation(lng, lat)
    })
    
    mapInstance.add(newMarker)
    setMarker(newMarker)
    
    // 更新表单数据
    updateFormLocation(lng, lat)
  }

  const updateFormLocation = async (lng: number, lat: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))
    
    // 逆地理编码获取地址
    try {
      // 使用高德地图API进行逆地理编码
      const address = `经度: ${lng.toFixed(6)}, 纬度: ${lat.toFixed(6)}`
      setFormData(prev => ({
        ...prev,
        address: address
      }))
    } catch (error) {
      console.warn('获取地址失败:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('basic_info.')) {
      const basicField = field.replace('basic_info.', '')
      setFormData(prev => ({
        ...prev,
        basic_info: {
          ...prev.basic_info,
          [basicField]: value
        }
      }))
    } else if (field.startsWith('extended_fields.')) {
      const customField = field.replace('extended_fields.', '')
      setFormData(prev => ({
        ...prev,
        extended_fields: {
          ...prev.extended_fields,
          [customField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('请填写POS机名称')
      return false
    }
    
    if (!formData.merchant_name.trim()) {
      toast.error('请填写商户名称')
      return false
    }
    
    if (!formData.address.trim()) {
      toast.error('请选择位置')
      return false
    }
    
    if (formData.latitude === 0 || formData.longitude === 0) {
      toast.error('请在地图上选择位置')
      return false
    }
    
    // 验证必填的自定义字段
    for (const config of fieldConfigs) {
      if (config.is_required) {
        const value = formData.extended_fields[config.field_name]
        if (config.field_type === 'boolean') {
          // 布尔类型不需要验证
          continue
        }
        if (!value || (typeof value === 'string' && !value.trim())) {
          toast.error(`请填写${config.field_name}`)
          return false
        }
      }
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    setLoading(true)
    try {
      // 使用useMapStore的addPOSMachine方法，已移除数据库依赖
      await addPOSMachine({
        ...formData,
        created_by: user!.id,
        status: 'active'
      })
      
      toast.success('POS机添加成功！')
      navigate('/map')
    } catch (error) {
      console.error('添加POS机失败:', error)
      toast.error('添加失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const renderCustomField = (config: FieldConfig) => {
    const value = formData.extended_fields[config.field_name]
    
    switch (config.field_type) {
      case 'text':
        return (
          <Input
            key={config.id}
            label={config.field_name + (config.is_required ? ' *' : '')}
            value={value || ''}
            onChange={(e) => handleInputChange(`extended_fields.${config.field_name}`, e.target.value)}
            placeholder={`请输入${config.field_name}`}
          />
        )
      
      case 'number':
        return (
          <Input
            key={config.id}
            label={config.field_name + (config.is_required ? ' *' : '')}
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(`extended_fields.${config.field_name}`, parseFloat(e.target.value) || 0)}
            placeholder={`请输入${config.field_name}`}
          />
        )
      
      case 'boolean':
        return (
          <div key={config.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {config.field_name + (config.is_required ? ' *' : '')}
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleInputChange(`extended_fields.${config.field_name}`, e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">是</span>
            </label>
          </div>
        )
      
      case 'select':
        return (
          <div key={config.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {config.field_name + (config.is_required ? ' *' : '')}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(`extended_fields.${config.field_name}`, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择</option>
              {config.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      {/* 头部 */}
      <div className="bg-white p-4 shadow-sm border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">添加POS机</h1>
          </div>
          
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            保存
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="POS机名称 *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入POS机名称"
            />
            
            <Input
              label="商户名称 *"
              value={formData.merchant_name}
              onChange={(e) => handleInputChange('merchant_name', e.target.value)}
              placeholder="请输入商户名称"
            />
            
            <Input
              label="地址 *"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="请在地图上选择位置或手动输入地址"
            />
          </CardContent>
        </Card>

        {/* 位置选择 */}
        <Card>
          <CardHeader>
            <CardTitle>位置选择</CardTitle>
            <p className="text-sm text-gray-600">点击地图选择POS机位置，可拖拽标记调整</p>
          </CardHeader>
          <CardContent>
            {mapLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loading text="正在加载地图..." />
              </div>
            ) : (
              <div ref={mapRef} className="w-full h-64 rounded-lg" />
            )}
          </CardContent>
        </Card>

        {/* 支付信息 */}
        <Card>
          <CardHeader>
            <CardTitle>支付信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info.supports_apple_pay}
                onChange={(e) => handleInputChange('basic_info.supports_apple_pay', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持 Apple Pay</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info.supports_google_pay}
                onChange={(e) => handleInputChange('basic_info.supports_google_pay', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持 Google Pay</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info.supports_foreign_cards}
                onChange={(e) => handleInputChange('basic_info.supports_foreign_cards', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持外卡</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info.supports_contactless}
                onChange={(e) => handleInputChange('basic_info.supports_contactless', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持闪付</span>
            </label>
          </CardContent>
        </Card>

        {/* 自定义字段 */}
        {fieldConfigs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>其他信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fieldConfigs.map(renderCustomField)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AddPOS