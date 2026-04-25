import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(isoString: string): string {
  try {
    return format(parseISO(isoString), 'h:mm a')
  } catch {
    return '--'
  }
}

export function formatTimeAgo(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true })
  } catch {
    return '--'
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = parseISO(isoString)
    const today = new Date()
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return `Today, ${format(date, 'MMM d')}`
    }
    return format(date, 'MMM d, yyyy')
  } catch {
    return '--'
  }
}

export function formatTokenDisplay(tokenNumber: number): string {
  const letter = 'A'
  const padded = String(tokenNumber).padStart(2, '0')
  return `${letter}${padded}`
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  if (minutes === 1) return '1 min'
  return `${Math.round(minutes)} min`
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)} km`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
