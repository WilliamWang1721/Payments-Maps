import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';

const DebugRole = () => {
  const { user } = useAuthStore();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    if (!user) {
      setError('用户未登录');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. 检查用户表中的角色信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('用户查询错误:', userError);
        setError(`用户查询错误: ${userError.message}`);
        return;
      }

      // 2. 检查用户是否存在于users表中
      if (!userData) {
        setError('用户不存在于users表中');
        return;
      }

      // 3. 尝试调用角色检查函数
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { user_id: user.id });

      setUserInfo({
        authUser: user,
        dbUser: userData,
        roleFunction: roleData,
        roleError: roleError?.message
      });

    } catch (err: any) {
      console.error('获取用户信息失败:', err);
      setError(`获取用户信息失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 直接更新用户角色
      const { error } = await supabase
        .from('users')
        .update({ role: 'super_admin' })
        .eq('id', user.id);

      if (error) {
        setError(`更新角色失败: ${error.message}`);
      } else {
        // 重新获取用户信息
        await fetchUserInfo();
      }
    } catch (err: any) {
      setError(`更新角色失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserInfo();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">请先登录</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>角色调试信息</CardTitle>
            <Button
              onClick={fetchUserInfo}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <p className="text-gray-600">加载中...</p>
            </div>
          )}

          {userInfo && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">认证用户信息:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify({
                    id: userInfo.authUser.id,
                    email: userInfo.authUser.email,
                    created_at: userInfo.authUser.created_at
                  }, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">数据库用户信息:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(userInfo.dbUser, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">角色函数结果:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {userInfo.roleError ? 
                    `错误: ${userInfo.roleError}` : 
                    JSON.stringify(userInfo.roleFunction, null, 2)
                  }
                </pre>
              </div>

              {userInfo.dbUser?.role !== 'super_admin' && (
                <div className="pt-4">
                  <Button
                    onClick={updateUserRole}
                    disabled={loading}
                    className="w-full"
                  >
                    设置为超级管理员
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugRole;