import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

interface StarsProps {
  value: number
  size?: number
  className?: string
}

export function Stars({ value, size = 14, className }: StarsProps) {
  const rounded = Math.round(value)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(
            star <= rounded ? 'fill-amber-400 text-amber-400' : 'text-surface-300'
          )}
        />
      ))}
    </div>
  )
}
