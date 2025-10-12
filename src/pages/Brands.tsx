import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Grid, List, Globe, Calendar, Trash2, User, FileText, Building, Tag, Settings } from 'lucide-react';
import { Brand, BrandCategory, BrandBusinessType, BrandFilterOptions } from '../types/brands';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import AnimatedCard from '../components/ui/AnimatedCard';
import AnimatedInput from '../components/ui/AnimatedInput';
import AnimatedButton from '../components/ui/AnimatedButton';
import Checkbox from '../components/ui/Checkbox';
import AnimatedModal from '../components/ui/AnimatedModal';
import PageTransition from '../components/PageTransition';
import { toast } from 'sonner';

const Brands: React.FC = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filters, setFilters] = useState<BrandFilterOptions>({
    category: [],
    businessType: [],
    searchQuery: ''
  });

  // 加载品牌数据
  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          profiles:created_by(username)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加载品牌失败:', error);
        toast.error('加载品牌失败');
        return;
      }

      setBrands(data || []);
    } catch (error) {
      console.error('加载品牌失败:', error);
      toast.error('加载品牌失败');
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // 获取筛选后的品牌列表
  const filteredBrands = useMemo(() => {
    let filtered = brands;

    // 按业务类型筛选
    if (filters.businessType) {
      filtered = filtered.filter(brand => filters.businessType?.includes(brand.businessType));
    }

    // 按分类筛选
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(brand => filters.category!.includes(brand.category));
    }

    // 搜索筛选
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(brand => 
        brand.name.toLowerCase().includes(query) ||
        brand.description?.toLowerCase().includes(query) ||
        brand.notes?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [brands, filters, searchQuery]);

  // 获取品牌统计信息
  const brandStats = useMemo(() => {
    const onlineBrands = brands.filter(b => b.businessType === BrandBusinessType.ONLINE).length;
    const offlineBrands = brands.filter(b => b.businessType === BrandBusinessType.OFFLINE).length;
    return {
      totalBrands: brands.length,
      onlineBrands,
      offlineBrands
    };
  }, [brands]);

  // 处理分类筛选
  const handleCategoryFilter = (category: BrandCategory, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      category: checked 
        ? [...(prev.category || []), category]
        : (prev.category || []).filter(c => c !== category)
    }));
  };

  // 删除品牌（仅管理员）
  const handleDeleteBrand = async (brandId: string) => {
    if (!(user as any)?.isAdmin) {
      toast.error('只有管理员可以删除品牌');
      return;
    }

    if (!confirm('确定要删除这个品牌吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) {
        toast.error('删除品牌失败：' + error.message);
        return;
      }

      toast.success('品牌删除成功');
      loadBrands();
      setSelectedBrand(null);
    } catch (error) {
      console.error('删除品牌失败:', error);
      toast.error('删除品牌失败');
    }
  };

  // 清除筛选条件
  const clearFilters = () => {
    setFilters({
      category: [],
      businessType: [],
      searchQuery: ''
    });
    setSearchQuery('');
  };

  // 获取分类标签
  const getCategoryLabel = (category: BrandCategory): string => {
    const labels: Record<BrandCategory, string> = {
      [BrandCategory.RESTAURANT]: '餐厅',
      [BrandCategory.FAST_FOOD]: '快餐',
      [BrandCategory.COFFEE]: '咖啡',
      [BrandCategory.RETAIL]: '零售',
      [BrandCategory.FASHION]: '时尚',
      [BrandCategory.CONVENIENCE]: '便利店',
      [BrandCategory.SUPERMARKET]: '超市',
      [BrandCategory.ELECTRONICS]: '电子产品',
      [BrandCategory.PHARMACY]: '药店',
      [BrandCategory.GAS_STATION]: '加油站',
      [BrandCategory.HOTEL]: '酒店',
      [BrandCategory.ECOMMERCE]: '电商平台',
      [BrandCategory.FOOD_DELIVERY]: '外卖配送',
      [BrandCategory.OTHER]: '其他'
    };
    return labels[category] || category;
  };

  // 品牌卡片组件
  const BrandCard: React.FC<{ brand: Brand; onClick: () => void }> = ({ brand, onClick }) => (
    <AnimatedCard 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
      onClick={onClick}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 bg-gray-100 dark:bg-gray-700">
              {brand.iconUrl ? (
                <img 
                  src={brand.iconUrl} 
                  alt={brand.name}
                  className="w-full h-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) nextElement.style.display = 'block';
                  }}
                />
              ) : null}
              <span 
                className={`${brand.iconUrl ? 'hidden' : 'block'} text-gray-600 dark:text-gray-300`}
                style={{ display: brand.iconUrl ? 'none' : 'block' }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                {brand.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {getCategoryLabel(brand.category)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {brand.businessType === BrandBusinessType.ONLINE ? (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                线上
              </div>
            ) : (
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                线下
              </div>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
          {brand.description || '暂无描述'}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{brand.createdBy || '系统'}</span>
          </div>
          {brand.notes && (
            <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs">
              有备注
            </span>
          )}
        </div>
      </div>
      
      {/* 管理员删除按钮 */}
      {(user as any)?.isAdmin && !brand.isSystemBrand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteBrand(brand.id);
          }}
          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          title="删除品牌"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </AnimatedCard>
  );

  // 品牌列表项组件
  const BrandListItem: React.FC<{ brand: Brand; onClick: () => void }> = ({ brand, onClick }) => (
    <AnimatedCard 
      className="cursor-pointer hover:shadow-md transition-all duration-200 relative group"
      onClick={onClick}
    >
      <div className="p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-lg sm:text-xl flex-shrink-0 bg-gray-100 dark:bg-gray-700">
          {brand.iconUrl ? (
            <img 
              src={brand.iconUrl} 
              alt={brand.name}
              className="w-full h-full rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) nextElement.style.display = 'block';
              }}
            />
          ) : null}
          <span 
            className={`${brand.iconUrl ? 'hidden' : 'block'} text-gray-600 dark:text-gray-300`}
            style={{ display: brand.iconUrl ? 'none' : 'block' }}
          >
            {brand.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
              {brand.name}
            </h3>
            {brand.businessType === BrandBusinessType.ONLINE ? (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium">
                线上
              </div>
            ) : (
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium">
                线下
              </div>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            {brand.description || '暂无描述'}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          <div className="truncate max-w-[80px]">{getCategoryLabel(brand.category)}</div>
          <div>{brand.createdBy || '系统'}</div>
        </div>
        
        {/* 管理员删除按钮 */}
        {(user as any)?.isAdmin && !brand.isSystemBrand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBrand(brand.id);
            }}
            className="p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex-shrink-0"
            title="删除品牌"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </AnimatedCard>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 头部 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    品牌图鉴
                  </h1>
                  <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    探索支持POS机的品牌，共 {brandStats.totalBrands} 个品牌
                  </p>
                </div>
                
                {/* 视图切换 - 移动端隐藏，默认使用网格视图 */}
                <div className="hidden sm:flex items-center space-x-2">
                  <AnimatedButton
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </AnimatedButton>
                  <AnimatedButton
                    variant={viewMode === 'list' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* 搜索和筛选栏 */}
          <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              {/* 搜索框 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <AnimatedInput
                    type="text"
                    placeholder="搜索品牌..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* 筛选和清除按钮 */}
              <div className="flex space-x-2 sm:space-x-4">
                {/* 筛选按钮 */}
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 sm:flex-none"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  筛选
                </AnimatedButton>
                
                {/* 清除筛选 */}
                {(filters.category?.length || filters.status?.length !== 1 || filters.posSupported !== undefined || searchQuery) && (
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex-1 sm:flex-none"
                  >
                    清除筛选
                  </AnimatedButton>
                )}
              </div>
            </div>

            {/* 筛选面板 */}
            {showFilters && (
              <AnimatedCard className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* 分类筛选 */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm sm:text-base">分类</h3>
                    <div className="space-y-2">
                      {Object.values(BrandCategory).map(category => (
                        <Checkbox
                          key={category}
                          id={`category-${category}`}
                          checked={filters.category?.includes(category) || false}
                          onChange={(checked) => handleCategoryFilter(category, checked)}
                          label={getCategoryLabel(category)}
                        />
                      ))}
                    </div>
                  </div>
                  

                  
                  {/* POS支持筛选 */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm sm:text-base">POS支持</h3>
                    <div className="space-y-2">
                      <Checkbox
                        id="pos-supported"
                        checked={filters.posSupported === true}
                        onChange={(checked) => setFilters(prev => ({ ...prev, posSupported: checked ? true : undefined }))}
                        label="仅显示支持POS的品牌"
                      />
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            )}
          </div>

          {/* 品牌列表 */}
          {filteredBrands.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                未找到匹配的品牌
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                尝试调整搜索条件或筛选选项
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
              : "space-y-3 sm:space-y-4"
            }>
              {filteredBrands.map(brand => 
                viewMode === 'grid' ? (
                  <BrandCard 
                    key={brand.id} 
                    brand={brand} 
                    onClick={() => setSelectedBrand(brand)}
                  />
                ) : (
                  <BrandListItem 
                    key={brand.id} 
                    brand={brand} 
                    onClick={() => setSelectedBrand(brand)}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* 品牌详情模态框 */}
        {selectedBrand && (
          <AnimatedModal
            isOpen={true}
            onClose={() => setSelectedBrand(null)}
            title={selectedBrand.name}
          >
            <div className="space-y-4 sm:space-y-6">
              {/* 品牌基本信息 */}
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                  {selectedBrand.iconUrl ? (
                    <img 
                      src={selectedBrand.iconUrl} 
                      alt={selectedBrand.name}
                      className="w-full h-full rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) nextElement.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <span 
                    className={`${selectedBrand.iconUrl ? 'hidden' : 'block'} text-gray-600 dark:text-gray-300`}
                    style={{ display: selectedBrand.iconUrl ? 'none' : 'block' }}
                  >
                    {selectedBrand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedBrand.name}
                    </h2>
                    {selectedBrand.businessType === BrandBusinessType.ONLINE ? (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                        线上品牌
                      </span>
                    ) : (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                        线下品牌
                      </span>
                    )}
                    {selectedBrand.isSystemBrand && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs font-medium">
                        系统预置
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2">
                    {selectedBrand.description || '暂无描述'}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3 h-3" />
                    <span>创建者: {selectedBrand.createdBy || '系统'}</span>
                    <span>•</span>
                    <span>分类: {getCategoryLabel(selectedBrand.category)}</span>
                  </div>
                </div>
              </div>

              {/* 备注信息 */}
              {selectedBrand.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    备注信息
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed">
                    {selectedBrand.notes}
                  </p>
                </div>
              )}

              {/* 联系信息 */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  品牌信息
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm">
                      <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">
                        业务类型: {selectedBrand.businessType === BrandBusinessType.ONLINE ? '线上服务' : '线下实体'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm">
                      <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">
                        分类: {getCategoryLabel(selectedBrand.category)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedBrand.website && (
                      <div className="flex items-center space-x-2 text-xs sm:text-sm">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <a 
                          href={selectedBrand.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          官方网站
                        </a>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-xs sm:text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">
                        创建时间: {new Date(selectedBrand.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 管理操作 */}
              {(user as any)?.isAdmin && !selectedBrand.isSystemBrand && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    管理操作
                  </h3>
                  <button
                    onClick={() => {
                      if (confirm('确定要删除这个品牌吗？此操作不可撤销。')) {
                        handleDeleteBrand(selectedBrand.id);
                        setSelectedBrand(null);
                      }
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除品牌</span>
                  </button>
                </div>
              )}
            </div>
          </AnimatedModal>
        )}
      </div>
    </PageTransition>
  );
};

export default Brands;
