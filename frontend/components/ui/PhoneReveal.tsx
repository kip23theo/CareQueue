'use client'

import { useState, type MouseEvent } from 'react'
import { Phone } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PhoneRevealProps {
  phone?: string | null
  buttonLabel?: string
  emptyLabel?: string
  className?: string
  stopPropagation?: boolean
}

export function PhoneReveal({
  phone,
  buttonLabel = 'Show phone number',
  emptyLabel = 'Phone unavailable',
  className,
  stopPropagation = false,
}: PhoneRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const normalizedPhone = phone?.trim() ?? ''

  const handleReveal = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) event.stopPropagation()
    setIsRevealed(true)
  }

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) event.stopPropagation()
  }

  if (!normalizedPhone) {
    return <span className={cn('text-xs text-surface-500', className)}>{emptyLabel}</span>
  }

  if (!isRevealed) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleReveal}
        className={cn(
          'h-8 rounded-lg border-surface-200 px-3 text-xs text-surface-700',
          className
        )}
      >
        <Phone size={13} />
        {buttonLabel}
      </Button>
    )
  }

  return (
    <a
      href={`tel:${normalizedPhone}`}
      onClick={handleLinkClick}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-700',
        className
      )}
    >
      <Phone size={13} />
      {normalizedPhone}
    </a>
  )
}

