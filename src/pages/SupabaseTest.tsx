import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

const SupabaseTest = () => {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('测试中...')
    
    try {
      console.log('开始测试 Supabase 连接')
      
      // 测试简单查询
      const { data, error } = await supabase
        .from('pos_machines')
        .select('id')
        .limit(1)
      
      console.log('查询结果:', { data, error })
      
      if (error) {
        setResult(`连接失败: ${error.message}`)
      } else {
        setResult(`连接成功! 查询到 ${data?.length || 0} 条记录`)
      }
    } catch (err: any) {
      console.error('测试失败:', err)
      setResult(`测试失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testAuth = async () => {
    setLoading(true)
    setResult('测试认证中...')
    
    try {
      console.log('开始测试认证状态')
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      console.log('认证结果:', { user, error })
      
      if (error) {
        setResult(`认证失败: ${error.message}`)
      } else if (!user) {
        setResult('用户未登录')
      } else {
        setResult(`认证成功! 用户ID: ${user.id}, 邮箱: ${user.email}`)
      }
    } catch (err: any) {
      console.error('认证测试失败:', err)
      setResult(`认证测试失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testInsert = async () => {
    setLoading(true)
    setResult('测试插入中...')
    
    try {
      console.log('开始测试插入')
      
      // 先检查认证状态
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setResult('插入失败: 用户未登录')
        return
      }
      
      const testData = {
        merchant_name: '测试商户',
        address: '测试地址',
        latitude: 31.2304,
        longitude: 121.4737,
        basic_info: {
          model: '测试型号'
        },
        verification_modes: {},
        extended_fields: {},
        status: 'active' as const,
        created_by: user.id
      }
      
      console.log('插入数据:', testData)
      
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('pos_machines')
        .insert([testData])
        .select()
        .single()
      const endTime = Date.now()
      
      console.log(`插入耗时: ${endTime - startTime}ms`)
      console.log('插入结果:', { data, error })
      
      if (error) {
        setResult(`插入失败: ${error.message}\n详细错误: ${JSON.stringify(error, null, 2)}`)
      } else {
        setResult(`插入成功! ID: ${data?.id}, 耗时: ${endTime - startTime}ms`)
        
        // 清理测试数据
        if (data?.id) {
          await supabase.from('pos_machines').delete().eq('id', data.id)
          console.log('已清理测试数据')
        }
      }
    } catch (err: any) {
      console.error('插入测试失败:', err)
      setResult(`插入测试失败: ${err.message}\n堆栈: ${err.stack}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase 连接测试</h1>
      
      <div className="space-y-4">
        <Button 
          onClick={testConnection}
          disabled={loading}
          className="w-full"
        >
          {loading ? '测试中...' : '测试连接'}
        </Button>
        
        <Button 
          onClick={testAuth}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? '测试中...' : '测试认证'}
        </Button>
        
        <Button 
          onClick={testInsert}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? '测试中...' : '测试插入'}
        </Button>
        
        {result && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupabaseTest