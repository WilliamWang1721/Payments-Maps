import React, { memo, useMemo } from 'react'

interface HighlightTextProps {
  text: string
  searchKeyword: string
  className?: string
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  searchKeyword,
  className = ''
}) => {
  const keyword = useMemo(() => searchKeyword.trim().toLowerCase(), [searchKeyword])

  const parts = useMemo(() => {
    if (!text || !keyword) {
      return null
    }

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.split(regex)
  }, [keyword, text])

  if (!keyword || !text || !parts) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === keyword
        return isMatch ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 px-1 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </span>
  )
}

export default memo(HighlightText)
