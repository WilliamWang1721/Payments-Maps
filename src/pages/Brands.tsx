import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, Grid, List, Globe, Calendar, Plus, Trash2, User, FileText, Building, Tag, Settings } from 'lucide-react';
import { Brand, BrandCategory, BrandBusinessType, BrandFilterOptions } from '../types/brands';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import AnimatedCard from '../components/ui/AnimatedCard';
import AnimatedInput from '../components/ui/AnimatedInput';
import Checkbox from '../components/ui/Checkbox';
import AnimatedModal from '../components/ui/AnimatedModal';
import PageTransition from '../components/PageTransition';
import AddBrandModal from '../components/AddBrandModal';
import { getErrorDetails, notify } from '../lib/notify';

const Brands: React.FC = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<BrandBusinessType | 'all'>('all');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [headerScale, setHeaderScale] = useState(1);
  const [filterScale, setFilterScale] = useState(1);
  const [listScale, setListScale] = useState(1);
  const [filters, setFilters] = useState<BrandFilterOptions>({
    category: [],
    businessType: activeTab === 'all' ? [] : [activeTab as BrandBusinessType],
    searchQuery: ''
  });

  // 加载品牌数据
  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          profiles:created_by(username)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加载品牌失败:', error);
        notify.critical('加载品牌失败', {
          title: '加载品牌失败',
          details: getErrorDetails(error),
        });
        return;
      }

      setBrands(data || []);
    } catch (error) {
      console.error('加载品牌失败:', error);
      notify.critical('加载品牌失败', {
        title: '加载品牌失败',
        details: getErrorDetails(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    setFilters(prev => ({ 
      ...prev, 
      businessType: activeTab === 'all' ? [] : [activeTab as BrandBusinessType] 
    }));
  }, [activeTab]);

  useEffect(() => {
    const container =
      pageRef.current?.closest('.custom-scrollbar') ||
      pageRef.current?.closest('[data-scroll-container]') ||
      window;

    let rafId = 0;

    const updateScales = () => {
      const scrollTop = container instanceof Window
        ? window.scrollY
        : (container as HTMLElement).scrollTop;
      const scrollHeight = container instanceof Window
        ? document.documentElement.scrollHeight
        : (container as HTMLElement).scrollHeight;
      const clientHeight = container instanceof Window
        ? window.innerHeight
        : (container as HTMLElement).clientHeight;
      const maxScroll = Math.max(scrollHeight - clientHeight, 1);
      const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      const nextHeaderScale = 1 - progress * 0.06;
      const nextFilterScale = 1 - progress * 0.04;
      const nextListScale = 1 + progress * 0.06;
      setHeaderScale(Math.max(nextHeaderScale, 0.92));
      setFilterScale(Math.max(nextFilterScale, 0.94));
      setListScale(Math.min(nextListScale, 1.08));
    };

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScales);
    };

    updateScales();

    if (container instanceof Window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);
    } else {
      (container as HTMLElement).addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (container instanceof Window) {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      } else {
        (container as HTMLElement).removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      }
    };
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
      notify.error('只有管理员可以删除品牌');
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
        notify.error('删除品牌失败：' + error.message);
        return;
      }

      notify.success('品牌删除成功');
      loadBrands();
      setSelectedBrand(null);
    } catch (error) {
      console.error('删除品牌失败:', error);
      notify.error('删除品牌失败');
    }
  };

  // 清除筛选条件
  const clearFilters = () => {
    setFilters({
      category: [],
      businessType: activeTab === 'all' ? [] : [activeTab as BrandBusinessType],
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

  const hasActiveFilters = Boolean(
    searchQuery || (filters.category?.length && filters.category.length > 0) || filters.posSupported !== undefined
  );

  const tabs = [
    { key: 'all' as const, label: '全部品牌', count: brandStats.totalBrands },
    { key: BrandBusinessType.ONLINE, label: '线上品牌', count: brandStats.onlineBrands },
    { key: BrandBusinessType.OFFLINE, label: '线下品牌', count: brandStats.offlineBrands }
  ];

  // 品牌卡片组件
  const BrandCard: React.FC<{ brand: Brand; onClick: () => void }> = ({ brand, onClick }) => (
    <AnimatedCard 
      className="cursor-pointer relative group rounded-2xl border border-white/70 bg-gradient-to-br from-white/95 via-white/90 to-cream/80 shadow-sm hover:shadow-soft transition-all duration-300 hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-cream border border-white shadow-inner">
              {brand.iconUrl ? (
                <img 
                  src={brand.iconUrl} 
                  alt={brand.name}
                  className="w-full h-full rounded-2xl object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) nextElement.style.display = 'block';
                  }}
                />
              ) : null}
              <span 
                className={`${brand.iconUrl ? 'hidden' : 'block'} text-gray-600 dark:text-gray-300 font-semibold`}
                style={{ display: brand.iconUrl ? 'none' : 'block' }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg text-soft-black dark:text-white truncate">
                {brand.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {getCategoryLabel(brand.category)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {brand.businessType === BrandBusinessType.ONLINE ? (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                线上
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                线下
              </span>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm line-clamp-2">
          {brand.description || '暂无描述'}
        </p>
        
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <User className="w-3.5 h-3.5" />
            <span>{brand.createdBy || '系统'}</span>
          </div>
          <div className="flex items-center gap-2">
            {brand.notes && (
              <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full text-xs font-medium">
                有备注
              </span>
            )}
            {brand.posSupport?.supported && (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-xs font-medium">
                POS支持
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* 管理员删除按钮 */}
      {(user as any)?.isAdmin && !brand.isSystemBrand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteBrand(brand.id);
          }}
          className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 border border-red-100 shadow-sm"
          title="删除品牌"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </AnimatedCard>
  );

  // 品牌列表项组件
  const BrandListItem: React.FC<{ brand: Brand; onClick: () => void }> = ({ brand, onClick }) => (
    <AnimatedCard 
      className="cursor-pointer relative group rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-soft transition-all duration-200"
      onClick={onClick}
    >
      <div className="p-4 sm:p-5 flex items-center space-x-4">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-cream border border-white shadow-inner">
          {brand.iconUrl ? (
            <img 
              src={brand.iconUrl} 
              alt={brand.name}
              className="w-full h-full rounded-xl object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) nextElement.style.display = 'block';
              }}
            />
          ) : null}
          <span 
            className={`${brand.iconUrl ? 'hidden' : 'block'} text-gray-600 dark:text-gray-300 font-semibold`}
            style={{ display: brand.iconUrl ? 'none' : 'block' }}
          >
            {brand.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-sm sm:text-base text-soft-black dark:text-white truncate">
              {brand.name}
            </h3>
            {brand.businessType === BrandBusinessType.ONLINE ? (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                线上
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                线下
              </span>
            )}
            {brand.posSupport?.supported && (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                POS支持
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
            {brand.description || '暂无描述'}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          <div className="truncate max-w-[100px]">{getCategoryLabel(brand.category)}</div>
          <div>{brand.createdBy || '系统'}</div>
        </div>
        
        {/* 管理员删除按钮 */}
        {(user as any)?.isAdmin && !brand.isSystemBrand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBrand(brand.id);
            }}
            className="p-2 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 border border-red-100 shadow-sm flex-shrink-0"
            title="删除品牌"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </AnimatedCard>
  );

  return (
    <PageTransition>
      <div ref={pageRef} className="space-y-6 pb-24">
        <section
          className="bg-white rounded-[32px] shadow-soft border border-white/60 overflow-hidden animate-fade-in-up"
          style={{ transform: `scale(${headerScale})`, transformOrigin: 'top center', willChange: 'transform' }}
        >
          <div className="p-6 sm:p-8 flex flex-col gap-6 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 text-accent-purple flex items-center justify-center shadow-soft">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Brand Library</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-soft-black">品牌图鉴</h1>
                  <p className="text-sm text-gray-500">探索支持 POS 机的品牌，共 {brandStats.totalBrands} 个品牌。</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {(user as any) && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-soft-black text-white hover:bg-accent-yellow transition-all shadow-soft text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    添加品牌
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`h-11 w-11 rounded-2xl border shadow-soft transition-all flex items-center justify-center ${
                      viewMode === 'grid'
                        ? 'bg-soft-black text-white border-soft-black'
                        : 'bg-white text-gray-500 border-gray-100 hover:text-accent-yellow'
                    }`}
                    aria-label="网格视图"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`h-11 w-11 rounded-2xl border shadow-soft transition-all flex items-center justify-center ${
                      viewMode === 'list'
                        ? 'bg-soft-black text-white border-soft-black'
                        : 'bg-white text-gray-500 border-gray-100 hover:text-accent-yellow'
                    }`}
                    aria-label="列表视图"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-cream border border-white shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-accent-purple">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">总品牌数</p>
                  <p className="text-xl font-bold text-soft-black">{brandStats.totalBrands}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-soft">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">线上品牌</p>
                  <p className="text-xl font-bold text-soft-black">{brandStats.onlineBrands}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-cream border border-white shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-soft">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">线下品牌</p>
                  <p className="text-xl font-bold text-soft-black">{brandStats.offlineBrands}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                    activeTab === tab.key
                      ? 'bg-soft-black text-white border-soft-black shadow-soft'
                      : 'bg-white text-gray-600 border-gray-100 hover:border-accent-yellow/50 hover:text-accent-yellow'
                  }`}
                >
                  {tab.label}
                  <span className="px-2 py-0.5 rounded-full bg-white/80 text-gray-600 text-[10px] font-semibold">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          className="bg-white rounded-[32px] shadow-soft border border-white/60 p-6 sm:p-8 space-y-4"
          style={{ transform: `scale(${filterScale})`, transformOrigin: 'top center', willChange: 'transform' }}
        >
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <AnimatedInput
                  type="text"
                  placeholder="搜索品牌、描述或备注..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 rounded-2xl bg-cream/70 border-white/80 focus:ring-accent-yellow/40 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-2 sm:space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-accent-yellow/50 hover:text-accent-yellow hover:shadow-soft transition-all bg-white flex-1 sm:flex-none"
              >
                <Filter className="w-4 h-4" />
                筛选
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-accent-yellow/50 hover:text-accent-yellow hover:shadow-soft transition-all bg-white flex-1 sm:flex-none"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 sm:p-6 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-semibold text-soft-black mb-3 text-sm sm:text-base">分类</h3>
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

                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className="font-semibold text-soft-black mb-3 text-sm sm:text-base">POS支持</h3>
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
            </div>
          )}
        </section>

        <section
          className="bg-white rounded-[32px] shadow-soft border border-white/60 p-6 sm:p-8"
          style={{ transform: `scale(${listScale})`, transformOrigin: 'top center', willChange: 'transform' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="bg-cream rounded-2xl border border-white/70 px-6 py-4 text-sm text-gray-500 shadow-soft">
                正在加载品牌数据...
              </div>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-soft-black mb-2">
                未找到匹配的品牌
              </h3>
              <p className="text-sm text-gray-500">
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
        </section>

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
      <AddBrandModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadBrands}
      />
    </PageTransition>
  );
};

export default Brands;
