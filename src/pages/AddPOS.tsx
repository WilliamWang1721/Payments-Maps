import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Smartphone, Settings, FileText, Link, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { usePermissions } from '@/hooks/usePermissions'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import MultiSelect from '@/components/ui/MultiSelect'
import { CARD_NETWORKS, CardNetwork, getCardNetworkLabel } from '@/lib/cardNetworks'

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
    supported_card_networks?: string[]
    checkout_location?: '自助收银' | '人工收银'
  }
  extended_fields: Record<string, any>
  remarks?: string
  custom_links?: Array<{ title: string; url: string; platform: string }>
}

const AddPOS = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addPOSMachine } = useMapStore()
  const permissions = usePermissions()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [formData, setFormData] = useState<FormData>({
    merchant_name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    basic_info: {
      supports_apple_pay: false,
      supports_google_pay: false,
      supports_foreign_cards: false,
      supports_contactless: false,
      supported_card_networks: [],
    },
    extended_fields: {},
    remarks: '',
    custom_links: [],
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    if (!permissions.isLoading && !permissions.canAdd) {
      toast.error('您没有权限添加POS机')
      navigate('/')
      return
    }
    
    return () => {
      if (mapInstanceRef.current) {
        console.log('Destroying map instance on component unmount.')
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [user, navigate, permissions.isLoading, permissions.canAdd])

  useEffect(() => {
    let isCancelled = false
    let map: any = null

    const initMap = async () => {
      if (!mapContainerRef.current || isCancelled) {
        return
      }

      try {
        const AMap = await loadAMap()
        if (isCancelled) return

        map = new AMap.Map(mapContainerRef.current, {
          ...DEFAULT_MAP_CONFIG,
          zoom: 15,
        })
        mapInstanceRef.current = map

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar())

        map.on('click', (e: any) => {
          updateLocation(e.lnglat.getLng(), e.lnglat.getLat())
        })

        const location = await locationUtils.getCurrentPosition()
        if (!isCancelled) {
          map.setCenter([location.longitude, location.latitude])
          updateLocation(location.longitude, location.latitude)
        }
      } catch (error) {
        console.error('Map initialization failed:', error)
        toast.error('地图加载失败，请刷新页面重试')
      } finally {
        if (!isCancelled) {
          setMapLoading(false)
        }
      }
    }

    const timerId = setTimeout(initMap, 150)

    return () => {
      isCancelled = true
      clearTimeout(timerId)
      if (mapInstanceRef.current) {
        console.log('Destroying map instance on effect cleanup.')
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const updateLocation = (lng: number, lat: number) => {
    if (!mapInstanceRef.current) return
    const AMap = window.AMap

    if (markerRef.current) {
      mapInstanceRef.current.remove(markerRef.current)
    }

    markerRef.current = new AMap.Marker({
      position: [lng, lat],
      draggable: true,
    })

    markerRef.current.on('dragend', (e: any) => {
      const currentPos = e.lnglat
      updateFormLocation(currentPos.getLng(), currentPos.getLat())
    })

    mapInstanceRef.current.add(markerRef.current)
    updateFormLocation(lng, lat)
  }

  const updateFormLocation = async (lng: number, lat: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }))

    // 先设置一个加载状态的地址
    setFormData(prev => ({ ...prev, address: '正在获取地址...' }))

    try {
      const address = await locationUtils.getAddress(lng, lat)
      setFormData(prev => ({ ...prev, address }))
    } catch (error) {
      console.warn('Failed to get address:', error)
      // 重试一次
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
        const address = await locationUtils.getAddress(lng, lat)
        setFormData(prev => ({ ...prev, address }))
      } catch (retryError) {
        console.error('Retry failed:', retryError)
        // 最终回退到经纬度显示，但提示用户可以手动输入
        const fallbackAddress = `位置: ${lat.toFixed(6)}, ${lng.toFixed(6)} (请手动输入详细地址)`
        setFormData(prev => ({ ...prev, address: fallbackAddress }))
        toast.error('地址解析失败，请手动输入详细地址')
      }
    }
  }

  const handleInputChange = (field: string, value: any) => {
    const [mainKey, subKey] = field.split('.')

    if (subKey) {
      setFormData(prev => ({
        ...prev,
        [mainKey]: {
          ...(prev as any)[mainKey],
          [subKey]: value,
        },
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const addCustomLink = () => {
    setFormData(prev => ({
      ...prev,
      custom_links: [...(prev.custom_links || []), { title: '', url: '', platform: 'other' }]
    }))
  }

  const removeCustomLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      custom_links: prev.custom_links?.filter((_, i) => i !== index) || []
    }))
  }

  const updateCustomLink = (index: number, field: 'title' | 'url' | 'platform', value: string) => {
    setFormData(prev => ({
      ...prev,
      custom_links: prev.custom_links?.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      ) || []
    }))
  }

  const validateForm = () => {
    if (!formData.merchant_name.trim() || !formData.address.trim()) {
      toast.error('请填写所有必填字段')
      return false
    }
    if (formData.latitude === 0 || formData.longitude === 0) {
      toast.error('请在地图上选择位置')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      await addPOSMachine({
        ...formData,
        status: 'active',
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

  return (
    <div className="h-full flex flex-col bg-gray-50" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div className="bg-white p-4 shadow-sm border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">添加POS机</h1>
          </div>
          <Button onClick={handleSubmit} loading={loading} disabled={loading}>
            保存
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card>
          <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="商户名称 *"
              value={formData.merchant_name}
              onChange={e => handleInputChange('merchant_name', e.target.value)}
              placeholder="请输入商户名称"
            />
            <Input
              label="地址 *"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              placeholder="请在地图上选择位置或手动输入地址"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>位置选择</CardTitle>
            <p className="text-sm text-gray-600">点击地图选择POS机位置，可拖拽标记调整</p>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64 rounded-lg relative">
              {mapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
                  <Loading text="正在加载地图..." />
                </div>
              )}
              <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* 卡组织支持和Contactless支持并行布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 卡组织支持 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>卡组织支持</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">支持的卡组织</label>
                <MultiSelect
                  options={CARD_NETWORKS.map(network => ({
                    value: network.value,
                    label: getCardNetworkLabel(network.value)
                  }))}
                  value={formData.basic_info.supported_card_networks || []}
                  onChange={(value) => handleInputChange('basic_info.supported_card_networks', value)}
                  placeholder="选择支持的卡组织"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contactless 支持 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-green-600" />
                <span>Contactless 支持</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={!!formData.basic_info.supports_apple_pay} 
                    onChange={e => handleInputChange('basic_info.supports_apple_pay', e.target.checked)} 
                    className="rounded border-gray-300" 
                  />
                  <span className="text-sm">支持 Apple Pay</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={!!formData.basic_info.supports_google_pay} 
                    onChange={e => handleInputChange('basic_info.supports_google_pay', e.target.checked)} 
                    className="rounded border-gray-300" 
                  />
                  <span className="text-sm">支持 Google Pay</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={!!formData.basic_info.supports_contactless} 
                    onChange={e => handleInputChange('basic_info.supports_contactless', e.target.checked)} 
                    className="rounded border-gray-300" 
                  />
                  <span className="text-sm">支持闪付</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 设备支持 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <span>设备支持</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="POS机型号"
                value={formData.basic_info.model || ''}
                onChange={e => handleInputChange('basic_info.model', e.target.value)}
                placeholder="请输入POS机型号"
              />
              <Input
                label="收单机构"
                value={formData.basic_info.acquiring_institution || ''}
                onChange={e => handleInputChange('basic_info.acquiring_institution', e.target.value)}
                placeholder="请输入收单机构"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">结账地点</label>
              <select
                value={formData.basic_info.checkout_location || ''}
                onChange={e => handleInputChange('basic_info.checkout_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择结账地点</option>
                <option value="自助收银">自助收银</option>
                <option value="人工收银">人工收银</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 备注 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>备注</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              value={formData.remarks || ''}
                    onChange={e => handleInputChange('remarks', e.target.value)}
              placeholder="请输入备注信息（可选）"
            />
          </CardContent>
        </Card>

        {/* 自定义链接 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="w-5 h-5 text-indigo-600" />
              <span>自定义链接</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formData.custom_links?.map((link, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="链接标题"
                      value={link.title}
                      onChange={e => updateCustomLink(index, 'title', e.target.value)}
                      placeholder="例如：小红书推荐"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label="链接地址"
                      value={link.url}
                      onChange={e => updateCustomLink(index, 'url', e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomLink(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomLink}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>添加链接</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AddPOS