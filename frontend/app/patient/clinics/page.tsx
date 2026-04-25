'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePatient } from '@/context/PatientContext'
import { clinicsApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import {
  reverseGeocodeLocation,
  searchLocationSuggestions,
  type LocationSuggestion,
} from '@/lib/location'
import { ClinicCard } from '@/components/ui/ClinicCard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { openAICopilotDialog } from '@/lib/ai-copilot'
import { Search, Sparkles, Loader2, MapPin, LocateFixed } from 'lucide-react'
import axios from 'axios'

const SPECS = ['General', 'Paediatrics', 'ENT', 'Orthopaedics', 'Gynaecology', 'Cardiology']
const SORTS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'wait', label: 'Shortest wait' },
  { value: 'rating', label: 'Highest rated' },
]
const NEARBY_RADIUS_METERS = 5000
const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000

function SkeletonCard() {
  return (
    <Card className="rounded-2xl border border-surface-200 bg-white/70 p-5">
      <div className="skeleton h-5 w-2/3 rounded-lg mb-3" />
      <div className="skeleton h-4 w-full rounded-lg mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
      <div className="flex gap-4">
        <div className="skeleton h-4 w-12 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>
    </Card>
  )
}

export default function ClinicsPage() {
  const router = useRouter()
  const { location, setLocation, nearbyClinics, setNearbyClinics } = usePatient()
  const [isLoading, setIsLoading] = useState(true)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([])
  const [locationError, setLocationError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('nearest')
  const [specFilter, setSpecFilter] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [postAuthBookingPath, setPostAuthBookingPath] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(6)

  const trimmedLocationQuery = locationQuery.trim()
  const activeLocationLabel = location?.label?.trim()
    ? location.label
    : location
      ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
      : ''

  const shouldShowLocationDropdown =
    trimmedLocationQuery.length >= 2 &&
    trimmedLocationQuery !== activeLocationLabel.trim() &&
    (isLocationSearchLoading || locationSuggestions.length > 0)

  useEffect(() => {
    if (!location) return

    const fetchClinics = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await clinicsApi.getNearby({
          lat: location.lat,
          lng: location.lng,
          radius: NEARBY_RADIUS_METERS,
        })
        setNearbyClinics(data)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail ?? 'Failed to load clinics')
        }
      } finally {
        setIsLoading(false)
      }
    }

    void fetchClinics()
  }, [location, setNearbyClinics])

  useEffect(() => {
    if (trimmedLocationQuery.length < 2 || trimmedLocationQuery === activeLocationLabel.trim()) {
      return
    }

    const timer = window.setTimeout(async () => {
      setIsLocationSearchLoading(true)
      try {
        const suggestions = await searchLocationSuggestions(trimmedLocationQuery)
        setLocationSuggestions(suggestions)
      } catch {
        setLocationSuggestions([])
      } finally {
        setIsLocationSearchLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [trimmedLocationQuery, activeLocationLabel])

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    setLocation({
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: suggestion.label,
    })
    setVisibleCount(6)
    setLocationQuery(suggestion.label)
    setLocationSuggestions([])
    setLocationError(null)
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }

    setLocationError(null)
    setIsDetectingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        let label = 'Current location'
        try {
          const detected = await reverseGeocodeLocation({ lat, lng })
          if (detected) label = detected
        } catch {
          // ignore reverse geocoding failures
        }
        setLocation({ lat, lng, label })
        setVisibleCount(6)
        setLocationQuery(label)
        setLocationSuggestions([])
        setIsDetectingLocation(false)
      },
      () => {
        setLocationError('Location access denied. You can still search by area below.')
        setIsDetectingLocation(false)
      }
    )
  }

  const filtered = useMemo(() => {
    let list = [...nearbyClinics]

    if (search.trim()) {
      const query = search.toLowerCase()
      list = list.filter((clinic) => clinic.name.toLowerCase().includes(query))
    }

    if (specFilter.length > 0) {
      list = list.filter((clinic) =>
        specFilter.some((spec) =>
          clinic.specializations.some((item) => item.toLowerCase().includes(spec.toLowerCase()))
        )
      )
    }

    if (sort === 'nearest') list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
    else if (sort === 'wait') list.sort((a, b) => (a.est_wait_mins ?? 999) - (b.est_wait_mins ?? 999))
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)

    return list
  }, [nearbyClinics, search, sort, specFilter])

  const visibleClinics = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMoreClinics = filtered.length > visibleCount

  const handleBookClinic = (clinicId: string) => {
    const user = getUser()
    const bookingPath = `/patient/clinic/${clinicId}`

    if (user?.role !== 'patient') {
      setPostAuthBookingPath(bookingPath)
      setIsAuthDialogOpen(true)
      return
    }

    router.push(bookingPath)
  }

  const handleAuthDialogChange = (open: boolean) => {
    setIsAuthDialogOpen(open)
    if (!open) {
      setPostAuthBookingPath(null)
    }
  }

  const bookingPath = postAuthBookingPath ?? '/patient/clinics'

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {!location && (
        <Card className="mb-5 rounded-3xl border border-surface-200 bg-white/72 p-5">
          <Badge className="rounded-full bg-brand-100 text-brand-700 border-transparent text-xs mb-3">
            Select Location
          </Badge>
          <h1 className="text-xl font-bold font-heading text-surface-900">
            Please select a location to view nearby clinics
          </h1>
          <p className="text-sm text-surface-600 mt-1.5">
            We list clinics within {NEARBY_RADIUS_KM} km of your selected location. Use GPS for accurate results or
            search your area manually.
          </p>

          <Button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isDetectingLocation}
            className="w-full mt-4 h-11 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
          >
            {isDetectingLocation ? (
              <><Loader2 size={15} className="animate-spin" /> Detecting location...</>
            ) : (
              <><LocateFixed size={15} /> Use my location</>
            )}
          </Button>

          <div className="flex items-center gap-2 my-3">
            <div className="h-px flex-1 bg-surface-200" />
            <span className="text-[11px] text-surface-400 uppercase tracking-wide">or search area</span>
            <div className="h-px flex-1 bg-surface-200" />
          </div>

          <div className="relative">
            <Input
              type="text"
              value={locationQuery}
              onChange={(e) => {
                const nextQuery = e.target.value
                setLocationQuery(nextQuery)
                if (nextQuery.trim().length < 2) {
                  setLocationSuggestions([])
                }
                setLocationError(null)
              }}
              placeholder="Search location..."
              className="h-10 rounded-xl border-surface-200 bg-white/70 px-3 text-sm"
            />
            {shouldShowLocationDropdown && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-56 overflow-y-auto rounded-xl border border-surface-200 bg-white/92 p-1 backdrop-blur-sm">
                {isLocationSearchLoading ? (
                  <div className="px-2 py-2 text-xs text-surface-500 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    Searching locations...
                  </div>
                ) : (
                  locationSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.lat}-${suggestion.lng}`}
                      type="button"
                      onClick={() => handleSelectLocation(suggestion)}
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-surface-50 text-xs text-surface-700 leading-relaxed"
                    >
                      {suggestion.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <p className="mt-2 text-[11px] text-surface-400">Search suggestions are powered by OpenStreetMap.</p>
          {locationError && (
            <p className="mt-1 text-xs text-red-600">{locationError}</p>
          )}
        </Card>
      )}

      {location && (
        <div className="sticky top-14 z-30 space-y-3 bg-transparent py-3">
          <Card className="rounded-2xl border border-surface-200 bg-white/70 px-3 py-3">
            <div className="flex items-center gap-2 text-xs text-surface-500 mb-2">
              <MapPin size={13} className="text-brand-500 shrink-0" />
              <p className="truncate">
                Showing clinics near <span className="font-medium text-surface-700">{activeLocationLabel || 'your selected area'}</span>
              </p>
            </div>
            <p className="text-[11px] text-surface-400 mb-2">
              Listing clinics within {NEARBY_RADIUS_KM} km radius.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => {
                    const nextQuery = e.target.value
                    setLocationQuery(nextQuery)
                    if (nextQuery.trim().length < 2 || nextQuery.trim() === activeLocationLabel.trim()) {
                      setLocationSuggestions([])
                    }
                    setLocationError(null)
                  }}
                  placeholder="Search location..."
                  className="h-10 rounded-xl border-surface-200 bg-white/70 px-3 text-sm"
                />
                {shouldShowLocationDropdown && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-56 overflow-y-auto rounded-xl border border-surface-200 bg-white/92 p-1 backdrop-blur-sm">
                    {isLocationSearchLoading ? (
                      <div className="px-2 py-2 text-xs text-surface-500 flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Searching locations...
                      </div>
                    ) : (
                      locationSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.lat}-${suggestion.lng}`}
                          type="button"
                          onClick={() => handleSelectLocation(suggestion)}
                          className="w-full text-left px-2 py-2 rounded-lg hover:bg-surface-50 text-xs text-surface-700 leading-relaxed"
                        >
                          {suggestion.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isDetectingLocation}
                variant="outline"
                className="h-10 rounded-xl border-surface-200 px-3 text-xs text-surface-700 whitespace-nowrap"
              >
                {isDetectingLocation ? (
                  <><Loader2 size={14} className="animate-spin" /> Locating...</>
                ) : (
                  <><LocateFixed size={14} /> Use GPS</>
                )}
              </Button>
            </div>

            <p className="mt-2 text-[11px] text-surface-400">Search suggestions are powered by OpenStreetMap.</p>
            {locationError && (
              <p className="mt-1 text-xs text-red-600">{locationError}</p>
            )}
          </Card>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setVisibleCount(6)
                }}
                placeholder="Search clinics..."
                className="h-10 rounded-xl border-surface-200 bg-white/70 pl-9 pr-4 text-sm"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value)
                setVisibleCount(6)
              }}
            >
              <SelectTrigger className="h-10 w-36 rounded-xl border-surface-200 bg-white/70 text-sm text-surface-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Button
              onClick={openAICopilotDialog}
              size="sm"
              className="h-8 shrink-0 rounded-full bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600"
            >
              <Sparkles size={12} />
              Ask AI
            </Button>
            {SPECS.map((spec) => (
              <Button
                key={spec}
                onClick={() => {
                  setVisibleCount(6)
                  setSpecFilter((prev) =>
                    prev.includes(spec) ? prev.filter((item) => item !== spec) : [...prev, spec]
                  )
                }}
                size="sm"
                variant={specFilter.includes(spec) ? 'default' : 'outline'}
                className={cn(
                  'shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-all',
                  specFilter.includes(spec)
                    ? 'bg-brand-500 text-white'
                    : 'border border-surface-200 bg-white/68 text-surface-600 hover:border-brand-300'
                )}
              >
                {spec}
              </Button>
            ))}
          </div>
        </div>
      )}

      {location && (
        <div className="space-y-3">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error ? (
            <div className="text-center py-12 text-surface-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-surface-600 font-medium">No clinics found</p>
              <p className="text-surface-400 text-sm mt-1">Try increasing the search radius or adjusting filters</p>
            </div>
          ) : (
            visibleClinics.map((clinic) => (
              <ClinicCard
                key={clinic._id}
                clinic={clinic}
                userLocation={location}
                onSelect={() => router.push(`/patient/clinic/${clinic._id}`)}
                onBook={() => handleBookClinic(clinic._id)}
              />
            ))
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="pt-2 pb-1 flex flex-col items-center gap-2">
              {hasMoreClinics && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-surface-200 px-4 text-sm text-surface-700"
                  onClick={() => setVisibleCount((count) => count + 6)}
                >
                  Show more clinics ({filtered.length - visibleCount} left)
                </Button>
              )}
              {visibleCount > 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-xl px-3 text-xs text-surface-500"
                  onClick={() => setVisibleCount(6)}
                >
                  Show less
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={isAuthDialogOpen} onOpenChange={handleAuthDialogChange}>
        <DialogContent className="max-w-md rounded-2xl border border-surface-200 bg-white/92">
          <DialogHeader>
            <DialogTitle>Register as patient to book</DialogTitle>
            <DialogDescription>
              Booking requires a patient account. Create one to continue your clinic booking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-surface-200"
              onClick={() => setIsAuthDialogOpen(false)}
            >
              Continue browsing
            </Button>
            <Button asChild className="rounded-xl bg-brand-500 text-white hover:bg-brand-600">
              <Link href={`/auth/patient-register?next=${encodeURIComponent(bookingPath)}`}>
                Register as patient
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
