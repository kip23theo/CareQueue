'use client'

import { useState } from 'react'
import { useQueue } from '@/context/QueueContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, formatTokenDisplay } from '@/lib/utils'
import type { QueueToken } from '@/types'
import { Search, User, Phone } from 'lucide-react'

export default function SearchPatientPage() {
  const { queue } = useQueue()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<QueueToken | null>(null)

  const allTokens = [
    ...(queue?.current_token ? [queue.current_token] : []),
    ...(queue?.waiting ?? []),
    ...(queue?.called ?? []),
  ]

  const results = query.length >= 2
    ? allTokens.filter((t) =>
        t.patient_name.toLowerCase().includes(query.toLowerCase()) ||
        t.patient_phone.includes(query)
      )
    : []

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold font-heading text-surface-900 mb-6">Search Patient</h1>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone number..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-surface-200 bg-white text-sm focus:outline-none focus:border-brand-400 shadow-sm"
          autoFocus
        />
      </div>

      {query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12">
          <User size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No patients found</p>
          <p className="text-surface-400 text-sm mt-1">Try a different name or phone number</p>
        </div>
      )}

      {query.length < 2 && (
        <div className="text-center py-12">
          <Search size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500">Type at least 2 characters to search</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((token) => (
          <div
            key={token._id}
            onClick={() => setSelected(selected?._id === token._id ? null : token)}
            className={cn(
              'rounded-2xl border bg-white p-4 cursor-pointer transition-all',
              selected?._id === token._id
                ? 'border-brand-400 shadow-md shadow-brand-100'
                : 'border-surface-200 hover:border-surface-300'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                  {token.patient_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-surface-900">{token.patient_name}</p>
                  <div className="flex items-center gap-2 text-sm text-surface-500 mt-0.5">
                    <Phone size={12} />
                    {token.patient_phone}
                    <span className="text-surface-300">•</span>
                    {token.patient_age} yrs
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-surface-700 font-heading">
                  {token.token_display || formatTokenDisplay(token.token_number)}
                </span>
                <StatusBadge status={token.status} size="sm" />
              </div>
            </div>

            {/* Expanded detail */}
            {selected?._id === token._id && (
              <div className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-2 gap-3 text-sm animate-fade-in">
                <div>
                  <p className="text-xs text-surface-400">Symptoms</p>
                  <p className="text-surface-700">{token.symptoms || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400">Position</p>
                  <p className="text-surface-700">#{token.position} in queue</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400">Est. wait</p>
                  <p className="text-surface-700">~{token.est_wait_mins} min</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400">Walk-in</p>
                  <p className="text-surface-700">{token.is_walkin ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
