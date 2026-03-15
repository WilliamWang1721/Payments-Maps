import { useCallback, useState } from 'react'

export type POSListSortOption = 'distance' | 'rating' | 'successRate' | 'createdAt'
export type POSAttemptStats = Record<string, { success: number; total: number; rate: number | null }>

export const usePOSListUIState = () => {
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<POSListSortOption>('distance')
  const [attemptStats, setAttemptStats] = useState<POSAttemptStats>({})
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPOSIds, setSelectedPOSIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkRefreshingAddress, setBulkRefreshingAddress] = useState(false)

  const clearSelection = useCallback(() => {
    setSelectedPOSIds(new Set())
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedPOSIds(new Set())
      }
      return !prev
    })
  }, [])

  const togglePosSelection = useCallback((posId: string) => {
    setSelectedPOSIds((prev) => {
      const next = new Set(prev)
      if (next.has(posId)) {
        next.delete(posId)
      } else {
        next.add(posId)
      }
      return next
    })
  }, [])

  return {
    showFilters,
    setShowFilters,
    sortBy,
    setSortBy,
    attemptStats,
    setAttemptStats,
    selectionMode,
    setSelectionMode,
    selectedPOSIds,
    setSelectedPOSIds,
    bulkDeleting,
    setBulkDeleting,
    bulkRefreshingAddress,
    setBulkRefreshingAddress,
    selectedCount: selectedPOSIds.size,
    clearSelection,
    toggleSelectionMode,
    togglePosSelection,
  }
}
