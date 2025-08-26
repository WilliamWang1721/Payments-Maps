import React from 'react'
import { Clock, X, Search } from 'lucide-react'
import { AnimatedSearchResults, AnimatedSearchItem } from '@/components/AnimatedSearchResults'

interface SearchSuggestionsProps {
  searchHistory: string[]
  suggestions: string[]
  onSelectSuggestion: (suggestion: string) => void
  onRemoveHistory: (keyword: string) => void
  onClearHistory: () => void
  isVisible: boolean
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  searchHistory,
  suggestions,
  onSelectSuggestion,
  onRemoveHistory,
  onClearHistory,
  isVisible
}) => {
  if (!isVisible) return null

  const hasHistory = searchHistory.length > 0
  const hasSuggestions = suggestions.length > 0

  if (!hasHistory && !hasSuggestions) return null

  return (
    <AnimatedSearchResults 
      isVisible={isVisible}
      className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
    >
      {/* 搜索历史 */}
      {hasHistory && (
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">搜索历史</span>
            <button
              onClick={onClearHistory}
              className="text-xs text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] touch-manipulation webkit-tap-highlight-none p-2 rounded"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              清除
            </button>
          </div>
          {searchHistory.map((keyword, index) => (
            <AnimatedSearchItem
              key={index}
              index={index}
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded cursor-pointer group"
              onClick={() => onSelectSuggestion(keyword)}
            >
              <div className="flex items-center flex-1">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700">{keyword}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveHistory(keyword)
                }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded min-h-[44px] min-w-[44px] touch-manipulation webkit-tap-highlight-none"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </AnimatedSearchItem>
          ))}
        </div>
      )}

      {/* 分隔线 */}
      {hasHistory && hasSuggestions && (
        <div className="border-t border-gray-100" />
      )}

      {/* 搜索建议 */}
      {hasSuggestions && (
        <div className="p-2">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-600">搜索建议</span>
          </div>
          {suggestions.map((suggestion, index) => (
            <AnimatedSearchItem
              key={index}
              index={index}
              className="flex items-center py-2 px-3 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => onSelectSuggestion(suggestion)}
            >
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-700">{suggestion}</span>
            </AnimatedSearchItem>
          ))}
        </div>
      )}
    </AnimatedSearchResults>
  )
}