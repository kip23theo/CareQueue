'use client'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface Props {
  waitMins: number
  maxMins?: number
  size?: 'sm' | 'md' | 'lg'
}

export function WaitTimeMeter({ waitMins, maxMins = 60, size = 'md' }: Props) {
  const pct = Math.min((waitMins / maxMins) * 100, 100)

  const color =
    waitMins < 15 ? { stroke: '#22c55e', text: 'text-green-600', bg: 'text-green-100' } :
    waitMins < 30 ? { stroke: '#f59e0b', text: 'text-amber-600', bg: 'text-amber-100' } :
    { stroke: '#ef4444', text: 'text-red-600', bg: 'text-red-100' }

  const sizes = {
    sm: { svg: 64, r: 26, strokeW: 5, textSize: 'text-xs', subSize: 'text-[9px]' },
    md: { svg: 96, r: 38, strokeW: 6, textSize: 'text-sm', subSize: 'text-[10px]' },
    lg: { svg: 140, r: 56, strokeW: 8, textSize: 'text-xl', subSize: 'text-xs' },
  }

  const s = sizes[size]
  const circumference = 2 * Math.PI * s.r
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: s.svg, height: s.svg }}>
      <svg width={s.svg} height={s.svg} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={s.svg / 2}
          cy={s.svg / 2}
          r={s.r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={s.strokeW}
        />
        {/* Progress arc */}
        <circle
          cx={s.svg / 2}
          cy={s.svg / 2}
          r={s.r}
          fill="none"
          stroke={color.stroke}
          strokeWidth={s.strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold font-heading leading-none', color.text, s.textSize)}>
          {waitMins < 1 ? '<1' : Math.round(waitMins)}
        </span>
        <span className={cn('text-surface-400 leading-none mt-0.5', s.subSize)}>min</span>
      </div>
    </div>
  )
}

// Linear variant for simpler use
interface LinearProps {
  waitMins: number
  maxMins?: number
}

export function WaitTimeBar({ waitMins, maxMins = 60 }: LinearProps) {
  const pct = Math.min((waitMins / maxMins) * 100, 100)
  const color =
    waitMins < 15 ? '[&>[data-slot=progress-indicator]]:bg-green-500' :
    waitMins < 30 ? '[&>[data-slot=progress-indicator]]:bg-amber-500' :
    '[&>[data-slot=progress-indicator]]:bg-red-500'

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-surface-500 mb-1">
        <span>Wait time</span>
        <span className="font-medium">{waitMins < 1 ? '<1' : Math.round(waitMins)} min</span>
      </div>
      <Progress value={pct} className={cn('h-2 bg-surface-200', color)} />
    </div>
  )
}
