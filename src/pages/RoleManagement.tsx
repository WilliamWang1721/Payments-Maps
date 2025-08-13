import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Shield, Users, User, Edit, Save, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { usePermissions, type UserRole } from '@/hooks/usePermissions'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

interface UserData {
  id: string
  email: string
  role: UserRole
  created_at: string
  user_metadata?: {
    display_name?: string
  }
}

const RoleManagement = () => {
  const navigate = useNavigate()
  const permissions = usePermissions()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('regular')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // 检查权限
    if (!permissions.isLoading && !permissions.canManageRoles) {
      toast.error('您没有权限访问此页面')
      navigate('/profile')
      return
    }

    if (permissions.canManageRoles) {
      loadUsers()
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
        toast.error('加载用户列表失败')
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('加载用户列表失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
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
        toast.error('更新角色失败')
        return
      }

      // 更新本地状态
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, role: newRole }
          : user
      ))

      toast.success('用户角色更新成功')
      setEditingUser(null)
    } catch (error) {
      console.error('更新用户角色失败:', error)
      toast.error('更新失败，请重试')
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
          label: 'Beta用户',
          icon: Users,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
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

  if (!permissions.canManageRoles) {
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
              <span>用户角色管理</span>
            </CardTitle>
            <CardDescription>
              管理系统中所有用户的角色权限
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
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${roleInfo.color}`}>
                          <RoleIcon className="w-4 h-4 mr-1" />
                          {roleInfo.label}
                        </span>
                        
                        <Button
                          onClick={() => {
                            setEditingUser(user)
                            setNewRole(user.role)
                          }}
                          variant="outline"
                          size="sm"
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

      {/* 编辑角色模态框 */}
      <Modal
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
                {(['super_admin', 'admin', 'beta', 'regular'] as UserRole[]).map((role) => {
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
                          {role === 'beta' && '可以添加、编辑和删除自己的数据'}
                          {role === 'regular' && '只能查看数据，不能进行修改操作'}
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
      </Modal>
    </div>
  )
}

export default RoleManagement