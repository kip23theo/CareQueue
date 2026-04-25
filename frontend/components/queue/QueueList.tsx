'use client'

import { cn, formatTokenDisplay } from '@/lib/utils'
import type { QueueToken } from '@/types'
import { TokenCard } from '@/components/ui/TokenCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Siren } from 'lucide-react'

interface Props {
  tokens: QueueToken[]
  currentToken?: QueueToken | null
  onSkip?: (id: string) => void
  onEmergency?: (id: string) => void
  onNext?: () => void
  onComplete?: (id: string) => void
  onStart?: (id: string) => void
  isLoading?: boolean
}

export function QueueList({
  tokens,
  currentToken,
  onSkip,
  onEmergency,
  onNext,
  onComplete,
  onStart,
  isLoading,
}: Props) {
  const waiting = tokens.filter((t) => t.status === 'WAITING')
  const emergencies = tokens.filter((t) => t.status === 'EMERGENCY')

  if (tokens.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <span className="text-2xl">🏥</span>
        </div>
        <p className="text-surface-600 font-medium">Queue is empty</p>
        <p className="text-surface-400 text-sm mt-1">No patients waiting</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Emergency tokens */}
      {emergencies.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <Siren size={15} className="animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">Emergency</span>
          </div>
          {emergencies.map((t) => (
            <TokenCard
              key={t._id}
              token={t}
              variant="staff"
              onComplete={onComplete}
              onSkip={onSkip}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Current patient */}
      {currentToken && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">Now Serving</p>
          <TokenCard
            token={currentToken}
            variant="staff"
            onComplete={onComplete}
            onSkip={onSkip}
            onEmergency={onEmergency}
            onStart={onStart}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Call next button */}
      {onNext && !currentToken && (
        <Button
          onClick={onNext}
          disabled={isLoading || waiting.length === 0}
          className={cn(
            'w-full h-11 rounded-xl font-semibold text-white transition-all',
            'bg-brand-500 hover:bg-brand-600',
            'shadow-sm hover:shadow-md'
          )}
        >
          {isLoading ? 'Calling...' : 'Call Next Patient'}
        </Button>
      )}

      {/* Waiting queue */}
      {waiting.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">
            Waiting ({waiting.length})
          </p>
          {waiting.slice(0, 5).map((t, i) => (
            <div key={t._id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <TokenCard
                token={t}
                variant="compact"
                onSkip={onSkip}
                onEmergency={onEmergency}
                isLoading={isLoading}
              />
            </div>
          ))}
          {waiting.length > 5 && (
            <p className="text-sm text-surface-400 text-center py-2">
              +{waiting.length - 5} more patients waiting
            </p>
          )}
        </div>
      )}
    </div>
  )
}
