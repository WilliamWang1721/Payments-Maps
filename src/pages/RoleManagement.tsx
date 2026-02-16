import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Shield, Users, User, Edit, Save, X, Search, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePermissions, type UserRole } from '@/hooks/usePermissions'
import { locationUtils } from '@/lib/amap'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import AnimatedModal from '@/components/ui/AnimatedModal'
import { notify } from '@/lib/notify'
import { FALLBACK_DEFAULT_LOCATION } from '@/lib/defaultLocation'

interface UserData {
  id: string
  email: string
  role: UserRole
  created_at: string
  user_metadata?: {
    display_name?: string
  }
}

interface UserDefaultLocationData {
  user_id: string
  default_location_key?: string | null
  default_location_address?: string | null
  default_location_longitude?: number | null
  default_location_latitude?: number | null
  updated_at?: string | null
}

interface ResolvedLocation {
  address: string
  longitude: number
  latitude: number
}

const RoleManagement = () => {
  const navigate = useNavigate()
  const permissions = usePermissions()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('regular')
  const [defaultLocationByUserId, setDefaultLocationByUserId] = useState<Record<string, UserDefaultLocationData>>({})
  const [editingLocationUser, setEditingLocationUser] = useState<UserData | null>(null)
  const [locationInput, setLocationInput] = useState('')
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null)
  const [resolvingLocation, setResolvingLocation] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [clearingLocation, setClearingLocation] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // 检查权限
    if (!permissions.isLoading && !permissions.isAdmin) {
      notify.critical('您没有权限访问此页面', { title: '权限不足' })
      navigate('/app/profile')
      return
    }

    if (permissions.isAdmin) {
      void loadUsers()
    }
  }, [permissions, navigate])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('加载用户列表失败:', error)
        notify.error('加载用户列表失败')
        return
      }

      const userList = (data || []) as UserData[]
      setUsers(userList)
      await loadUserDefaultLocations(userList.map((item) => item.id))
    } catch (error) {
      console.error('加载用户列表失败:', error)
      notify.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUserDefaultLocations = async (userIds: string[]) => {
    if (userIds.length === 0) {
      setDefaultLocationByUserId({})
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select(
          'user_id, default_location_key, default_location_address, default_location_longitude, default_location_latitude, updated_at'
        )
        .in('user_id', userIds)

      if (error) {
        console.error('加载用户默认地点失败:', error)
        notify.warning('用户默认地点数据暂不可用，请先执行数据库迁移')
        setDefaultLocationByUserId({})
        return
      }

      const locationMap = (data || []).reduce<Record<string, UserDefaultLocationData>>((acc, item) => {
        acc[item.user_id] = item as UserDefaultLocationData
        return acc
      }, {})

      setDefaultLocationByUserId(locationMap)
    } catch (error) {
      console.error('加载用户默认地点失败:', error)
      setDefaultLocationByUserId({})
    }
  }

  const getUserDefaultLocationSummary = (userId: string) => {
    const item = defaultLocationByUserId[userId]
    if (!item) return `${FALLBACK_DEFAULT_LOCATION.label}（系统默认）`

    if (item.default_location_address) {
      return item.default_location_address
    }

    const lng = Number(item.default_location_longitude)
    const lat = Number(item.default_location_latitude)
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }

    return `${FALLBACK_DEFAULT_LOCATION.label}（系统默认）`
  }

  const openDefaultLocationEditor = (user: UserData) => {
    const existing = defaultLocationByUserId[user.id]
    const lng = Number(existing?.default_location_longitude)
    const lat = Number(existing?.default_location_latitude)
    const hasCoordinates = Number.isFinite(lng) && Number.isFinite(lat)

    setEditingLocationUser(user)
    setLocationInput(existing?.default_location_address || '')
    setResolvedLocation(
      hasCoordinates
        ? {
            address: existing?.default_location_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            longitude: lng,
            latitude: lat,
          }
        : null
    )
  }

  const handleResolveLocation = async () => {
    const query = locationInput.trim()
    if (!query) {
      notify.error('请输入地址后再解析')
      return
    }

    setResolvingLocation(true)
    try {
      const { longitude, latitude } = await locationUtils.getCoordinatesByAddress(query)
      const detailedAddress = await locationUtils.getAddress(longitude, latitude)

      setResolvedLocation({
        address: detailedAddress || query,
        longitude,
        latitude,
      })
      notify.success('地址解析成功')
    } catch (error) {
      console.error('地址解析失败:', error)
      notify.error('地址解析失败，请尝试更完整的地址描述')
      setResolvedLocation(null)
    } finally {
      setResolvingLocation(false)
    }
  }

  const saveUserDefaultLocation = async () => {
    if (!editingLocationUser) return

    let payload = resolvedLocation
    if (!payload && locationInput.trim()) {
      try {
        const { longitude, latitude } = await locationUtils.getCoordinatesByAddress(locationInput.trim())
        const detailedAddress = await locationUtils.getAddress(longitude, latitude)
        payload = {
          address: detailedAddress || locationInput.trim(),
          longitude,
          latitude,
        }
        setResolvedLocation(payload)
      } catch (error) {
        console.error('保存前自动解析地址失败:', error)
      }
    }

    if (!payload) {
      notify.error('请先解析地址，再保存')
      return
    }

    setSavingLocation(true)
    try {
      const { error } = await supabase.rpc('admin_set_user_default_location', {
        target_user_id: editingLocationUser.id,
        p_address: payload.address,
        p_longitude: payload.longitude,
        p_latitude: payload.latitude,
      })

      if (error) {
        console.error('通过RPC保存默认地点失败，尝试直接写入:', error)
        const { error: fallbackError } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: editingLocationUser.id,
              default_location_key: 'custom',
              default_location_address: payload.address,
              default_location_longitude: payload.longitude,
              default_location_latitude: payload.latitude,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (fallbackError) {
          throw fallbackError
        }
      }

      setDefaultLocationByUserId((prev) => ({
        ...prev,
        [editingLocationUser.id]: {
          user_id: editingLocationUser.id,
          default_location_key: 'custom',
          default_location_address: payload.address,
          default_location_longitude: payload.longitude,
          default_location_latitude: payload.latitude,
          updated_at: new Date().toISOString(),
        },
      }))
      notify.success('默认地点已更新')
      setEditingLocationUser(null)
      setLocationInput('')
      setResolvedLocation(null)
    } catch (error) {
      console.error('保存用户默认地点失败:', error)
      notify.error('保存失败，请确认数据库迁移已完成')
    } finally {
      setSavingLocation(false)
    }
  }

  const clearUserDefaultLocation = async () => {
    if (!editingLocationUser) return

    setClearingLocation(true)
    try {
      const { error } = await supabase.rpc('admin_set_user_default_location', {
        target_user_id: editingLocationUser.id,
        p_address: null,
        p_longitude: null,
        p_latitude: null,
      })

      if (error) {
        console.error('通过RPC清空默认地点失败，尝试直接写入:', error)
        const { error: fallbackError } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: editingLocationUser.id,
              default_location_key: null,
              default_location_address: null,
              default_location_longitude: null,
              default_location_latitude: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (fallbackError) {
          throw fallbackError
        }
      }

      setDefaultLocationByUserId((prev) => {
        const next = { ...prev }
        delete next[editingLocationUser.id]
        return next
      })
      notify.success('已清空该用户默认地点')
      setEditingLocationUser(null)
      setLocationInput('')
      setResolvedLocation(null)
    } catch (error) {
      console.error('清空用户默认地点失败:', error)
      notify.error('清空失败，请确认数据库迁移已完成')
    } finally {
      setClearingLocation(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingUser) return

    setUpdating(true)
    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: editingUser.id,
        new_role: newRole
      })

      if (error) {
        console.error('更新用户角色失败:', error)
        notify.error('更新角色失败')
        return
      }

      // 更新本地状态
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, role: newRole }
          : user
      ))

      notify.success('用户角色更新成功')
      setEditingUser(null)
    } catch (error) {
      console.error('更新用户角色失败:', error)
      notify.error('更新失败，请重试')
    } finally {
      setUpdating(false)
    }
  }

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return {
          label: '超级管理员',
          icon: Crown,
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        }
      case 'admin':
        return {
          label: '管理员',
          icon: Shield,
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
        }
      case 'beta':
        return {
          label: '普通用户',
          icon: User,
          color: 'text-gray-600 bg-gray-50 border-gray-200'
        }
      case 'regular':
      default:
        return {
          label: '普通用户',
          icon: User,
          color: 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.user_metadata?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading || permissions.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading size="lg" text="正在加载..." />
      </div>
    )
  }

  if (!permissions.isAdmin) {
    return null
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-4">
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-6 h-6 text-purple-600" />
              <span>管理中心</span>
            </CardTitle>
            <CardDescription>
              管理系统中的用户角色和默认地点配置
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索用户邮箱或姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <CardTitle>用户列表 ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">没有找到匹配的用户</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role)
                  const RoleIcon = roleInfo.icon

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {user.user_metadata?.display_name || user.email.split('@')[0]}
                            </h4>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              注册时间: {new Date(user.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500 max-w-[480px] truncate">
                              默认地点: {getUserDefaultLocationSummary(user.id)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${roleInfo.color}`}>
                          <RoleIcon className="w-4 h-4 mr-1" />
                          {roleInfo.label}
                        </span>

                        <Button
                          onClick={() => openDefaultLocationEditor(user)}
                          variant="outline"
                          size="sm"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>

                        <Button
                          onClick={() => {
                            setEditingUser(user)
                            setNewRole(user.role === 'beta' ? 'regular' : user.role)
                          }}
                          variant="outline"
                          size="sm"
                          disabled={!permissions.canManageRoles}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* 编辑用户默认地点模态框 */}
      <AnimatedModal
        isOpen={!!editingLocationUser}
        onClose={() => {
          if (savingLocation || clearingLocation) return
          setEditingLocationUser(null)
        }}
        title="设置用户默认地点"
      >
        {editingLocationUser && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {editingLocationUser.user_metadata?.display_name || editingLocationUser.email.split('@')[0]}
                </h4>
                <p className="text-sm text-gray-600">{editingLocationUser.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">默认地点地址</label>
              <Input
                type="text"
                placeholder="例如：河北省石家庄市裕华区槐中路市府小区"
                value={locationInput}
                onChange={(event) => {
                  setLocationInput(event.target.value)
                  setResolvedLocation(null)
                }}
                disabled={resolvingLocation || savingLocation || clearingLocation}
              />
              <p className="text-xs text-gray-500">
                支持自然语言地址。点击“解析地址”后会自动转成经纬度和标准化详细地址。
              </p>
              <p className="text-xs text-gray-500">
                未单独设置时，系统默认地点为北京。
              </p>
            </div>

            {resolvedLocation && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                <p className="font-medium">解析结果</p>
                <p className="mt-1 break-words">{resolvedLocation.address}</p>
                <p className="mt-1 text-xs">
                  坐标: {resolvedLocation.latitude.toFixed(6)}, {resolvedLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleResolveLocation}
                disabled={!locationInput.trim() || resolvingLocation || savingLocation || clearingLocation}
              >
                {resolvingLocation ? <Loading size="sm" /> : '解析地址'}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={clearUserDefaultLocation}
                disabled={savingLocation || clearingLocation}
              >
                {clearingLocation ? <Loading size="sm" /> : '清空'}
              </Button>
              <Button
                onClick={saveUserDefaultLocation}
                disabled={savingLocation || clearingLocation || !locationInput.trim()}
              >
                {savingLocation ? <Loading size="sm" /> : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    保存地点
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* 编辑角色模态框 */}
      <AnimatedModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="编辑用户角色"
      >
        {editingUser && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {editingUser.user_metadata?.display_name || editingUser.email.split('@')[0]}
                </h4>
                <p className="text-sm text-gray-600">{editingUser.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择新角色
              </label>
              <div className="space-y-2">
                {(['super_admin', 'admin', 'regular'] as UserRole[]).map((role) => {
                  const roleInfo = getRoleInfo(role)
                  const RoleIcon = roleInfo.icon
                  
                  return (
                    <label
                      key={role}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        newRole === role 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={newRole === role}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="sr-only"
                      />
                      <RoleIcon className={`w-5 h-5 mr-3 ${roleInfo.color.split(' ')[0]}`} />
                      <div>
                        <div className="font-medium">{roleInfo.label}</div>
                        <div className="text-sm text-gray-600">
                          {role === 'super_admin' && '拥有所有权限，可以管理用户角色'}
                          {role === 'admin' && '可以管理所有数据，但不能修改用户角色'}
                          {role === 'regular' && '可以添加、编辑和删除自己的数据'}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setEditingUser(null)}
                variant="outline"
                disabled={updating}
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updating || newRole === editingUser.role}
              >
                {updating ? (
                  <Loading size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  )
}

export default RoleManagement
