import { memo, useMemo } from 'react'
import { ArrowRight, Calendar, MapPin, MoreHorizontal, Navigation } from 'lucide-react'
import { HighlightText } from '@/components/HighlightText'
import type { POSMachine } from '@/types'

type POSListCardProps = {
  pos: POSMachine
  canDelete: boolean
  isSelected: boolean
  selectionMode: boolean
  searchKeyword: string
  tags: string[]
  createdText: string
  categoryColor: string
  distanceText: string
  onToggleSelection: (posId: string) => void
  onOpenDetail: (posId: string) => void
}

const POSListCard = ({
  pos,
  canDelete,
  isSelected,
  selectionMode,
  searchKeyword,
  tags,
  createdText,
  categoryColor,
  distanceText,
  onToggleSelection,
  onOpenDetail,
}: POSListCardProps) => {
  const displayName = pos.merchant_name || pos.address || 'POS机'
  const badgeLetter = displayName.charAt(0)

  const cardClassName = useMemo(
    () =>
      [
        'group relative bg-white border border-gray-100 rounded-3xl p-6 flex flex-col gap-6 transition-all duration-300 hover:shadow-soft hover:border-blue-100 hover:translate-x-0.5 cursor-pointer',
        selectionMode && isSelected ? 'border-blue-300 bg-blue-50/50 shadow-soft' : '',
        selectionMode && !canDelete ? 'cursor-not-allowed opacity-90' : '',
      ]
        .join(' ')
        .trim(),
    [canDelete, isSelected, selectionMode]
  )

  return (
    <div className={cardClassName}>
      <div className="flex items-start gap-5 flex-1">
        {selectionMode && (
          <label
            className={`flex-shrink-0 mt-1 ${canDelete ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              className="w-4 h-4 text-soft-black border-gray-300 rounded focus:ring-soft-black"
              disabled={!canDelete}
              checked={isSelected}
              onChange={(event) => {
                event.stopPropagation()
                if (canDelete) {
                  onToggleSelection(pos.id)
                }
              }}
              aria-label={`选择 ${displayName}`}
            />
          </label>
        )}

        <div className={`w-14 h-14 rounded-2xl ${categoryColor} flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-300`}>
          <span className="font-bold text-lg">{badgeLetter}</span>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <h3 className="font-bold text-lg text-soft-black group-hover:text-accent-yellow transition-colors">
            <HighlightText text={pos.merchant_name} searchKeyword={searchKeyword} />
          </h3>

          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              <HighlightText text={pos.address} searchKeyword={searchKeyword} />
            </span>
          </div>

          {pos.basic_info?.acquiring_institution && (
            <div className="text-xs font-medium text-gray-500">
              收单机构：<span className="text-soft-black">{pos.basic_info.acquiring_institution}</span>
            </div>
          )}

          {pos.remarks && (
            <div className="text-xs text-gray-500 bg-cream px-3 py-1.5 rounded-2xl inline-flex items-start border border-transparent max-w-full">
              <span className="line-clamp-2 break-words whitespace-normal">{pos.remarks}</span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-cream text-gray-500 border border-transparent hover:border-accent-yellow/30 hover:text-accent-yellow transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-start gap-1.5">
          {distanceText && (
            <div className="flex items-center gap-1.5 text-accent-yellow font-bold text-sm bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
              <Navigation className="w-3.5 h-3.5" />
              {distanceText}
            </div>
          )}

          {createdText && (
            <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-medium whitespace-nowrap">
              <Calendar className="w-3 h-3" />
              {createdText}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-soft-black hover:text-white hover:border-transparent transition-all active:scale-95 group/btn"
            onClick={(event) => {
              event.stopPropagation()
              onOpenDetail(pos.id)
            }}
          >
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
          <button
            type="button"
            className="p-2 text-gray-300 hover:text-soft-black transition-colors rounded-full hover:bg-gray-50"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(POSListCard)
