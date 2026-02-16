import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Terminal, Copy, Eye, EyeOff, Trash2, Shield, Book, Download, ExternalLink, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import AnimatedModal from '@/components/ui/AnimatedModal'
import Input from '@/components/ui/Input'
import { getErrorDetails, notify } from '@/lib/notify'
import { 
  generateMCPSession, 
  getUserMCPSessions, 
  updateMCPSessionPermissions, 
  revokeMCPSession,
  generateClaudeDesktopConfig,
  type MCPSession 
} from '@/lib/mcpApi'

// 格式化日期的工具函数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const MCPSettings = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<MCPSession[]>([])
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<MCPSession | null>(null)
  const [configVisible, setConfigVisible] = useState(false)

  // 生成的配置
  const [generatedConfig, setGeneratedConfig] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  const loadMCPData = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const result = await getUserMCPSessions(user.id)
      
      if (result.success) {
        setSessions(result.sessions)
      } else {
        console.error('加载 MCP 数据失败:', result.error)
        // 如果是数据库配置问题，显示更友好的错误信息
        if (result.error?.includes('MCP功能尚未完全配置')) {
          notify.critical('MCP功能尚未完全配置，请联系管理员', {
            title: 'MCP 未配置',
          })
        } else {
          notify.critical('加载数据失败', {
            title: '加载 MCP 数据失败',
            details: import.meta.env.DEV ? result.error : undefined,
          })
        }
      }
    } catch (error) {
      console.error('加载 MCP 数据失败:', error)
      notify.critical('加载数据失败', {
        title: '加载 MCP 数据失败',
        details: getErrorDetails(error),
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    void loadMCPData()
  }, [loadMCPData, navigate, user])

  const generateMCPConfig = async () => {
    if (!user) return

    try {
      // 生成新的会话令牌
      const result = await generateMCPSession(user.id, 'Claude Desktop')

      if (!result.success) {
        // 如果是数据库配置问题，显示更友好的错误信息
        if (result.error?.includes('MCP功能尚未完全配置')) {
          notify.critical('MCP功能尚未完全配置，请联系管理员完成数据库设置', {
            title: '生成配置失败',
            details: import.meta.env.DEV ? result.error : undefined,
          })
        } else {
          notify.critical(`生成配置失败：${result.error}`, {
            title: '生成配置失败',
            details: import.meta.env.DEV ? result.error : undefined,
          })
        }
        return
      }

      const token = result.sessionToken
      setSessionToken(token)

      // 生成 Claude Desktop 配置
      const config = generateClaudeDesktopConfig(token)
      setGeneratedConfig(JSON.stringify(config, null, 2))
      setShowConfigModal(true)
      
      // 重新加载会话列表
      await loadMCPData()
      
    } catch (error) {
      console.error('生成配置失败:', error)
      notify.critical('生成配置失败，请重试', {
        title: '生成配置失败',
        details: getErrorDetails(error),
      })
    }
  }

  const copyConfig = () => {
    navigator.clipboard.writeText(generatedConfig)
    notify.success('配置已复制到剪贴板')
  }

  const revokeSession = async (sessionId: string) => {
    if (!user) return

    try {
      const result = await revokeMCPSession(sessionId, user.id)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      notify.success(result.message)
      await loadMCPData()
    } catch (error) {
      console.error('撤销会话失败:', error)
      notify.error('撤销失败，请重试')
    }
  }

  const updateSessionPermissions = async (sessionId: string, permissions: any) => {
    if (!user) return

    try {
      const result = await updateMCPSessionPermissions(sessionId, user.id, permissions)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      notify.success(result.message)
      setShowPermissionModal(false)
      await loadMCPData()
    } catch (error) {
      console.error('更新权限失败:', error)
      notify.error('更新失败，请重试')
    }
  }

  const getSessionStatusColor = (session: MCPSession) => {
    if (!session.is_active) return 'text-red-500'
    
    const lastActive = new Date(session.last_active)
    const now = new Date()
    const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) return 'text-green-500'
    if (diffHours < 24) return 'text-yellow-500'
    return 'text-gray-500'
  }

  const getSessionStatusText = (session: MCPSession) => {
    if (!session.is_active) return '已禁用'
    
    const lastActive = new Date(session.last_active)
    const now = new Date()
    const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) return '在线'
    if (diffHours < 24) return '最近活跃'
    return '离线'
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading size="lg" text="正在加载 MCP 设置..." />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-4">
        {/* 页面头部 */}
        <div className="flex items-center space-x-3 mb-6">
          <Button
            onClick={() => navigate('/app/profile')}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MCP 设置</h1>
            <p className="text-gray-600">管理您的 Model Context Protocol 连接</p>
          </div>
        </div>

        {/* MCP 介绍卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="w-5 h-5 mr-2 text-indigo-600" />
              什么是 MCP？
            </CardTitle>
            <CardDescription>
              Model Context Protocol (MCP) 让您可以在 Claude Desktop 中直接管理 POS 机数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <Terminal className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-medium">直接集成</h3>
                <p className="text-sm text-gray-600 mt-1">在 Claude Desktop 中直接使用</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium">安全认证</h3>
                <p className="text-sm text-gray-600 mt-1">基于会话的安全访问</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <h3 className="font-medium">实时同步</h3>
                <p className="text-sm text-gray-600 mt-1">数据实时更新</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={generateMCPConfig}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                生成配置文件
              </Button>
              
              <Button
                onClick={() => setShowGuideModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Book className="w-4 h-4 mr-2" />
                查看使用指南
              </Button>
              
              <Button
                onClick={() => window.open('https://docs.payments-maps.com/mcp', '_blank')}
                variant="outline"
                className="w-full justify-start"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                访问文档
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 已连接的客户端 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>已连接的客户端</CardTitle>
              <span className="text-sm text-gray-500">
                {sessions.filter(s => s.is_active).length} / {sessions.length} 活跃
              </span>
            </div>
            <CardDescription>
              管理您的 MCP 客户端连接和权限设置
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Terminal className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">还没有连接的客户端</p>
                <Button onClick={generateMCPConfig} size="sm">
                  创建第一个连接
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Terminal className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{session.session_name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${
                                session.is_active ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              <span className={getSessionStatusColor(session)}>
                                {getSessionStatusText(session)}
                              </span>
                            </div>
                            <span>创建于 {formatDate(session.created_at)}</span>
                            <span>最后活跃 {formatDate(session.last_active)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 权限标识 */}
                      <div className="flex items-center space-x-2 mt-2">
                        {Object.entries(session.permissions).map(([key, enabled]) => (
                          <span
                            key={key}
                            className={`text-xs px-2 py-1 rounded-full ${
                              enabled 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {key === 'search' && '搜索'}
                            {key === 'add_pos' && '添加'}
                            {key === 'update_pos' && '编辑'}
                            {key === 'delete_pos' && '删除'}
                            {key === 'view_details' && '详情'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedSession(session)
                          setShowPermissionModal(true)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        onClick={() => revokeSession(session.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 配置生成弹窗 */}
      <AnimatedModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="MCP 配置文件"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">配置说明</h4>
                <p className="text-sm text-blue-700 mt-1">
                  将此配置添加到您的 Claude Desktop 配置文件中，路径通常为：<br />
                  <code className="bg-blue-100 px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                配置内容
              </label>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setConfigVisible(!configVisible)}
                  variant="ghost"
                  size="sm"
                >
                  {configVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={copyConfig}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                value={configVisible ? generatedConfig : '••••••••••••••••••••••••••••••••'}
                readOnly
                rows={12}
                className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">安全提醒</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  请妥善保管您的会话令牌，不要与他人分享。如果令牌泄露，请立即在此页面撤销相应的会话。
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => setShowConfigModal(false)}
              variant="outline"
              className="flex-1"
            >
              关闭
            </Button>
            <Button
              onClick={() => {
                copyConfig()
                setShowConfigModal(false)
              }}
              className="flex-1"
            >
              复制并关闭
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* 使用指南弹窗 */}
      <AnimatedModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="MCP 使用指南"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">1. 安装 MCP 客户端</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <code className="text-sm">curl -fsSL https://mcp.payments-maps.com/install.sh | bash</code>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                或者手动下载并安装 payments-maps-mcp 包
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">2. 配置 Claude Desktop</h3>
              <p className="text-sm text-gray-600 mb-2">
                将生成的配置添加到 Claude Desktop 配置文件中：
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <code className="text-sm">~/Library/Application Support/Claude/claude_desktop_config.json</code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">3. 重启 Claude Desktop</h3>
              <p className="text-sm text-gray-600">
                保存配置后，重启 Claude Desktop 以加载 MCP 连接
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">4. 开始使用</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">在 Claude Desktop 中，您可以直接说：</p>
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <p className="text-sm font-medium text-green-800">"帮我搜索附近支持 Apple Pay 的 POS 机"</p>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                  <p className="text-sm font-medium text-blue-800">"添加一个新的 POS 机到数据库"</p>
                </div>
                <div className="bg-purple-50 border-l-4 border-purple-400 p-3">
                  <p className="text-sm font-medium text-purple-800">"查看我管理的所有 POS 机"</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">功能特性</h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• 智能搜索和地理位置查询</li>
                  <li>• 添加、编辑和删除 POS 机信息</li>
                  <li>• 查看详细的设备信息和评价</li>
                  <li>• 安全的权限控制和会话管理</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* 权限设置弹窗 */}
      <AnimatedModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        title="权限设置"
        size="md"
      >
        {selectedSession && (
          <PermissionSettings
            session={selectedSession}
            onUpdate={updateSessionPermissions}
            onClose={() => setShowPermissionModal(false)}
          />
        )}
      </AnimatedModal>
    </div>
  )
}

// 权限设置组件
interface PermissionSettingsProps {
  session: MCPSession
  onUpdate: (sessionId: string, permissions: any) => void
  onClose: () => void
}

const PermissionSettings = ({ session, onUpdate, onClose }: PermissionSettingsProps) => {
  const [permissions, setPermissions] = useState(session.permissions)

  const handlePermissionChange = (key: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = () => {
    onUpdate(session.id, permissions)
  }

  const permissionLabels = {
    search: { label: '搜索 POS 机', description: '允许搜索和查看 POS 机列表' },
    view_details: { label: '查看详情', description: '允许查看 POS 机的详细信息' },
    add_pos: { label: '添加 POS 机', description: '允许添加新的 POS 机到系统' },
    update_pos: { label: '编辑 POS 机', description: '允许修改已有的 POS 机信息' },
    delete_pos: { label: '删除 POS 机', description: '允许删除 POS 机（仅限自己添加的）' }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-1">客户端信息</h4>
        <p className="text-sm text-gray-600">{session.session_name}</p>
        <p className="text-xs text-gray-500">创建于 {formatDate(session.created_at)}</p>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">权限设置</h4>
        {Object.entries(permissionLabels).map(([key, { label, description }]) => (
          <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              checked={permissions[key as keyof typeof permissions]}
              onChange={(e) => handlePermissionChange(key, e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label className="font-medium text-gray-900">{label}</label>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1"
        >
          取消
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1"
        >
          保存设置
        </Button>
      </div>
    </div>
  )
}

export default MCPSettings
