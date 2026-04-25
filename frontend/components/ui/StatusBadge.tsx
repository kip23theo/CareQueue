'use client'

import { cn } from '@/lib/utils'
import type { TokenStatus } from '@/types'
import {
  Clock, PhoneCall, Stethoscope, CheckCircle2,
  SkipForward, XCircle, Siren, UserX
} from 'lucide-react'

interface Props {
  status: TokenStatus
  size?: 'sm' | 'md' | 'lg'
  pulsing?: boolean
}

const statusConfig: Record<TokenStatus, {
  label: string
  icon: React.ReactNode
  pill: string
  dot: string
}> = {
  WAITING: {
    label: 'Waiting',
    icon: <Clock size={12} />,
    pill: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  CALLED: {
    label: 'Called',
    icon: <PhoneCall size={12} />,
    pill: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  IN_CONSULTATION: {
    label: 'In Consultation',
    icon: <Stethoscope size={12} />,
    pill: 'bg-teal-100 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  COMPLETED: {
    label: 'Completed',
    icon: <CheckCircle2 size={12} />,
    pill: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  SKIPPED: {
    label: 'Skipped',
    icon: <SkipForward size={12} />,
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: <XCircle size={12} />,
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  EMERGENCY: {
    label: 'Emergency',
    icon: <Siren size={12} />,
    pill: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  NO_SHOW: {
    label: 'No Show',
    icon: <UserX size={12} />,
    pill: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
}

export function StatusBadge({ status, size = 'md', pulsing }: Props) {
  const config = statusConfig[status]
  const isPulsing = pulsing ?? (status === 'CALLED' || status === 'EMERGENCY')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        'transition-all duration-300',
        config.pill,
        sizeClasses[size]
      )}
    >
      <span
        className={cn(
          'rounded-full shrink-0',
          config.dot,
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          isPulsing && 'animate-pulse'
        )}
      />
      {config.icon}
      {config.label}
    </span>
  )
}
