import { getApiBaseUrl } from './base-url'

// SSE helper — connects to live queue stream
export function connectSSE(
  clinicId: string,
  onEvent: (event: SSEEvent) => void,
  onConnect?: () => void,
  onDisconnect?: () => void
): () => void {
  const BASE_URL = getApiBaseUrl()
  const es = new EventSource(`${BASE_URL}/clinics/${clinicId}/sse`)

  es.onopen = () => {
    onConnect?.()
  }

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as SSEEvent
      onEvent(data)
    } catch {
      // ignore parse errors
    }
  }

  es.onerror = () => {
    onDisconnect?.()
  }

  return () => es.close()
}

export type SSEEventType =
  | 'queue_updated'
  | 'token_called'
  | 'wait_time_changed'
  | 'doctor_status_changed'
  | 'emergency_added'

export interface SSEEvent {
  type: SSEEventType
  clinic_id: string
  payload: Record<string, unknown>
}
