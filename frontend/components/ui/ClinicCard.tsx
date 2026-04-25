'use client'

import type { MouseEvent } from 'react'
import { cn, formatDistance, formatWaitTime } from '@/lib/utils'
import { buildGoogleMapsDirectionsUrl } from '@/lib/location'
import type { Clinic } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, Star, ChevronRight, Zap, Navigation } from 'lucide-react'

interface Props {
  clinic: Clinic
  userLocation?: { lat: number; lng: number } | null
  onSelect?: () => void
  onBook?: () => void
  isBestMatch?: boolean
  aiReason?: string
}

function QueueDot({ count }: { count: number }) {
  const color =
    count <= 5 ? 'bg-green-500' :
    count <= 10 ? 'bg-amber-500' :
    'bg-red-500'

  const label =
    count <= 5 ? 'text-green-700' :
    count <= 10 ? 'text-amber-700' :
    'text-red-700'

  const bg =
    count <= 5 ? 'bg-green-50' :
    count <= 10 ? 'bg-amber-50' :
    'bg-red-50'

  return (
    <Badge className={cn('gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border-transparent', bg, label)}>
      <span className={cn('w-2 h-2 rounded-full', color, count > 5 && 'animate-pulse')} />
      {count} waiting
    </Badge>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <Star size={13} className="text-amber-400 fill-amber-400" />
      <span className="font-medium text-surface-700">{rating.toFixed(1)}</span>
    </span>
  )
}

export function ClinicCard({ clinic, userLocation, onSelect, onBook, isBestMatch, aiReason }: Props) {
  const clinicLat = clinic.location?.coordinates?.[1]
  const clinicLng = clinic.location?.coordinates?.[0]
  const hasCoordinates = Number.isFinite(clinicLat) && Number.isFinite(clinicLng)

  const handleGetDirections = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!hasCoordinates) return
    const directionsUrl = buildGoogleMapsDirectionsUrl(
      { lat: clinicLat as number, lng: clinicLng as number },
      userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined
    )
    window.open(directionsUrl, '_blank', 'noopener,noreferrer')
  }

  const handleBook = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onBook?.()
  }

  return (
    <Card
      className={cn(
        'relative rounded-2xl border bg-white p-5 transition-all duration-200',
        'hover:shadow-md hover:border-brand-300 cursor-pointer',
        isBestMatch
          ? 'border-brand-400 shadow-brand-100 shadow-md ring-1 ring-brand-400/30'
          : 'border-surface-200',
        !clinic.is_open && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {/* Best match badge */}
      {isBestMatch && (
        <div className="absolute -top-3 left-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500 text-white shadow-sm">
            <Zap size={10} className="fill-white" />
            AI Best Match
          </span>
        </div>
      )}

      {/* Closed overlay label */}
      {!clinic.is_open && (
        <div className="absolute top-4 right-4">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">
            Closed
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-surface-900 text-base font-heading truncate">{clinic.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-sm text-surface-500">
            <MapPin size={13} />
            <span className="truncate">{clinic.address}</span>
          </div>
        </div>
        <ChevronRight size={18} className="text-surface-400 shrink-0 mt-0.5" />
      </div>

      {/* Specializations */}
      {clinic.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {clinic.specializations.slice(0, 3).map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-surface-100 text-surface-600 font-medium">
              {s}
            </span>
          ))}
          {clinic.specializations.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-surface-100 text-surface-400">
              +{clinic.specializations.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Live stats */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {clinic.distance_km !== undefined && (
          <span className="flex items-center gap-1 text-sm text-surface-600">
            <MapPin size={13} className="text-brand-500" />
            {formatDistance(clinic.distance_km)}
          </span>
        )}
        {clinic.est_wait_mins !== undefined && (
          <span className="flex items-center gap-1 text-sm text-surface-600">
            <Clock size={13} className="text-brand-500" />
            ~{formatWaitTime(clinic.est_wait_mins)}
          </span>
        )}
        {clinic.queue_length !== undefined && (
          <QueueDot count={clinic.queue_length} />
        )}
        <StarRating rating={clinic.rating} />
      </div>

      {/* AI reason */}
      {aiReason && (
        <div className="mt-3 px-3 py-2 rounded-xl bg-brand-50 border border-brand-100">
          <p className="text-xs text-brand-700 leading-relaxed">✦ {aiReason}</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!clinic.is_open}
          onClick={handleBook}
          className="h-8 rounded-lg bg-brand-500 px-4 text-xs text-white hover:bg-brand-600"
        >
          Book
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasCoordinates}
          onClick={handleGetDirections}
          className="h-8 rounded-lg border-surface-200 text-xs text-surface-700"
        >
          <Navigation size={13} />
          Get Directions
        </Button>
      </div>
    </Card>
  )
}
