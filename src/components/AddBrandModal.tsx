import React, { useState } from 'react';
import { X, Plus, Upload, Globe, Store } from 'lucide-react';
import { BrandCategory, BrandBusinessType, CreateBrandFormData } from '../types/brands';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { notify } from '../lib/notify';

interface AddBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddBrandModal: React.FC<AddBrandModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBrandFormData>({
    name: '',
    description: '',
    notes: '',
    category: BrandCategory.OTHER,
    businessType: BrandBusinessType.OFFLINE,
    iconUrl: '',
    website: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify.error('请先登录');
      return;
    }

    if (!formData.name.trim()) {
      notify.error('请输入品牌名称');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('brands')
        .insert({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          notes: formData.notes?.trim() || null,
          category: formData.category,
          icon_url: formData.iconUrl?.trim() || null,
          created_by: user.id
        });

      if (error) {
        if (error.code === '23505') {
          notify.error('您已经创建过同名品牌');
        } else {
          notify.error('创建品牌失败：' + error.message);
        }
        return;
      }

      notify.success('品牌创建成功！');
      onSuccess();
      onClose();
      // 重置表单
      setFormData({
        name: '',
        description: '',
        notes: '',
        category: BrandCategory.OTHER,
        businessType: BrandBusinessType.OFFLINE,
        iconUrl: '',
        website: ''
      });
    } catch (error) {
      console.error('创建品牌失败:', error);
      notify.error('创建品牌失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const generateIconUrl = (brandName: string, businessType: BrandBusinessType) => {
    const typeKeyword = businessType === BrandBusinessType.ONLINE ? 'online digital app' : 'store shop retail';
    const prompt = `${brandName} brand logo ${typeKeyword} modern clean design`;
    return `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`;
  };

  const handleAutoGenerateIcon = () => {
    if (formData.name.trim()) {
      const iconUrl = generateIconUrl(formData.name, formData.businessType);
      setFormData(prev => ({ ...prev, iconUrl }));
      notify.success('已自动生成图标URL');
    } else {
      notify.error('请先输入品牌名称');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            添加新品牌
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 品牌名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入品牌名称"
              required
            />
          </div>

          {/* 业务类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              业务类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, businessType: BrandBusinessType.OFFLINE }))}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  formData.businessType === BrandBusinessType.OFFLINE
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Store className="w-4 h-4" />
                线下品牌
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, businessType: BrandBusinessType.ONLINE }))}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  formData.businessType === BrandBusinessType.ONLINE
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className="w-4 h-4" />
                线上品牌
              </button>
            </div>
          </div>

          {/* 品牌分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌分类
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as BrandCategory }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={BrandCategory.RESTAURANT}>餐厅</option>
              <option value={BrandCategory.FAST_FOOD}>快餐</option>
              <option value={BrandCategory.COFFEE}>咖啡</option>
              <option value={BrandCategory.RETAIL}>零售</option>
              <option value={BrandCategory.FASHION}>时尚</option>
              <option value={BrandCategory.CONVENIENCE}>便利店</option>
              <option value={BrandCategory.SUPERMARKET}>超市</option>
              <option value={BrandCategory.ELECTRONICS}>电子产品</option>
              <option value={BrandCategory.ECOMMERCE}>电商平台</option>
              <option value={BrandCategory.FOOD_DELIVERY}>外卖配送</option>
              <option value={BrandCategory.OTHER}>其他</option>
            </select>
          </div>

          {/* 品牌图标 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌图标URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.iconUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, iconUrl: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/icon.png"
              />
              <button
                type="button"
                onClick={handleAutoGenerateIcon}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                title="自动生成图标"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            {formData.iconUrl && (
              <div className="mt-2">
                <img
                  src={formData.iconUrl}
                  alt="品牌图标预览"
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* 品牌描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入品牌描述"
              rows={3}
            />
          </div>

          {/* 备注信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注信息
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入备注信息"
              rows={2}
            />
          </div>

          {/* 官网链接 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              官网链接
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '创建中...' : '创建品牌'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBrandModal;
