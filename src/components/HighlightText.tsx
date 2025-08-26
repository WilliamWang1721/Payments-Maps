import React from 'react'

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
  if (!searchKeyword || !text) {
    return <span className={className}>{text}</span>
  }

  const keyword = searchKeyword.trim().toLowerCase()
  if (!keyword) {
    return <span className={className}>{text}</span>
  }

  // 使用正则表达式进行不区分大小写的匹配
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

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