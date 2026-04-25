'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePatient } from '@/context/PatientContext'
import { clinicsApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import type { Clinic, Doctor } from '@/types'
import {
  reverseGeocodeLocation,
  searchLocationSuggestions,
  type LocationSuggestion,
} from '@/lib/location'
import { ClinicCard } from '@/components/ui/ClinicCard'
import { cn, formatWaitTime } from '@/lib/utils'
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
import { Search, Sparkles, Loader2, MapPin, LocateFixed, Clock3, Navigation } from 'lucide-react'
import axios from 'axios'

const SPECS = ['General', 'Paediatrics', 'ENT', 'Orthopaedics', 'Gynaecology', 'Cardiology']
const SORTS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'wait', label: 'Shortest wait' },
  { value: 'rating', label: 'Highest rated' },
]
const NEARBY_RADIUS_METERS = 5000
const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000

type SearchMode = 'clinics' | 'doctors'

type DoctorListing = {
  doctor: Doctor
  clinic: Clinic
  est_wait_mins: number | undefined
}

function estimateDoctorWait(clinic: Clinic, doctor: Doctor): number | undefined {
  if (clinic.est_wait_mins === undefined) return undefined
  return Math.max(0, clinic.est_wait_mins + Math.max(doctor.delay_mins, 0))
}

function SkeletonCard() {
  return (
    <Card className="rounded-2xl border border-surface-200 bg-white p-5">
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

  const [searchMode, setSearchMode] = useState<SearchMode>('clinics')
  const [isLoading, setIsLoading] = useState(true)
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false)

  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([])
  const [locationError, setLocationError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('nearest')
  const [specFilter, setSpecFilter] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [doctorsError, setDoctorsError] = useState<string | null>(null)
  const [clinicDoctors, setClinicDoctors] = useState<Record<string, Doctor[]>>({})

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
      setDoctorsError(null)
      try {
        const { data } = await clinicsApi.getNearby({
          lat: location.lat,
          lng: location.lng,
          radius: NEARBY_RADIUS_METERS,
        })
        setNearbyClinics(data)
        setClinicDoctors({})
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
    if (!location || searchMode !== 'doctors' || nearbyClinics.length === 0) return

    const missingClinicIds = nearbyClinics
      .map((clinic) => clinic._id)
      .filter((clinicId) => clinicDoctors[clinicId] === undefined)

    if (missingClinicIds.length === 0) return

    let cancelled = false

    const fetchDoctors = async () => {
      setIsDoctorsLoading(true)
      setDoctorsError(null)
      try {
        const entries = await Promise.all(
          missingClinicIds.map(async (clinicId) => {
            const { data } = await clinicsApi.getDoctors(clinicId)
            return [clinicId, data] as const
          })
        )

        if (cancelled) return

        setClinicDoctors((prev) => {
          const next = { ...prev }
          for (const [clinicId, doctors] of entries) {
            next[clinicId] = doctors
          }
          return next
        })
      } catch (err) {
        if (!cancelled && axios.isAxiosError(err)) {
          setDoctorsError(err.response?.data?.detail ?? 'Failed to load doctors')
        }
      } finally {
        if (!cancelled) setIsDoctorsLoading(false)
      }
    }

    void fetchDoctors()

    return () => {
      cancelled = true
    }
  }, [location, searchMode, nearbyClinics, clinicDoctors])

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

  const filteredClinics = useMemo(() => {
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

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows: DoctorListing[] = []

    for (const clinic of nearbyClinics) {
      const doctors = clinicDoctors[clinic._id] ?? []

      for (const doctor of doctors) {
        if (query) {
          const searchable = `${doctor.name} ${doctor.specialization} ${clinic.name}`.toLowerCase()
          if (!searchable.includes(query)) continue
        }

        if (specFilter.length > 0) {
          const specMatched = specFilter.some((spec) => {
            const normalized = spec.toLowerCase()
            return (
              doctor.specialization.toLowerCase().includes(normalized) ||
              clinic.specializations.some((item) => item.toLowerCase().includes(normalized))
            )
          })

          if (!specMatched) continue
        }

        rows.push({
          doctor,
          clinic,
          est_wait_mins: estimateDoctorWait(clinic, doctor),
        })
      }
    }

    if (sort === 'nearest') {
      rows.sort((a, b) => (a.clinic.distance_km ?? 0) - (b.clinic.distance_km ?? 0))
    } else if (sort === 'wait') {
      rows.sort((a, b) => (a.est_wait_mins ?? 999) - (b.est_wait_mins ?? 999))
    } else if (sort === 'rating') {
      rows.sort((a, b) => b.clinic.rating - a.clinic.rating)
    }

    return rows
  }, [nearbyClinics, clinicDoctors, search, specFilter, sort])

  const visibleClinics = useMemo(() => filteredClinics.slice(0, visibleCount), [filteredClinics, visibleCount])
  const visibleDoctors = useMemo(() => filteredDoctors.slice(0, visibleCount), [filteredDoctors, visibleCount])

  const activeResultCount = searchMode === 'clinics' ? filteredClinics.length : filteredDoctors.length
  const hasMoreResults = activeResultCount > visibleCount
  const remainingResults = Math.max(0, activeResultCount - visibleCount)

  const activeError = error ?? (searchMode === 'doctors' ? doctorsError : null)
  const showLoading = isLoading || (searchMode === 'doctors' && isDoctorsLoading && filteredDoctors.length === 0)

  const openBookingFlow = (path: string) => {
    const user = getUser()
    if (user?.role !== 'patient') {
      setPostAuthBookingPath(path)
      setIsAuthDialogOpen(true)
      return
    }
    router.push(path)
  }

  const handleBookClinic = (clinicId: string) => {
    openBookingFlow(`/patient/clinic/${clinicId}`)
  }

  const handleBookDoctor = (doctorId: string, clinicId: string) => {
    openBookingFlow(`/patient/doctor/${doctorId}?clinicId=${clinicId}`)
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
        <Card className="rounded-3xl border border-surface-200 bg-white p-5 shadow-sm mb-5">
          <Badge className="rounded-full bg-brand-100 text-brand-700 border-transparent text-xs mb-3">
            Select Location
          </Badge>
          <h1 className="text-xl font-bold font-heading text-surface-900">
            Please select a location to search and explore
          </h1>
          <p className="text-sm text-surface-600 mt-1.5">
            We list clinics and doctors within {NEARBY_RADIUS_KM} km of your selected location. Use GPS for accurate
            results or search your area manually.
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
              className="h-10 rounded-xl border-surface-200 bg-white px-3 text-sm"
            />
            {shouldShowLocationDropdown && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-xl border border-surface-200 bg-white shadow-lg p-1 max-h-56 overflow-y-auto">
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
        <div className="sticky top-14 z-30 bg-surface-50 py-3 space-y-3">
          <Card className="rounded-2xl border border-surface-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-surface-500 mb-2">
              <MapPin size={13} className="text-brand-500 shrink-0" />
              <p className="truncate">
                Showing {searchMode} near <span className="font-medium text-surface-700">{activeLocationLabel || 'your selected area'}</span>
              </p>
            </div>
            <p className="text-[11px] text-surface-400 mb-2">
              Listing {searchMode} within {NEARBY_RADIUS_KM} km radius.
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
                  className="h-10 rounded-xl border-surface-200 bg-white px-3 text-sm"
                />
                {shouldShowLocationDropdown && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-xl border border-surface-200 bg-white shadow-lg p-1 max-h-56 overflow-y-auto">
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

          <Card className="rounded-2xl border border-surface-200 bg-white p-2">
            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                onClick={() => {
                  setSearchMode('clinics')
                  setVisibleCount(6)
                }}
                variant="ghost"
                className={cn(
                  'h-9 rounded-xl text-sm font-semibold',
                  searchMode === 'clinics'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-surface-600 hover:bg-surface-50'
                )}
              >
                Clinics
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSearchMode('doctors')
                  setVisibleCount(6)
                }}
                variant="ghost"
                className={cn(
                  'h-9 rounded-xl text-sm font-semibold',
                  searchMode === 'doctors'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-surface-600 hover:bg-surface-50'
                )}
              >
                Doctors
              </Button>
            </div>
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
                placeholder={
                  searchMode === 'clinics'
                    ? 'Search clinics...'
                    : 'Search doctors, specialization, or clinic...'
                }
                className="h-10 rounded-xl border-surface-200 bg-white pl-9 pr-4 text-sm"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value)
                setVisibleCount(6)
              }}
            >
              <SelectTrigger className="w-36 h-10 rounded-xl border-surface-200 bg-white text-sm text-surface-700">
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
              className="shrink-0 h-8 px-3 rounded-full bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 shadow-sm"
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
                    : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300'
                )}
              >
                {spec}
              </Button>
            ))}
          </div>

          {searchMode === 'doctors' && isDoctorsLoading && (
            <p className="text-xs text-surface-500 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Loading doctors for nearby clinics...
            </p>
          )}
        </div>
      )}

      {location && (
        <div className="space-y-3">
          {showLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : activeError ? (
            <div className="text-center py-12 text-surface-500">{activeError}</div>
          ) : activeResultCount === 0 ? (
            <div className="text-center py-12">
              <p className="text-surface-600 font-medium">
                No {searchMode === 'clinics' ? 'clinics' : 'doctors'} found
              </p>
              <p className="text-surface-400 text-sm mt-1">Try increasing the search radius or adjusting filters</p>
            </div>
          ) : searchMode === 'clinics' ? (
            visibleClinics.map((clinic) => (
              <ClinicCard
                key={clinic._id}
                clinic={clinic}
                userLocation={location}
                onSelect={() => router.push(`/patient/clinic/${clinic._id}`)}
                onBook={() => handleBookClinic(clinic._id)}
              />
            ))
          ) : (
            visibleDoctors.map(({ doctor, clinic, est_wait_mins }) => (
              <Card key={`${clinic._id}:${doctor._id}`} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-surface-100 border border-surface-200 shrink-0">
                    {doctor.doctor_image ? (
                      <img src={doctor.doctor_image} alt={doctor.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-surface-500">
                        {doctor.name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-surface-900 truncate">{doctor.name}</h3>
                        <p className="text-xs text-surface-500 truncate">{doctor.specialization || 'General'}</p>
                      </div>
                      {doctor.is_available ? (
                        <Badge className="rounded-full bg-green-100 text-green-700 border-transparent text-[11px]">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full bg-surface-100 text-surface-500 border-transparent text-[11px]">
                          Unavailable
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-surface-500 truncate">Clinic: {clinic.name}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500">
                      {clinic.distance_km !== undefined && (
                        <span className="inline-flex items-center gap-1">
                          <Navigation size={12} />
                          {clinic.distance_km.toFixed(1)} km
                        </span>
                      )}
                      {est_wait_mins !== undefined && (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          ~{formatWaitTime(est_wait_mins)}
                        </span>
                      )}
                      <span>Rating {clinic.rating.toFixed(1)}</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-surface-200 text-xs text-surface-700"
                        onClick={() => router.push(`/patient/clinic/${clinic._id}`)}
                      >
                        View clinic
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600"
                        onClick={() => handleBookDoctor(doctor._id, clinic._id)}
                        disabled={!doctor.is_available || !clinic.is_open}
                      >
                        {clinic.is_open ? 'Book doctor' : 'Clinic closed'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}

          {!showLoading && !activeError && activeResultCount > 0 && (
            <div className="pt-2 pb-1 flex flex-col items-center gap-2">
              {hasMoreResults && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-surface-200 px-4 text-sm text-surface-700"
                  onClick={() => setVisibleCount((count) => count + 6)}
                >
                  Show more {searchMode} ({remainingResults} left)
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
        <DialogContent className="max-w-md rounded-2xl border border-surface-200 bg-white">
          <DialogHeader>
            <DialogTitle>Register as patient to book</DialogTitle>
            <DialogDescription>
              Booking requires a patient account. Create one to continue your booking.
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
