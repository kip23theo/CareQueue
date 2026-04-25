'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { LiveQueue } from '@/types'
import { adminQueueApi } from '@/lib/api-calls'
import { connectSSE } from '@/lib/sse'
import { getUser } from '@/lib/auth'

type SSEStatus = 'connected' | 'reconnecting' | 'disconnected'

interface QueueContextValue {
  clinicId: string
  queue: LiveQueue | null
  isLoading: boolean
  sseStatus: SSEStatus
  refresh: () => Promise<void>
}

const QueueContext = createContext<QueueContextValue | null>(null)

export function QueueProvider({ children }: { children: ReactNode }) {
  const user = getUser()
  const clinicId = user?.clinic_id ?? ''
  const [queue, setQueue] = useState<LiveQueue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sseStatus, setSseStatus] = useState<SSEStatus>('disconnected')
  const disconnectRef = useRef<(() => void) | null>(null)

  const refresh = useCallback(async () => {
    if (!clinicId) return
    try {
      const { data } = await adminQueueApi.getQueue(clinicId)
      setQueue(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [clinicId])

  useEffect(() => {
    if (!clinicId) return
    queueMicrotask(() => {
      void refresh()
    })
    disconnectRef.current = connectSSE(
      clinicId,
      (event) => {
        if (event.type === 'queue_updated') {
          queueMicrotask(() => {
            void refresh()
          })
        }
      },
      () => setSseStatus('connected'),
      () => setSseStatus('reconnecting')
    )
    return () => disconnectRef.current?.()
  }, [clinicId, refresh])

  return (
    <QueueContext.Provider value={{ clinicId, queue, isLoading, sseStatus, refresh }}>
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const ctx = useContext(QueueContext)
  if (!ctx) throw new Error('useQueue must be used within QueueProvider')
  return ctx
}
