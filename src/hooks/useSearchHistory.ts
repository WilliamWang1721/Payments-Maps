import { useState, useEffect } from 'react'

const SEARCH_HISTORY_KEY = 'pos_search_history'
const MAX_HISTORY_ITEMS = 10

export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // 从localStorage加载搜索历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (saved) {
        setSearchHistory(JSON.parse(saved))
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    }
  }, [])

  // 添加搜索记录
  const addSearchHistory = (keyword: string) => {
    if (!keyword.trim()) return
    
    const trimmedKeyword = keyword.trim()
    setSearchHistory(prev => {
      // 移除重复项
      const filtered = prev.filter(item => item !== trimmedKeyword)
      // 添加到开头
      const newHistory = [trimmedKeyword, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      
      // 保存到localStorage
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      } catch (error) {
        console.error('保存搜索历史失败:', error)
      }
      
      return newHistory
    })
  }

  // 清除搜索历史
  const clearSearchHistory = () => {
    setSearchHistory([])
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY)
    } catch (error) {
      console.error('清除搜索历史失败:', error)
    }
  }

  // 删除单个搜索记录
  const removeSearchHistory = (keyword: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item !== keyword)
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      } catch (error) {
        console.error('删除搜索历史失败:', error)
      }
      return newHistory
    })
  }

  return {
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    removeSearchHistory
  }
}