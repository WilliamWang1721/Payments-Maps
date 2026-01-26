import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X, Building2, Plus } from 'lucide-react';
import { Brand, BrandCategory, BrandBusinessType, BrandStatus } from '../types/brands';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import AnimatedInput from './ui/AnimatedInput';
import AnimatedButton from './ui/AnimatedButton';
import { notify } from '../lib/notify';

interface BrandSelectorProps {
  value?: string; // 选中的品牌ID
  onChange: (brandId: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  businessType?: 'online' | 'offline' | 'all'; // 业务类型筛选
  allowCustom?: boolean; // 是否允许自定义品牌
}

const BrandSelector: React.FC<BrandSelectorProps> = ({
  value,
  onChange,
  placeholder = '选择品牌',
  disabled = false,
  className = '',
  businessType = 'all',
  allowCustom = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  // 加载品牌数据
  const loadBrands = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (businessType !== 'all') {
        query = query.eq('category', businessType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading brands:', error);
        notify.error('加载品牌失败');
        return;
      }
      
      const formattedBrands: Brand[] = (data || []).map(brand => ({
        id: brand.id,
        name: brand.name,
        nameEn: brand.name_en || brand.name,
        category: brand.category as BrandCategory,
        businessType: brand.business_type === 'online' ? BrandBusinessType.ONLINE : BrandBusinessType.OFFLINE,
        status: BrandStatus.ACTIVE,
        isSystemBrand: brand.is_system_brand,
        iconUrl: brand.icon_url,
        logo: brand.logo || '🏢',
        color: brand.color || '#666666',
        description: brand.description,
        notes: brand.notes,
        website: brand.website,
        founded: brand.founded,
        headquarters: brand.headquarters,
        createdBy: brand.created_by,
        createdAt: brand.created_at,
        updatedAt: brand.updated_at,
        posSupport: {
          supported: true,
          supportedRegions: [],
          supportedPaymentMethods: [],
          notes: ''
        }
      }));
      
      setBrands(formattedBrands);
    } catch (error) {
      console.error('Error loading brands:', error);
      notify.error('加载品牌失败');
    } finally {
      setIsLoading(false);
    }
  }, [businessType]);
  
  // 组件挂载时加载品牌
  useEffect(() => {
    loadBrands();
  }, [businessType, loadBrands]);

  // 筛选品牌
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (brand.description && brand.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [brands, searchQuery]);

  // 获取选中的品牌
  const selectedBrand = useMemo(() => {
    if (!value) return null;
    if (value.startsWith('custom:')) return null;
    return brands.find(brand => brand.id === value) || null;
  }, [value, brands]);

  // 按分类分组品牌
  const brandsByCategory = useMemo(() => {
    const grouped: Record<BrandCategory, Brand[]> = {} as Record<BrandCategory, Brand[]>;
    
    filteredBrands.forEach(brand => {
      if (!grouped[brand.category]) {
        grouped[brand.category] = [];
      }
      grouped[brand.category].push(brand);
    });
    
    return grouped;
  }, [filteredBrands]);

  // 处理点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理品牌选择
  const handleBrandSelect = (brand: Brand) => {
    onChange(brand.id);
    setIsOpen(false);
    setSearchQuery('');
    setShowCustomInput(false);
  };

  // 处理自定义品牌
  const handleCustomBrand = async () => {
    if (!customBrandName.trim()) return;
    
    if (!user) {
      notify.error('请先登录');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('brands')
        .insert({
          name: customBrandName.trim(),
          category: businessType === 'all' ? 'offline' : businessType,
          description: `用户自定义品牌：${customBrandName.trim()}`,
          is_system_brand: false,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating custom brand:', error);
        notify.error('创建品牌失败');
        return;
      }
      
      // 重新加载品牌列表
      await loadBrands();
      
      // 选择新创建的品牌
      onChange(data.id);
      setCustomBrandName('');
      setShowCustomInput(false);
      setIsOpen(false);
      
      notify.success('品牌创建成功');
    } catch (error) {
      console.error('Error creating custom brand:', error);
      notify.error('创建品牌失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理清除选择
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  // 获取显示文本
  const getDisplayText = () => {
    if (!value) return placeholder;
    
    if (value.startsWith('custom:')) {
      return value.replace('custom:', '');
    }
    
    return selectedBrand?.name || value;
  };

  // 获取显示图标
  const getDisplayIcon = () => {
    if (!value) return <Building2 className="w-4 h-4 text-gray-400" />;
    
    if (value.startsWith('custom:')) {
      return <Building2 className="w-4 h-4 text-gray-600" />;
    }
    
    if (selectedBrand?.iconUrl) {
      return (
        <img 
          src={selectedBrand.iconUrl} 
          alt={selectedBrand.name}
          className="w-4 h-4 object-contain"
        />
      );
    }
    
    if (selectedBrand?.name) {
      return (
        <div className="w-4 h-4 bg-blue-500 text-white text-xs rounded flex items-center justify-center font-medium">
          {selectedBrand.name.charAt(0).toUpperCase()}
        </div>
      );
    }
    
    return <Building2 className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 选择器按钮 */}
      <button
        type="button"
        className={`
          w-full flex items-center justify-between px-3 py-2 border rounded-lg
          bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
          text-left text-sm transition-colors duration-200
          ${disabled 
            ? 'cursor-not-allowed opacity-50' 
            : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isOpen ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getDisplayIcon()}
          <span className={`truncate ${
            value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {getDisplayText()}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} />
        </div>
      </button>

      {/* 下拉选项 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AnimatedInput
                ref={inputRef}
                type="text"
                placeholder="搜索品牌..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 品牌列表 */}
          <div className="max-h-60 overflow-y-auto">
            {showCustomInput ? (
              /* 自定义品牌输入 */
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <AnimatedInput
                    ref={inputRef}
                    type="text"
                    placeholder="输入自定义品牌名称"
                    value={customBrandName}
                    onChange={(e) => setCustomBrandName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomBrand()}
                    disabled={isLoading}
                    className="text-sm"
                  />
                  <div className="flex space-x-2">
                    <AnimatedButton
                      size="sm"
                      onClick={handleCustomBrand}
                      disabled={isLoading || !customBrandName.trim()}
                    >
                      {isLoading ? '创建中...' : '确认'}
                    </AnimatedButton>
                    <AnimatedButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomBrandName('');
                      }}
                      disabled={isLoading}
                    >
                      取消
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 自定义品牌选项 */}
                {allowCustom && user && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                    onClick={() => {
                      setShowCustomInput(true);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        + 添加自定义品牌
                      </span>
                    </div>
                  </button>
                )}

                {/* 品牌选项 */}
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    加载中...
                  </div>
                ) : Object.entries(brandsByCategory).length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    {searchQuery ? '未找到匹配的品牌' : '暂无品牌数据'}
                  </div>
                ) : (
                  Object.entries(brandsByCategory).map(([category, categoryBrands]) => (
                    <div key={category}>
                      {/* 分类标题 */}
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {category === 'online' ? '线上品牌' : '线下品牌'}
                        </span>
                      </div>
                      
                      {/* 分类下的品牌 */}
                      {categoryBrands.map(brand => (
                        <button
                          key={brand.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                            value === brand.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : ''
                          }`}
                          onClick={() => handleBrandSelect(brand)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {brand.iconUrl ? (
                                <img 
                                  src={brand.iconUrl} 
                                  alt={brand.name}
                                  className="w-6 h-6 object-contain"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded flex items-center justify-center font-medium">
                                  {brand.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {brand.name}
                              </div>
                              {brand.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                  {brand.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {brand.businessType === BrandBusinessType.ONLINE ? '线上' : '线下'}
                                {brand.isSystemBrand && ' • 系统预置'}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandSelector;
