import { toast } from 'sonner'

const ERROR_DEDUPE_WINDOW_MS = 1200
const errorToastHistory = new Map<string, number>()

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase()
}

export function showErrorToast(message: string): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeMessage(message)
  const now = Date.now()
  const lastSeenAt = errorToastHistory.get(normalized)

  if (lastSeenAt && now - lastSeenAt < ERROR_DEDUPE_WINDOW_MS) {
    return
  }

  errorToastHistory.set(normalized, now)

  for (const [key, timestamp] of errorToastHistory) {
    if (now - timestamp > ERROR_DEDUPE_WINDOW_MS * 4) {
      errorToastHistory.delete(key)
    }
  }

  toast.error(message)
}

export { toast }
