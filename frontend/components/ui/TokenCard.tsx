'use client'

import { cn, formatTokenDisplay, formatWaitTime, formatTimeAgo } from '@/lib/utils'
import type { QueueToken } from '@/types'
import { StatusBadge } from './StatusBadge'
import {
  User, Clock, CheckCircle2, SkipForward,
  Siren, Stethoscope
} from 'lucide-react'

interface Props {
  token: QueueToken
  variant?: 'patient' | 'staff' | 'compact'
  onSkip?: (id: string) => void
  onEmergency?: (id: string) => void
  onComplete?: (id: string) => void
  onStart?: (id: string) => void
  isLoading?: boolean
}

export function TokenCard({ token, variant = 'patient', onSkip, onEmergency, onComplete, onStart, isLoading }: Props) {
  const displayNum = token.token_display || formatTokenDisplay(token.token_number)

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white',
        'hover:border-brand-300 transition-colors',
        token.status === 'EMERGENCY' && 'border-red-300 bg-red-50'
      )}>
        <span className="text-sm font-bold text-surface-800 font-heading w-10 shrink-0">
          {displayNum}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-800 truncate">{token.patient_name}</p>
          {token.symptoms && (
            <p className="text-xs text-surface-500 truncate">{token.symptoms}</p>
          )}
        </div>
        <StatusBadge status={token.status} size="sm" />
      </div>
    )
  }

  if (variant === 'patient') {
    return (
      <div className={cn(
        'rounded-2xl border-2 bg-white p-6 transition-all duration-300 animate-fade-in',
        token.status === 'CALLED'
          ? 'border-amber-400 shadow-amber-100 shadow-lg'
          : token.status === 'EMERGENCY'
          ? 'border-red-400 shadow-red-100 shadow-lg'
          : 'border-surface-200 shadow-sm'
      )}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-surface-500 mb-1">Your Token</p>
            <p className="text-5xl font-bold text-surface-900 font-heading leading-none">
              {displayNum}
            </p>
          </div>
          <StatusBadge status={token.status} size="lg" />
        </div>
        <div className="flex items-center gap-4 text-sm text-surface-600">
          <span className="flex items-center gap-1.5">
            <User size={14} />
            {token.patient_name}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            ~{formatWaitTime(token.est_wait_mins)}
          </span>
        </div>
        <div className="mt-3 text-xs text-surface-400">
          Joined {formatTimeAgo(token.joined_at)}
        </div>
      </div>
    )
  }

  // Staff variant
  return (
    <div className={cn(
      'rounded-2xl border-2 bg-white p-5 transition-all duration-300 animate-slide-up',
      token.status === 'EMERGENCY'
        ? 'border-red-400 bg-red-50'
        : token.status === 'IN_CONSULTATION'
        ? 'border-brand-400'
        : 'border-surface-200'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-3xl font-bold text-surface-900 font-heading leading-none">{displayNum}</p>
          <p className="text-lg font-semibold text-surface-800 mt-1">{token.patient_name}</p>
        </div>
        <StatusBadge status={token.status} />
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-surface-600 mb-4">
        <span>{token.patient_age} yrs • {token.patient_gender || 'N/A'}</span>
        {token.symptoms && (
          <span className="text-surface-500 italic truncate max-w-xs">"{token.symptoms}"</span>
        )}
      </div>

      {(onSkip || onEmergency || onComplete || onStart) && (
        <div className="flex gap-2 flex-wrap">
          {onStart && token.status === 'CALLED' && (
            <button
              onClick={() => onStart(token._id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              <Stethoscope size={14} />
              Start
            </button>
          )}
          {onComplete && (
            <button
              onClick={() => onComplete(token._id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Complete
            </button>
          )}
          {onSkip && (
            <button
              onClick={() => onSkip(token._id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              <SkipForward size={14} />
              Skip
            </button>
          )}
          {onEmergency && (
            <button
              onClick={() => onEmergency(token._id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <Siren size={14} />
              Emergency
            </button>
          )}
        </div>
      )}
    </div>
  )
}
