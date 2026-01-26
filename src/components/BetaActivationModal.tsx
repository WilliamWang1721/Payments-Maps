import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import AnimatedModal from './ui/AnimatedModal';
import Button from './ui/Button';
import Input from './ui/Input';
import { activateBetaPermission, validateActivationCode } from '../lib/activation';
import { useAuthStore } from '../stores/useAuthStore';
import { notify } from '../lib/notify';

interface BetaActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BetaActivationModal({ isOpen, onClose, onSuccess }: BetaActivationModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { refreshUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('请输入激活码');
      return;
    }

    if (!validateActivationCode(code.trim().toUpperCase())) {
      setError('激活码格式不正确，应为8位大写字母和数字组合');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await activateBetaPermission({ code: code.trim().toUpperCase() });
      
      if (response.error) {
        setError(response.error.message);
        return;
      }

      if (response.data?.success) {
        setSuccess(true);
        notify.success('Beta权限激活成功！');
        
        // 刷新用户信息
        await refreshUser();
        
        // 延迟关闭弹窗，让用户看到成功状态
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      } else {
        setError(response.data?.message || '激活失败');
      }
    } catch {
      setError('激活过程中发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(value);
    setError(null);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">激活Beta权益</h3>
              <p className="text-sm text-gray-500">解锁更多功能和特权</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">激活成功！</h4>
              <p className="text-gray-600 mb-4">恭喜您成为Beta用户，现在可以享受更多功能了</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">✨ 您现在可以添加和编辑POS机信息</p>
                <p className="text-sm text-green-700">✨ 发表评价和分享体验</p>
                <p className="text-sm text-green-700">✨ 访问Beta专属功能</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="activation-code" className="block text-sm font-medium text-gray-700 mb-2">
                  激活码
                </label>
                <Input
                  id="activation-code"
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="请输入8位激活码"
                  className="text-center text-lg font-mono tracking-wider"
                  disabled={loading}
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  请输入管理员提供的8位激活码（大写字母和数字组合）
                </p>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Beta权益包括：</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 添加和编辑POS机信息</li>
                  <li>• 发表评价和分享支付体验</li>
                  <li>• 优先体验新功能</li>
                  <li>• 参与社区讨论</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !code.trim() || code.length !== 8}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? '激活中...' : '激活Beta权益'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 底部说明 */}
        {!success && (
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-500 text-center">
              如需获取激活码，请联系管理员或关注官方公告
            </p>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
}
