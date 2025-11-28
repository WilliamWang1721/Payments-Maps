type Listener = () => void

const listeners = new Set<Listener>()

export const triggerTranslation = () => {
  listeners.forEach(listener => {
    try {
      listener()
    } catch (error) {
      console.error('[translationTrigger] Listener error:', error)
    }
  })
}

export const subscribeTranslationTrigger = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
