'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePatient } from '@/context/PatientContext'
import { clinicsApi } from '@/lib/api-calls'
import { aiApi } from '@/lib/api-calls'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import type { AIRecommendation } from '@/types'
import { Search, Sparkles, X, Loader2, MapPin, LocateFixed } from 'lucide-react'
import axios from 'axios'

const SPECS = ['General', 'Paediatrics', 'ENT', 'Orthopaedics', 'Gynaecology', 'Cardiology']
const SORTS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'wait', label: 'Shortest wait' },
  { value: 'rating', label: 'Highest rated' },
]
const CITY_PRESETS = [
  { name: 'Mumbai', lat: 19.076, lng: 72.877 },
  { name: 'Delhi', lat: 28.679, lng: 77.069 },
  { name: 'Bangalore', lat: 12.971, lng: 77.594 },
  { name: 'Chennai', lat: 13.083, lng: 80.27 },
]

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
  const [isLoading, setIsLoading] = useState(true)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([])
  const [locationError, setLocationError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('nearest')
  const [specFilter, setSpecFilter] = useState<string[]>([])
  const [showAIModal, setShowAIModal] = useState(false)
  const [symptoms, setSymptoms] = useState('')
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeLocationLabel = location?.label?.trim()
    ? location.label
    : location
      ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
      : ''

  useEffect(() => {
    if (!location) {
      router.push('/patient')
      return
    }
    const fetchClinics = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await clinicsApi.getNearby({ lat: location.lat, lng: location.lng, radius: 5000 })
        setNearbyClinics(data)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail ?? 'Failed to load clinics')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchClinics()
  }, [location, router, setNearbyClinics])

  useEffect(() => {
    const query = locationQuery.trim()
    if (query.length < 2 || query === activeLocationLabel.trim()) {
      return
    }

    const timer = window.setTimeout(async () => {
      setIsLocationSearchLoading(true)
      try {
        const suggestions = await searchLocationSuggestions(query)
        setLocationSuggestions(suggestions)
      } catch {
        setLocationSuggestions([])
      } finally {
        setIsLocationSearchLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [locationQuery, activeLocationLabel])

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    setLocation({
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: suggestion.label,
    })
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

  const handleAIRecommend = async () => {
    if (!location || !symptoms.trim()) return
    setIsAILoading(true)
    try {
      const { data } = await aiApi.recommend({ lat: location.lat, lng: location.lng, symptoms })
      setAIRecommendations(data.recommendations)
      setShowAIModal(false)
    } catch {
      // ignore
    } finally {
      setIsAILoading(false)
    }
  }

  const filtered = useMemo(() => {
    let list = [...nearbyClinics]
    if (search) {
      list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    }
    if (specFilter.length > 0) {
      list = list.filter((c) => specFilter.some((s) => c.specializations.includes(s)))
    }
    if (sort === 'nearest') list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
    else if (sort === 'wait') list.sort((a, b) => (a.est_wait_mins ?? 999) - (b.est_wait_mins ?? 999))
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)

    // Put AI recommended at top
    if (aiRecommendations.length > 0) {
      list.sort((a, b) => {
        const aIdx = aiRecommendations.findIndex((r) => r.clinic_id === a._id)
        const bIdx = aiRecommendations.findIndex((r) => r.clinic_id === b._id)
        if (aIdx === -1 && bIdx === -1) return 0
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
    }
    return list
  }, [nearbyClinics, search, sort, specFilter, aiRecommendations])

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Filter bar */}
      <div className="sticky top-14 z-30 bg-surface-50 py-3 space-y-3">
        <Card className="rounded-2xl border border-surface-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-surface-500 mb-2">
            <MapPin size={13} className="text-brand-500 shrink-0" />
            <p className="truncate">
              Showing clinics near <span className="font-medium text-surface-700">{activeLocationLabel || 'your selected area'}</span>
            </p>
          </div>

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
              {(isLocationSearchLoading || locationSuggestions.length > 0) && (
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

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CITY_PRESETS.map((city) => (
              <Button
                key={city.name}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSelectLocation({ lat: city.lat, lng: city.lng, label: city.name })}
                className="h-7 rounded-full border-surface-200 bg-white text-[11px] text-surface-600 hover:border-brand-300 hover:text-brand-700"
              >
                {city.name}
              </Button>
            ))}
          </div>

          <p className="mt-2 text-[11px] text-surface-400">
            Search suggestions are powered by OpenStreetMap.
          </p>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clinics..."
              className="h-10 rounded-xl border-surface-200 bg-white pl-9 pr-4 text-sm"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-36 h-10 rounded-xl border-surface-200 bg-white text-sm text-surface-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Spec chips + AI button */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            onClick={() => setShowAIModal(true)}
            size="sm"
            className="shrink-0 h-8 px-3 rounded-full bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 shadow-sm"
          >
            <Sparkles size={12} />
            Ask AI
          </Button>
          {SPECS.map((s) => (
            <Button
              key={s}
              onClick={() => setSpecFilter((prev) =>
                prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
              )}
              size="sm"
              variant={specFilter.includes(s) ? 'default' : 'outline'}
              className={cn(
                'shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-all',
                specFilter.includes(s)
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300'
              )}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* AI summary */}
      {aiRecommendations.length > 0 && (
        <Card className="mb-4 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles size={14} className="text-brand-500 shrink-0 mt-0.5" />
            <p className="text-xs text-brand-700">
              AI found {aiRecommendations.length} best matches for your symptoms
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAIRecommendations([])}
            className="h-6 w-6 text-brand-400 hover:text-brand-600"
          >
            <X size={14} />
          </Button>
        </Card>
      )}

      {/* Clinic list */}
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
          filtered.map((clinic) => {
            const aiRec = aiRecommendations.find((r) => r.clinic_id === clinic._id)
            return (
              <ClinicCard
                key={clinic._id}
                clinic={clinic}
                isBestMatch={aiRec?.rank === 1}
                aiReason={aiRec?.reason}
                userLocation={location}
                onSelect={() => router.push(`/patient/clinic/${clinic._id}`)}
              />
            )
          })
        )}
      </div>

      {/* AI modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="w-full max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold font-heading text-surface-900 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-500" />
              AI Clinic Finder
            </DialogTitle>
            <DialogDescription className="text-sm text-surface-500">
              Describe your symptoms and I&apos;ll find the best clinic for you.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. fever, headache, sore throat..."
            rows={3}
            className="rounded-xl border-surface-200 bg-surface-50 text-sm resize-none"
          />
          <Button
            onClick={handleAIRecommend}
            disabled={!symptoms.trim() || isAILoading}
            className="w-full h-11 rounded-xl bg-brand-500 text-white hover:bg-brand-600 text-sm"
          >
            {isAILoading ? <><Loader2 size={16} className="animate-spin" /> Finding...</> : 'Find best clinic'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
