import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, CreditCard, Smartphone, Settings, FileText, Link, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMapStore } from '@/stores/useMapStore'
import { usePermissions } from '@/hooks/usePermissions'
import { loadAMap, DEFAULT_MAP_CONFIG, locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import MultiSelect from '@/components/ui/MultiSelect'
import { CARD_NETWORKS, CardNetwork, getCardNetworkLabel } from '@/lib/cardNetworks'

interface POSMachine {
  id: string
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
  created_by: string
  updated_at?: string
  remarks?: string
  custom_links?: Array<{ title: string; url: string; platform: string }>
}

const EditPOS = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posMachines, updatePOSMachine, deletePOSMachine } = useMapStore()
  const permissions = usePermissions()
  
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [formData, setFormData] = useState<POSMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  useEffect(() => {
    if (!id) return

    const posData = posMachines.find(p => p.id === id)
    if (posData) {
      if (!permissions.isLoading && !permissions.canEditItem(posData.created_by)) {
        toast.error('您没有权限编辑此POS机')
        navigate('/map')
        return
      }
      setFormData(posData as POSMachine)
    } else {
      toast.error('未找到该POS机信息')
      navigate('/map')
    }
    setLoading(false)
  }, [id, posMachines, user, navigate, permissions.isLoading, permissions.canEditItem])

  useEffect(() => {
    if (!formData) return

    let isCancelled = false

    const initMap = async () => {
      if (!mapContainerRef.current || isCancelled) return

      try {
        const AMap = await loadAMap()
        if (isCancelled) return

        const map = new AMap.Map(mapContainerRef.current, {
          ...DEFAULT_MAP_CONFIG,
          zoom: 16,
          center: [formData.longitude, formData.latitude]
        })
        mapInstanceRef.current = map

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar())

        map.on('click', (e: any) => {
          updateLocation(e.lnglat.getLng(), e.lnglat.getLat())
        })

        // Initial marker
        updateLocation(formData.longitude, formData.latitude)

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
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [formData])

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
    if (!formData) return

    setFormData(prev => prev ? { ...prev, latitude: lat, longitude: lng } : null)

    // 先设置一个加载状态的地址
    setFormData(prev => prev ? { ...prev, address: '正在获取地址...' } : null)

    try {
      const address = await locationUtils.getAddress(lng, lat)
      setFormData(prev => prev ? { ...prev, address } : null)
    } catch (error) {
      console.warn('Failed to get address:', error)
      // 重试一次
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
        const address = await locationUtils.getAddress(lng, lat)
        setFormData(prev => prev ? { ...prev, address } : null)
      } catch (retryError) {
        console.error('Retry failed:', retryError)
        // 最终回退到经纬度显示，但提示用户可以手动输入
        const fallbackAddress = `位置: ${lat.toFixed(6)}, ${lng.toFixed(6)} (请手动输入详细地址)`
        setFormData(prev => prev ? { ...prev, address: fallbackAddress } : null)
        toast.error('地址解析失败，请手动输入详细地址')
      }
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (!formData) return
    const [mainKey, subKey] = field.split('.')

    if (subKey) {
      setFormData(prev => prev ? {
        ...prev,
        [mainKey]: {
          ...(prev as any)[mainKey],
          [subKey]: value,
        },
      } : null)
    } else {
      setFormData(prev => prev ? { ...prev, [field]: value } : null)
    }
  }

  const addCustomLink = () => {
    if (!formData) return
    setFormData(prev => prev ? {
      ...prev,
      custom_links: [...(prev.custom_links || []), { title: '', url: '', platform: 'other' }]
    } : null)
  }

  const removeCustomLink = (index: number) => {
    if (!formData) return
    setFormData(prev => prev ? {
      ...prev,
      custom_links: prev.custom_links?.filter((_, i) => i !== index) || []
    } : null)
  }

  const updateCustomLink = (index: number, field: 'title' | 'url' | 'platform', value: string) => {
    if (!formData) return
    setFormData(prev => prev ? {
      ...prev,
      custom_links: prev.custom_links?.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      ) || []
    } : null)
  }

  const validateForm = () => {
    if (!formData) return false
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

  const handleSave = async () => {
    if (!validateForm() || !formData || !id) return

    setSaving(true)
    try {
      const updatedData = { 
        ...formData, 
        updated_at: new Date().toISOString() 
      }
      await updatePOSMachine(id, updatedData)
      toast.success('POS机信息更新成功！')
      navigate(`/map`)
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

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loading size="lg" text="正在加载数据..." /></div>
  }

  if (!formData) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">POS机数据加载失败或不存在</h3>
          <Button onClick={() => navigate('/map')}>返回地图</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div className="bg-white p-4 shadow-sm border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">编辑POS机</h1>
          </div>
          <div className="flex space-x-2">
            {permissions.canDeleteItem(formData.created_by) && (
              <Button onClick={() => setShowDeleteModal(true)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
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
              <Settings className="w-5 h-5" />
              <span>设备支持</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">结账地点</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.basic_info.checkout_location || ''}
                onChange={e => handleInputChange('basic_info.checkout_location', e.target.value)}
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">确定要删除这个POS机吗？此操作无法撤销。</p>
          <div className="flex space-x-2">
            <Button onClick={() => setShowDeleteModal(false)} variant="outline" className="flex-1">取消</Button>
            <Button onClick={handleDelete} loading={deleting} variant="danger" className="flex-1">删除</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default EditPOS