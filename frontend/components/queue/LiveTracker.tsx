'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn, formatWaitTime, formatTime, formatTokenDisplay } from '@/lib/utils'
import type { QueueToken, TokenStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { WaitTimeMeter } from '@/components/ui/WaitTimeMeter'
import { LiveDot } from '@/components/ui/LiveDot'
import { connectSSE } from '@/lib/sse'
import { tokensApi } from '@/lib/api-calls'
import { Check, Circle, Loader2, Bell, X } from 'lucide-react'

interface Props {
  token: QueueToken
  clinicName: string
}

interface TimelineStep {
  label: string
  time?: string
  status: 'done' | 'current' | 'pending'
}

function buildTimeline(token: QueueToken): TimelineStep[] {
  const statusOrder: TokenStatus[] = ['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED']
  const currentIdx = statusOrder.indexOf(token.status)

  return [
    {
      label: 'Joined queue',
      time: formatTime(token.joined_at),
      status: 'done',
    },
    {
      label: 'Waiting your turn',
      status: currentIdx === 0 ? 'current' : currentIdx > 0 ? 'done' : 'pending',
    },
    {
      label: 'Being called',
      time: token.called_at ? formatTime(token.called_at) : undefined,
      status: token.status === 'CALLED' ? 'current' : currentIdx > 1 ? 'done' : 'pending',
    },
    {
      label: 'In consultation',
      time: token.consult_start ? formatTime(token.consult_start) : undefined,
      status: token.status === 'IN_CONSULTATION' ? 'current' : currentIdx > 2 ? 'done' : 'pending',
    },
    {
      label: 'Done',
      time: token.consult_end ? formatTime(token.consult_end) : undefined,
      status: token.status === 'COMPLETED' ? 'done' : 'pending',
    },
  ]
}

export function LiveTracker({ token: initialToken, clinicName }: Props) {
  const [token, setToken] = useState(initialToken)
  const [eta, setEta] = useState(initialToken.est_wait_mins)
  const [isCalled, setIsCalled] = useState(initialToken.status === 'CALLED')

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await tokensApi.getStatus(initialToken._id)
      setToken(data)
      setEta(data.est_wait_mins)
      if (data.status === 'CALLED') {
        setIsCalled(true)
        navigator.vibrate?.(500)
      }
    } catch { /* ignore */ }
  }, [initialToken._id])

  // SSE connection
  useEffect(() => {
    const disconnect = connectSSE(token.clinic_id, (event) => {
      if (event.type === 'token_called') {
        const payload = event.payload as { token_id?: string }
        if (payload.token_id === initialToken._id) {
          setIsCalled(true)
          setToken((prev) => ({ ...prev, status: 'CALLED' }))
          navigator.vibrate?.(500)
        }
      }
      if (event.type === 'wait_time_changed') {
        const updated = event.payload.tokens as Array<{ token_id: string; new_est_wait_mins: number }>
        const mine = updated?.find((t) => t.token_id === initialToken._id)
        if (mine) setEta(mine.new_est_wait_mins)
      }
      if (event.type === 'queue_updated') {
        fetchStatus()
      }
    })
    return disconnect
  }, [token.clinic_id, initialToken._id, fetchStatus])

  // Polling fallback every 15s
  useEffect(() => {
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // ETA countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setEta((prev) => Math.max(0, prev - 1 / 60))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const timeline = buildTimeline(token)

  const isCompleted = token.status === 'COMPLETED'
  const isCancelled = token.status === 'CANCELLED' || token.status === 'SKIPPED'

  return (
    <div className={cn(
      'min-h-screen flex flex-col transition-colors duration-500',
      isCalled ? 'bg-amber-50' : 'bg-surface-50'
    )}>
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-500 font-medium">{clinicName}</p>
          <h1 className="text-base font-bold text-surface-900 font-heading">Your Queue Status</h1>
        </div>
        <LiveDot label="Live" size="sm" />
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {/* CALLED alert */}
        {isCalled && !isCompleted && (
          <div className="rounded-2xl bg-amber-500 text-white p-5 text-center animate-slide-up shadow-lg">
            <p className="text-2xl font-bold font-heading mb-1">🔔 Your turn!</p>
            <p className="text-amber-100">Please proceed to the doctor now.</p>
          </div>
        )}

        {/* Token number + status */}
        <div className="bg-white rounded-2xl border-2 border-surface-200 p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-surface-400 mb-2">Token Number</p>
          <p className={cn(
            'text-7xl font-bold font-heading leading-none mb-4',
            isCalled ? 'text-amber-500' : 'text-surface-900'
          )}>
            {token.token_display || formatTokenDisplay(token.token_number)}
          </p>
          <StatusBadge status={token.status} size="lg" />
        </div>

        {/* Position + ETA */}
        {!isCompleted && !isCancelled && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-surface-200 p-4 text-center">
              <p className="text-xs text-surface-500 mb-1">Your Position</p>
              <p className="text-4xl font-bold font-heading text-surface-900">
                #{token.position}
              </p>
              <p className="text-xs text-surface-400 mt-1">in queue</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-200 p-4 flex flex-col items-center justify-center">
              <p className="text-xs text-surface-500 mb-2">Est. Wait</p>
              <WaitTimeMeter waitMins={eta} size="md" />
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-lg font-bold text-green-700 font-heading">Consultation Complete</p>
            <p className="text-green-600 text-sm mt-1">Thank you for visiting!</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-4">Progress</p>
          <div className="space-y-0">
            {timeline.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Icon */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                    step.status === 'done' ? 'bg-brand-500' :
                    step.status === 'current' ? 'bg-amber-500' :
                    'bg-surface-200'
                  )}>
                    {step.status === 'done' && <Check size={13} className="text-white" />}
                    {step.status === 'current' && <Loader2 size={13} className="text-white animate-spin" />}
                    {step.status === 'pending' && <Circle size={10} className="text-surface-400" />}
                  </div>
                  {i < timeline.length - 1 && (
                    <div className={cn(
                      'w-0.5 h-6 my-1',
                      step.status === 'done' ? 'bg-brand-300' : 'bg-surface-200'
                    )} />
                  )}
                </div>
                {/* Label */}
                <div className="pb-1 pt-0.5 flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    step.status === 'done' ? 'text-surface-700' :
                    step.status === 'current' ? 'text-surface-900' :
                    'text-surface-400'
                  )}>
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-xs text-surface-400 mt-0.5">{step.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel button */}
        {!isCompleted && !isCancelled && (
          <button
            onClick={async () => {
              if (confirm('Cancel your token?')) {
                await tokensApi.cancel(token._id)
                fetchStatus()
              }
            }}
            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Cancel My Token
          </button>
        )}
      </div>
    </div>
  )
}
