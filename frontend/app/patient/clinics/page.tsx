'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePatient } from '@/context/PatientContext'
import { clinicsApi } from '@/lib/api-calls'
import { aiApi } from '@/lib/api-calls'
import { ClinicCard } from '@/components/ui/ClinicCard'
import { cn } from '@/lib/utils'
import type { Clinic, AIRecommendation } from '@/types'
import { Search, SlidersHorizontal, Sparkles, X, Loader2 } from 'lucide-react'
import axios from 'axios'

const SPECS = ['General', 'Paediatrics', 'ENT', 'Orthopaedics', 'Gynaecology', 'Cardiology']
const SORTS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'wait', label: 'Shortest wait' },
  { value: 'rating', label: 'Highest rated' },
]

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-5">
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
    </div>
  )
}

export default function ClinicsPage() {
  const router = useRouter()
  const { location, nearbyClinics, setNearbyClinics } = usePatient()
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('nearest')
  const [specFilter, setSpecFilter] = useState<string[]>([])
  const [showAIModal, setShowAIModal] = useState(false)
  const [symptoms, setSymptoms] = useState('')
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!location) {
      router.push('/patient')
      return
    }
    const fetchClinics = async () => {
      setIsLoading(true)
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
  }, [location])

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

  const aiRecommendedIds = new Set(aiRecommendations.map((r) => r.clinic_id))

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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clinics..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:outline-none focus:border-brand-400 transition-all"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-surface-200 bg-white text-sm text-surface-700 focus:outline-none focus:border-brand-400"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Spec chips + AI button */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setShowAIModal(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Sparkles size={12} />
            Ask AI
          </button>
          {SPECS.map((s) => (
            <button
              key={s}
              onClick={() => setSpecFilter((prev) =>
                prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
              )}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                specFilter.includes(s)
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* AI summary */}
      {aiRecommendations.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles size={14} className="text-brand-500 shrink-0 mt-0.5" />
            <p className="text-xs text-brand-700">
              AI found {aiRecommendations.length} best matches for your symptoms
            </p>
          </div>
          <button onClick={() => setAIRecommendations([])} className="text-brand-400 hover:text-brand-600">
            <X size={14} />
          </button>
        </div>
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
                onSelect={() => router.push(`/patient/clinic/${clinic._id}`)}
              />
            )
          })
        )}
      </div>

      {/* AI modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-heading text-surface-900 flex items-center gap-2">
                <Sparkles size={18} className="text-brand-500" />
                AI Clinic Finder
              </h3>
              <button onClick={() => setShowAIModal(false)} className="text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-surface-500 mb-4">Describe your symptoms and I'll find the best clinic for you.</p>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. fever, headache, sore throat..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:border-brand-400 resize-none mb-4"
            />
            <button
              onClick={handleAIRecommend}
              disabled={!symptoms.trim() || isAILoading}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAILoading ? <><Loader2 size={16} className="animate-spin" /> Finding...</> : 'Find best clinic'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
