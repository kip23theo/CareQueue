'use client'

import { useState, useCallback } from 'react'
import { useQueue } from '@/context/QueueContext'
import { useToast } from '@/context/ToastContext'
import { adminQueueApi } from '@/lib/api-calls'
import { QueueList } from '@/components/queue/QueueList'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SSEStatusDot } from '@/components/ui/LiveDot'
import { cn, formatTokenDisplay } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TokenStatus } from '@/types'
import axios from 'axios'
import { Search, Filter, RefreshCw } from 'lucide-react'

const TABS: { label: string; status: TokenStatus | 'ALL' }[] = [
  { label: 'All', status: 'ALL' },
  { label: 'Waiting', status: 'WAITING' },
  { label: 'Called', status: 'CALLED' },
  { label: 'In Consultation', status: 'IN_CONSULTATION' },
  { label: 'Completed', status: 'COMPLETED' },
]

export default function AdminQueuePage() {
  const { queue, isLoading, sseStatus, refresh } = useQueue()
  const { success, error: toastError } = useToast()
  const [activeTab, setActiveTab] = useState<TokenStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const handleAction = useCallback(async (fn: () => Promise<unknown>, msg: string) => {
    setActionLoading(true)
    try {
      await fn()
      success(msg)
      refresh()
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }, [success, toastError, refresh])

  const allTokens = [
    ...(queue?.current_token ? [queue.current_token] : []),
    ...(queue?.waiting ?? []),
    ...(queue?.called ?? []),
  ]

  const filtered = allTokens
    .filter((t) => activeTab === 'ALL' || t.status === activeTab)
    .filter((t) =>
      !search ||
      t.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.token_display || formatTokenDisplay(t.token_number)).toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Live Queue</h1>
          <p className="text-surface-500 text-sm mt-0.5">Full queue management</p>
        </div>
        <div className="flex items-center gap-3">
          <SSEStatusDot status={sseStatus} showLabel />
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-surface-200 text-sm text-surface-600 hover:bg-surface-50"
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or token..."
          className="h-10 rounded-xl border-surface-200 bg-white pl-9 pr-4 text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
        {TABS.map((tab) => {
          const count = tab.status === 'ALL'
            ? allTokens.length
            : allTokens.filter((t) => t.status === tab.status).length
          return (
            <Button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              size="sm"
              variant={activeTab === tab.status ? 'default' : 'outline'}
              className={cn(
                'items-center gap-1.5 h-8 px-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0',
                activeTab === tab.status
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === tab.status ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
              )}>
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Queue list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : (
        <QueueList
          tokens={filtered}
          currentToken={queue?.current_token}
          onSkip={(id) => handleAction(() => adminQueueApi.skip(id), 'Patient skipped')}
          onEmergency={(id) => handleAction(() => adminQueueApi.markEmergency(id), '🚨 Emergency flagged')}
          onComplete={(id) => handleAction(() => adminQueueApi.completeConsultation(id), '✓ Consultation completed')}
          onStart={(id) => handleAction(() => adminQueueApi.startConsultation(id), 'Consultation started')}
          isLoading={actionLoading}
        />
      )}
    </div>
  )
}
