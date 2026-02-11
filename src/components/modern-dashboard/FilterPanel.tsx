import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Building2, CalendarClock, CreditCard, Filter, GaugeCircle, RefreshCw, Settings, Shield, SlidersHorizontal, X } from 'lucide-react'
import AnimatedModal from '@/components/ui/AnimatedModal'
import Button from '@/components/ui/Button'
import type { MapState } from '@/stores/useMapStore'

type FiltersState = MapState['filters']

type FilterPanelProps = {
  isOpen: boolean
  onClose: () => void
  filters: FiltersState
  setFilters: (filters: Partial<FiltersState>) => void
  onApply: () => void
  onReset: () => void
  variant?: 'modal' | 'map'
}

const pillBase =
  'px-3 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-2 shadow-soft hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-1'

const checkboxClass =
  'w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'

const FilterPanel = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  onApply,
  onReset,
  variant = 'modal',
}: FilterPanelProps) => {
  useEffect(() => {
    if (typeof document === 'undefined' || variant !== 'map' || !isOpen) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isOpen, variant])

  const appliedCount = useMemo(() => {
    return Object.entries(filters).filter(([_, val]) => val !== undefined && val !== '' && val !== false).length
  }, [filters])

  const footer = (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={() => {
          onReset()
        }}
        className="flex-1"
      >
        重置
      </Button>
      <Button
        onClick={() => {
          onApply()
        }}
        className="flex-1"
      >
        应用筛选
      </Button>
    </div>
  )

  const panelContent = (
    <div className="space-y-8">
        <div className="flex items-center gap-3 text-sm text-gray-600 bg-cream rounded-2xl px-4 py-3 border border-gray-100">
          <Filter className="w-4 h-4 text-accent-yellow" />
          <span>已选择 {appliedCount} 项条件</span>
        </div>

        {/* 支付方式 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <CreditCard className="w-5 h-5 text-blue-600" />
            支付方式
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['supportsApplePay', 'Apple Pay'],
              ['supportsGooglePay', 'Google Pay'],
              ['supportsContactless', '闪付'],
              ['supportsHCE', 'HCE'],
            ].map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-3 py-2 hover:border-accent-yellow/50 transition-all">
                <input
                  type="checkbox"
                  checked={Boolean((filters as any)[key])}
                  onChange={(e) => setFilters({ [key]: e.target.checked } as Partial<FiltersState>)}
                  className={checkboxClass}
                />
                <span className="text-sm text-soft-black dark:text-gray-100">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 卡组织 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Building2 className="w-5 h-5 text-green-600" />
            卡组织支持
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['supportsVisa', 'Visa'],
              ['supportsMastercard', 'Mastercard'],
              ['supportsUnionPay', '银联'],
              ['supportsAmex', 'American Express'],
              ['supportsJCB', 'JCB'],
              ['supportsDiners', 'Diners Club'],
              ['supportsDiscover', 'Discover'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ [key]: !(filters as any)[key] } as Partial<FiltersState>)}
                className={`${pillBase} ${ (filters as any)[key] ? 'bg-soft-black text-white border-soft-black' : 'bg-white text-gray-700 border-gray-100 hover:border-accent-yellow/50' }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* 验证模式 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Shield className="w-5 h-5 text-purple-600" />
            验证模式
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ['supportsSmallAmountExemption', '小额免密'],
              ['supportsPinVerification', 'PIN 验证'],
              ['supportsSignatureVerification', '签名验证'],
            ].map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-3 py-2 hover:border-accent-yellow/50 transition-all">
                <input
                  type="checkbox"
                  checked={Boolean((filters as any)[key])}
                  onChange={(e) => setFilters({ [key]: e.target.checked } as Partial<FiltersState>)}
                  className={checkboxClass}
                />
                <span className="text-sm text-soft-black dark:text-gray-100">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 收单模式 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Settings className="w-5 h-5 text-orange-600" />
            收单模式
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['supportsDCC', 'DCC 支持'],
              ['supportsEDC', 'EDC 支持'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ [key]: !(filters as any)[key] } as Partial<FiltersState>)}
                className={`${pillBase} ${ (filters as any)[key] ? 'bg-soft-black text-white border-soft-black' : 'bg-white text-gray-700 border-gray-100 hover:border-accent-yellow/50' }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* 其他条件 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            其他条件
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">收单机构</label>
              <input
                type="text"
                value={filters.acquiringInstitution || ''}
                onChange={(e) => setFilters({ acquiringInstitution: e.target.value || undefined })}
                placeholder="输入收单机构名称"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">POS 机型号</label>
              <input
                type="text"
                value={filters.posModel || ''}
                onChange={(e) => setFilters({ posModel: e.target.value || undefined })}
                placeholder="输入型号"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">设备状态</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              >
                <option value="">不限</option>
                <option value="active">正常运行</option>
                <option value="inactive">暂时不可用</option>
                <option value="maintenance">维修中</option>
                <option value="disabled">已停用</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">收银位置</label>
              <select
                value={filters.checkoutLocation || ''}
                onChange={(e) => setFilters({ checkoutLocation: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              >
                <option value="">不限</option>
                <option value="自助收银">自助收银</option>
                <option value="人工收银">人工收银</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">商户类型</label>
              <input
                type="text"
                value={filters.merchantType || ''}
                onChange={(e) => setFilters({ merchantType: e.target.value || undefined })}
                placeholder="输入商户类型"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">最低免密金额</label>
              <input
                type="number"
                value={filters.minAmountNoPin ?? ''}
                onChange={(e) => setFilters({ minAmountNoPin: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="最小金额"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">最高免密金额</label>
              <input
                type="number"
                value={filters.maxAmountNoPin ?? ''}
                onChange={(e) => setFilters({ maxAmountNoPin: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="最大金额"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
            <label className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-3 py-2 hover:border-accent-yellow/50 transition-all">
              <input
                type="checkbox"
                checked={Boolean(filters.hasRemarks)}
                onChange={(e) => setFilters({ hasRemarks: e.target.checked })}
                className={checkboxClass}
              />
              <span className="text-sm text-soft-black dark:text-gray-100">有备注信息</span>
            </label>
            <label className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-3 py-2 hover:border-accent-yellow/50 transition-all">
              <input
                type="checkbox"
                checked={Boolean(filters.hasReviews)}
                onChange={(e) => setFilters({ hasReviews: e.target.checked })}
                className={checkboxClass}
              />
              <span className="text-sm text-soft-black dark:text-gray-100">有评价</span>
            </label>
          </div>
        </section>

        {/* 高级筛选 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <GaugeCircle className="w-5 h-5 text-indigo-600" />
            高级筛选
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">最低评分</label>
              <select
                value={filters.minRating ?? ''}
                onChange={(e) => setFilters({ minRating: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              >
                <option value="">不限</option>
                <option value="1">1 星及以上</option>
                <option value="2">2 星及以上</option>
                <option value="3">3 星及以上</option>
                <option value="4">4 星及以上</option>
                <option value="5">5 星</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">最大距离</label>
              <select
                value={filters.maxDistance ?? ''}
                onChange={(e) => setFilters({ maxDistance: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              >
                <option value="">不限</option>
                <option value="0.5">500米内</option>
                <option value="1">1公里内</option>
                <option value="2">2公里内</option>
                <option value="5">5公里内</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">排序优先</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Button
                    variant={filters.maxDistance !== undefined ? 'primary' : 'ghost'}
                    className="w-full"
                    onClick={() => setFilters({ maxDistance: filters.maxDistance ?? 2 })}
                  >
                    距离优先
                  </Button>
                </div>
                <div className="flex-1">
                  <Button
                    variant={filters.minRating !== undefined ? 'primary' : 'ghost'}
                    className="w-full"
                    onClick={() => setFilters({ minRating: filters.minRating ?? 4 })}
                  >
                    评分优先
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 创建时间 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            创建时间
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">开始日期</label>
              <input
                type="date"
                value={filters.createdAfter || ''}
                onChange={(e) => setFilters({ createdAfter: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">结束日期</label>
              <input
                type="date"
                value={filters.createdBefore || ''}
                onChange={(e) => setFilters({ createdBefore: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-yellow/40 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const oneWeekAgo = new Date()
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
                setFilters({ createdAfter: oneWeekAgo.toISOString().split('T')[0] })
              }}
              className={`${pillBase} bg-white text-gray-700 border-gray-100 hover:border-accent-yellow/50`}
            >
              最近一周
            </button>
            <button
              type="button"
              onClick={() => {
                const oneMonthAgo = new Date()
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
                setFilters({ createdAfter: oneMonthAgo.toISOString().split('T')[0] })
              }}
              className={`${pillBase} bg-white text-gray-700 border-gray-100 hover:border-accent-yellow/50`}
            >
              最近一个月
            </button>
            <button
              type="button"
              onClick={() => {
                const threeMonthsAgo = new Date()
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                setFilters({ createdAfter: threeMonthsAgo.toISOString().split('T')[0] })
              }}
              className={`${pillBase} bg-white text-gray-700 border-gray-100 hover:border-accent-yellow/50`}
            >
              最近三个月
            </button>
          </div>
        </section>

        {/* 数据刷新提示 */}
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-3 py-2">
          <RefreshCw className="w-4 h-4" />
          调整筛选后，点击“应用筛选”立即刷新列表 / 地图数据。
        </div>
      </div>
  )

  if (variant === 'map') {
    const mapDrawer = (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
              className="absolute right-6 top-6 bottom-6 w-[min(48%,720px)] bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/60 flex flex-col overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Filter className="w-4 h-4 text-accent-yellow" />
                  筛选条件
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {panelContent}
              </div>
              <div className="border-t border-gray-100 p-5 bg-white/80">
                {footer}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )

    if (typeof document === 'undefined') {
      return null
    }

    return createPortal(mapDrawer, document.body)
  }

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      title="筛选条件"
      size="4xl"
      className="rounded-3xl"
      footer={footer}
    >
      {panelContent}
    </AnimatedModal>
  )
}

export default FilterPanel
