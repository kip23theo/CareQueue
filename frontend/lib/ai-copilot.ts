const STORAGE_KEY = 'cq_ai_panel_open'
const STORAGE_EVENT = 'cq-ai-panel-open-change'

export function getAICopilotOpenState() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setAICopilotOpenState(isOpen: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, String(isOpen))
  window.dispatchEvent(new Event(STORAGE_EVENT))
}

export function subscribeAICopilotOpenState(onStoreChange: () => void) {
  window.addEventListener(STORAGE_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)

  return () => {
    window.removeEventListener(STORAGE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function openAICopilotDialog() {
  setAICopilotOpenState(true)
}

export function closeAICopilotDialog() {
  setAICopilotOpenState(false)
}
