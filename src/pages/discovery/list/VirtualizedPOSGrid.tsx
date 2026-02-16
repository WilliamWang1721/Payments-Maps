import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import POSListCard from './POSListCard'
import type { POSMachine } from '@/types'

const GRID_BREAKPOINT_MD = 768
const OVERSCAN_ROWS = 3
const ESTIMATED_ROW_HEIGHT = 320
const ROW_GAP_PX = 24

type POSCardRenderMeta = {
  tags: string[]
  createdText: string
  categoryColor: string
  distanceText: string
}

type VirtualizedPOSItem = POSMachine & {
  review_count?: number
  reviewCount?: number
  success_rate?: number | null
}

type VirtualizedPOSGridProps = {
  items: VirtualizedPOSItem[]
  selectionMode: boolean
  searchKeyword: string
  selectedPOSIds: Set<string>
  cardMetaById: Map<string, POSCardRenderMeta>
  canDeleteItem: (createdBy: string) => boolean
  onCardClick: (posId: string, canDelete: boolean) => void
  onToggleSelection: (posId: string) => void
  onOpenDetail: (posId: string) => void
}

type VirtualizedRow = {
  rowIndex: number
  top: number
  items: VirtualizedPOSItem[]
}

const findRowIndexByOffset = (offsets: number[], target: number) => {
  if (offsets.length <= 1) return 0

  let low = 0
  let high = offsets.length - 2

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const start = offsets[mid]
    const end = offsets[mid + 1]

    if (target < start) {
      high = mid - 1
      continue
    }

    if (target >= end) {
      low = mid + 1
      continue
    }

    return mid
  }

  return Math.max(0, Math.min(offsets.length - 2, low))
}

const VirtualizedPOSGrid = ({
  items,
  selectionMode,
  searchKeyword,
  selectedPOSIds,
  cardMetaById,
  canDeleteItem,
  onCardClick,
  onToggleSelection,
  onOpenDetail,
}: VirtualizedPOSGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRafRef = useRef<number | null>(null)

  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({})

  const columnCount = viewportWidth >= GRID_BREAKPOINT_MD ? 2 : 1

  const rows = useMemo(() => {
    const nextRows: VirtualizedPOSItem[][] = []
    for (let index = 0; index < items.length; index += columnCount) {
      nextRows.push(items.slice(index, index + columnCount))
    }
    return nextRows
  }, [columnCount, items])

  useEffect(() => {
    setRowHeights((prev) => {
      let changed = false
      const next: Record<number, number> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const rowIndex = Number(key)
        if (rowIndex < rows.length) {
          next[rowIndex] = value
        } else {
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [rows.length])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const syncViewport = () => {
      setViewportHeight(element.clientHeight)
      setViewportWidth(element.clientWidth)
    }

    syncViewport()

    const onScroll = () => {
      if (scrollRafRef.current !== null) return
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null
        setScrollTop(element.scrollTop)
      })
    }

    element.addEventListener('scroll', onScroll, { passive: true })

    let resizeObserver: ResizeObserver | null = null
    const supportsResizeObserver = typeof ResizeObserver !== 'undefined'
    if (supportsResizeObserver) {
      resizeObserver = new ResizeObserver(syncViewport)
      resizeObserver.observe(element)
    } else {
      window.addEventListener('resize', syncViewport)
    }

    return () => {
      element.removeEventListener('scroll', onScroll)
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', syncViewport)
      }
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [])

  const rowOffsets = useMemo(() => {
    const offsets = new Array(rows.length + 1).fill(0)
    for (let index = 0; index < rows.length; index += 1) {
      offsets[index + 1] = offsets[index] + (rowHeights[index] ?? ESTIMATED_ROW_HEIGHT)
    }
    return offsets
  }, [rowHeights, rows.length])

  const totalHeight = rowOffsets[rowOffsets.length - 1] ?? 0

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const maxScrollTop = Math.max(totalHeight - viewportHeight, 0)
    if (element.scrollTop > maxScrollTop) {
      element.scrollTop = maxScrollTop
      setScrollTop(maxScrollTop)
    }
  }, [totalHeight, viewportHeight])

  const [startIndex, endIndex] = useMemo(() => {
    if (rows.length === 0) {
      return [0, -1] as const
    }

    const safeViewportHeight = Math.max(viewportHeight, 1)
    const firstVisible = findRowIndexByOffset(rowOffsets, Math.max(scrollTop, 0))
    const lastVisible = findRowIndexByOffset(rowOffsets, scrollTop + safeViewportHeight)

    return [
      Math.max(firstVisible - OVERSCAN_ROWS, 0),
      Math.min(lastVisible + OVERSCAN_ROWS, rows.length - 1),
    ] as const
  }, [rowOffsets, rows.length, scrollTop, viewportHeight])

  const visibleRows = useMemo<VirtualizedRow[]>(() => {
    if (endIndex < startIndex) return []
    const rowsToRender: VirtualizedRow[] = []
    for (let rowIndex = startIndex; rowIndex <= endIndex; rowIndex += 1) {
      rowsToRender.push({
        rowIndex,
        top: rowOffsets[rowIndex],
        items: rows[rowIndex] || [],
      })
    }
    return rowsToRender
  }, [endIndex, rowOffsets, rows, startIndex])

  const handleRowHeightChange = useCallback((rowIndex: number, nextHeight: number) => {
    setRowHeights((prev) => {
      const rounded = Math.max(Math.ceil(nextHeight), 1)
      if (prev[rowIndex] === rounded) return prev
      return {
        ...prev,
        [rowIndex]: rounded,
      }
    })
  }, [])

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-5 sm:p-10 pt-5 custom-scrollbar">
      <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
        {visibleRows.map((row) => (
          <MeasuredPOSRow
            key={row.rowIndex}
            rowIndex={row.rowIndex}
            top={row.top}
            columnCount={columnCount}
            items={row.items}
            selectionMode={selectionMode}
            searchKeyword={searchKeyword}
            selectedPOSIds={selectedPOSIds}
            cardMetaById={cardMetaById}
            canDeleteItem={canDeleteItem}
            onCardClick={onCardClick}
            onToggleSelection={onToggleSelection}
            onOpenDetail={onOpenDetail}
            onHeightChange={handleRowHeightChange}
          />
        ))}
      </div>
    </div>
  )
}

type MeasuredPOSRowProps = {
  rowIndex: number
  top: number
  columnCount: number
  items: VirtualizedPOSItem[]
  selectionMode: boolean
  searchKeyword: string
  selectedPOSIds: Set<string>
  cardMetaById: Map<string, POSCardRenderMeta>
  canDeleteItem: (createdBy: string) => boolean
  onCardClick: (posId: string, canDelete: boolean) => void
  onToggleSelection: (posId: string) => void
  onOpenDetail: (posId: string) => void
  onHeightChange: (rowIndex: number, nextHeight: number) => void
}

const MeasuredPOSRow = memo(({
  rowIndex,
  top,
  columnCount,
  items,
  selectionMode,
  searchKeyword,
  selectedPOSIds,
  cardMetaById,
  canDeleteItem,
  onCardClick,
  onToggleSelection,
  onOpenDetail,
  onHeightChange,
}: MeasuredPOSRowProps) => {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = rowRef.current
    if (!element) return

    const syncHeight = () => {
      onHeightChange(rowIndex, element.getBoundingClientRect().height)
    }

    syncHeight()

    const supportsResizeObserver = typeof ResizeObserver !== 'undefined'
    if (!supportsResizeObserver) return

    const observer = new ResizeObserver(syncHeight)
    observer.observe(element)

    return () => observer.disconnect()
  }, [columnCount, items.length, onHeightChange, rowIndex])

  return (
    <div className="absolute left-0 right-0" style={{ top }}>
      <div ref={rowRef} style={{ paddingBottom: `${ROW_GAP_PX}px` }}>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {items.map((pos) => {
            const canDeleteThis = canDeleteItem(pos.created_by || '')
            const isSelected = selectedPOSIds.has(pos.id)
            const cardMeta = cardMetaById.get(pos.id)

            return (
              <div key={pos.id} onClick={() => onCardClick(pos.id, canDeleteThis)}>
                <POSListCard
                  pos={pos}
                  canDelete={canDeleteThis}
                  isSelected={isSelected}
                  selectionMode={selectionMode}
                  searchKeyword={searchKeyword}
                  tags={cardMeta?.tags || []}
                  createdText={cardMeta?.createdText || ''}
                  categoryColor={cardMeta?.categoryColor || 'bg-accent-yellow'}
                  distanceText={cardMeta?.distanceText || ''}
                  onToggleSelection={onToggleSelection}
                  onOpenDetail={onOpenDetail}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

MeasuredPOSRow.displayName = 'MeasuredPOSRow'

export default memo(VirtualizedPOSGrid)
