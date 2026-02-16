import { useEffect } from 'react'

interface UseBodyScrollLockOptions {
  includeHtml?: boolean
}

let bodyLockCount = 0
let htmlLockCount = 0
let previousBodyOverflow: string | null = null
let previousHtmlOverflow: string | null = null

const lockBody = () => {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyLockCount += 1
}

const unlockBody = () => {
  bodyLockCount = Math.max(0, bodyLockCount - 1)
  if (bodyLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow ?? ''
    previousBodyOverflow = null
  }
}

const lockHtml = () => {
  if (htmlLockCount === 0) {
    previousHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  htmlLockCount += 1
}

const unlockHtml = () => {
  htmlLockCount = Math.max(0, htmlLockCount - 1)
  if (htmlLockCount === 0) {
    document.documentElement.style.overflow = previousHtmlOverflow ?? ''
    previousHtmlOverflow = null
  }
}

export const useBodyScrollLock = (locked: boolean, options: UseBodyScrollLockOptions = {}) => {
  const { includeHtml = false } = options

  useEffect(() => {
    if (typeof document === 'undefined' || !locked) return

    lockBody()
    if (includeHtml) {
      lockHtml()
    }

    return () => {
      unlockBody()
      if (includeHtml) {
        unlockHtml()
      }
    }
  }, [includeHtml, locked])
}
