import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
// import { supabase } from '@/lib/supabase' // 移除数据库依赖
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'

interface FieldConfig {
  id: string
  field_name: string
  field_type: 'text' | 'number' | 'boolean' | 'select'
  is_required: boolean
  options?: string[]
  display_order: number
}

interface POSMachine {
  id: string
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
  created_by: string
}

const EditPOS = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posMachines, updatePOSMachine, deletePOSMachine } = useMapStore()
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [formData, setFormData] = useState<POSMachine | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    if (id) {
      loadPOSData()
      loadFieldConfigs()
      initMap()
    }
  }, [user, id, navigate])

  const loadPOSData = async () => {
    try {
      // 从useMapStore中查找POS机数据，移除数据库依赖
      const foundPOS = posMachines.find(pos => pos.id === id)
      
      if (foundPOS) {
        // 检查权限
        if (foundPOS.created_by !== user?.id) {
          toast.error('您没有权限编辑此POS机')
          navigate(-1)
          return
        }
        
        setFormData(foundPOS as POSMachine)
      } else {
        toast.error('POS机不存在')
        navigate(-1)
      }
    } catch (error) {
      console.error('加载POS机数据失败:', error)
      toast.error('加载失败，请重试')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const loadFieldConfigs = async () => {
    try {
      // 使用模拟字段配置数据，移除数据库依赖
      const mockFieldConfigs: FieldConfig[] = [
        {
          id: '1',
          field_name: 'supports_apple_pay',
          field_type: 'boolean',
          is_required: false,
          display_order: 1
        },
        {
          id: '2',
          field_name: 'supports_google_pay',
          field_type: 'boolean',
          is_required: false,
          display_order: 2
        },
        {
          id: '3',
          field_name: 'supports_foreign_cards',
          field_type: 'boolean',
          is_required: false,
          display_order: 3
        },
        {
          id: '4',
          field_name: 'supports_contactless',
          field_type: 'boolean',
          is_required: false,
          display_order: 4
        }
      ]
      setFieldConfigs(mockFieldConfigs)
    } catch (error) {
      console.error('加载字段配置失败:', error)
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
      
    } catch (error) {
      console.error('地图初始化失败:', error)
      toast.error('地图加载失败')
    } finally {
      setMapLoading(false)
    }
  }

  // 当formData加载完成且地图初始化完成时，显示现有位置
  useEffect(() => {
    if (formData && mapInstance && !marker) {
      updateLocation(formData.longitude, formData.latitude)
      mapInstance.setCenter([formData.longitude, formData.latitude])
    }
  }, [formData, mapInstance])

  const updateLocation = async (lng: number, lat: number) => {
    if (!mapInstance || !window.AMap || !formData) return
    
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
    if (!formData) return
    
    setFormData(prev => prev ? {
      ...prev,
      latitude: lat,
      longitude: lng
    } : null)
    
    // 逆地理编码获取地址
    try {
      // 使用高德地图API进行逆地理编码
      const address = `经度: ${lng.toFixed(6)}, 纬度: ${lat.toFixed(6)}`
      setFormData(prev => prev ? {
        ...prev,
        address: address
      } : null)
    } catch (error) {
      console.warn('获取地址失败:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (!formData) return
    
    if (field.startsWith('basic_info.')) {
      const basicField = field.replace('basic_info.', '')
      setFormData(prev => prev ? {
        ...prev,
        basic_info: {
          ...prev.basic_info,
          [basicField]: value
        }
      } : null)
    } else if (field.startsWith('extended_fields.')) {
      const extendedField = field.replace('extended_fields.', '')
      setFormData(prev => prev ? {
        ...prev,
        extended_fields: {
          ...prev.extended_fields,
          [extendedField]: value
        }
      } : null)
    } else {
      setFormData(prev => prev ? {
        ...prev,
        [field]: value
      } : null)
    }
  }

  const validateForm = () => {
    if (!formData) return false
    
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

  const handleSave = async () => {
    if (!validateForm() || !formData || !id) return
    
    setSaving(true)
    try {
      // 使用useMapStore的updatePOSMachine方法，移除数据库依赖
      const updatedData = {
        ...formData,
        name: formData.name,
        merchant_name: formData.merchant_name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        basic_info: formData.basic_info,
        extended_fields: formData.extended_fields,
        updated_at: new Date().toISOString()
      }
      
      await updatePOSMachine(id, updatedData)
      
      toast.success('POS机信息更新成功！')
      navigate(`/pos/${id}`)
    } catch (error) {
      console.error('更新POS机失败:', error)
      toast.error('更新失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    
    setDeleting(true)
    try {
      // 使用useMapStore的deletePOSMachine方法，移除数据库依赖
      await deletePOSMachine(id)
      
      toast.success('POS机删除成功')
      navigate('/map')
    } catch (error) {
      console.error('删除POS机失败:', error)
      toast.error('删除失败，请重试')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const renderCustomField = (config: FieldConfig) => {
    if (!formData) return null
    
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading size="lg" text="正在加载..." />
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">POS机不存在</h3>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
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
            <h1 className="text-lg font-semibold">编辑POS机</h1>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
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
                checked={formData.basic_info?.supports_apple_pay || false}
                onChange={(e) => handleInputChange('basic_info.supports_apple_pay', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持 Apple Pay</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info?.supports_google_pay || false}
                onChange={(e) => handleInputChange('basic_info.supports_google_pay', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持 Google Pay</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info?.supports_foreign_cards || false}
                onChange={(e) => handleInputChange('basic_info.supports_foreign_cards', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">支持外卡</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.basic_info?.supports_contactless || false}
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

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            确定要删除这个POS机吗？此操作无法撤销。
          </p>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowDeleteModal(false)}
              variant="outline"
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              loading={deleting}
              variant="danger"
              className="flex-1"
            >
              删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default EditPOS