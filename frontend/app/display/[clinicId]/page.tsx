'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { clinicsApi } from '@/lib/api-calls'
import { connectSSE } from '@/lib/sse'
import type { LiveQueue, Clinic, QueueToken } from '@/types'
import { cn, formatTokenDisplay } from '@/lib/utils'
import { Activity } from 'lucide-react'

function TokenBox({ token }: { token: QueueToken }) {
  const display = token.token_display || formatTokenDisplay(token.token_number)
  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-4 text-center min-w-[100px]">
      <p className="text-3xl font-bold text-white font-heading tracking-widest">{display}</p>
    </div>
  )
}

export default function DisplayPage() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [queue, setQueue] = useState<LiveQueue | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [animating, setAnimating] = useState(false)

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await clinicsApi.getLiveQueue(clinicId)
      setQueue((prev) => {
        // Detect token change → trigger animation
        if (prev?.current_token?._id !== data.current_token?._id) {
          setAnimating(true)
          setTimeout(() => setAnimating(false), 600)
        }
        return data
      })
      setLastUpdated(new Date())
    } catch { /* ignore */ }
  }, [clinicId])

  useEffect(() => {
    // Fetch clinic info
    clinicsApi.getById(clinicId).then(({ data }) => setClinic(data)).catch(() => {})
    queueMicrotask(() => {
      void fetchQueue()
    })

    // SSE
    const disconnect = connectSSE(clinicId, (event) => {
      if (['queue_updated', 'token_called', 'wait_time_changed'].includes(event.type)) {
        fetchQueue()
      }
    })

    // Polling fallback every 30s
    const interval = setInterval(fetchQueue, 30000)

    return () => {
      disconnect()
      clearInterval(interval)
    }
  }, [clinicId, fetchQueue])

  const current = queue?.current_token
  const nextFive = queue?.waiting?.slice(0, 5) ?? []

  return (
    <div className="min-h-screen bg-surface-900 tv-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/40 text-sm font-medium tracking-wider uppercase">CareQueue AI</p>
            <p className="text-white text-2xl font-bold font-heading">{clinic?.name ?? 'Loading...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative inline-flex w-3 h-3">
            <span className="absolute inset-0 rounded-full bg-green-400 opacity-40 animate-ping" />
            <span className="relative rounded-full w-3 h-3 bg-green-500" />
          </span>
          <span className="text-white/50 text-sm">LIVE</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-10 gap-12">
        {/* Now serving */}
        <div className="text-center w-full max-w-2xl">
          <p className="text-white/40 text-lg font-medium tracking-[0.3em] uppercase mb-6">
            Now Serving
          </p>
          {current ? (
            <div className={cn(
              'transition-all duration-500',
              animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            )}>
              <div className="bg-brand-500/20 border-2 border-brand-400/50 rounded-3xl px-16 py-10 inline-block shadow-2xl shadow-brand-500/20">
                <p className="text-[10rem] font-bold font-heading text-white leading-none tracking-tighter">
                  {current.token_display || formatTokenDisplay(current.token_number)}
                </p>
                {current.patient_name && (
                  <p className="text-white/50 text-2xl mt-4 font-medium">{current.patient_name}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 px-16 py-10 inline-block">
              <p className="text-6xl font-bold font-heading text-white/20">—</p>
              <p className="text-white/30 text-xl mt-4">No patient being served</p>
            </div>
          )}
        </div>

        {/* Next tokens */}
        {nextFive.length > 0 && (
          <div className="text-center w-full">
            <p className="text-white/40 text-sm font-medium tracking-[0.3em] uppercase mb-5">
              Next in Queue
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              {nextFive.map((t, i) => (
                <div key={t._id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <TokenBox token={t} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="border-t border-white/10 px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-white/30 text-xs uppercase tracking-wider">Waiting</p>
            <p className="text-white text-3xl font-bold font-heading">{queue?.waiting?.length ?? 0}</p>
          </div>
          {queue?.current_token?.est_wait_mins !== undefined && (
            <div>
              <p className="text-white/30 text-xs uppercase tracking-wider">Est. Wait</p>
              <p className="text-white text-3xl font-bold font-heading">
                ~{Math.round(queue.current_token.est_wait_mins)} min
              </p>
            </div>
          )}
          <div>
            <p className="text-white/30 text-xs uppercase tracking-wider">Completed</p>
            <p className="text-white text-3xl font-bold font-heading">{queue?.completed_count ?? 0}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-xs uppercase tracking-wider">Last Updated</p>
          <p className="text-white/50 text-sm">
            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  )
}
