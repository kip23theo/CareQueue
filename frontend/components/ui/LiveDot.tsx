'use client'

import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

export function LiveDot({ size = 'md', label, className }: Props) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const ringSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('relative inline-flex', ringSize)}>
        <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
        <span className={cn('relative rounded-full bg-green-500', dotSize, 'm-auto')} />
      </span>
      {label && (
        <span className={cn('font-medium text-green-600', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
      )}
    </span>
  )
}

interface SSEDotProps {
  status: 'connected' | 'reconnecting' | 'disconnected'
  showLabel?: boolean
}

export function SSEStatusDot({ status, showLabel }: SSEDotProps) {
  const config = {
    connected: { dot: 'bg-green-500', label: 'Live', text: 'text-green-600' },
    reconnecting: { dot: 'bg-amber-500', label: 'Reconnecting', text: 'text-amber-600' },
    disconnected: { dot: 'bg-surface-400', label: 'Offline', text: 'text-surface-500' },
  }[status]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex w-2.5 h-2.5">
        {status === 'connected' && (
          <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
        )}
        <span className={cn('relative rounded-full w-2.5 h-2.5', config.dot)} />
      </span>
      {showLabel && (
        <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
      )}
    </span>
  )
}
