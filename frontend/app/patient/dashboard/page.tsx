'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  clinicsApi,
  patientsApi,
  reviewsApi,
  tokensApi,
} from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { cn, formatTokenDisplay, formatWaitTime } from '@/lib/utils'
import type {
  MedicalDocument,
  MedicalHistoryEntry,
  QueueToken,
  Review,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Loader2,
  Star,
  Building2,
  Stethoscope,
  Home,
  CalendarClock,
  History,
  Clock3,
  FileText,
  Activity,
} from 'lucide-react'
import axios from 'axios'

type ReviewTarget = 'clinic' | 'doctor'

const ACTIVE_BOOKING_STATUSES: QueueToken['status'][] = [
  'WAITING',
  'CALLED',
  'IN_CONSULTATION',
  'EMERGENCY',
]

const STATUS_PRIORITY: Record<QueueToken['status'], number> = {
  EMERGENCY: 0,
  IN_CONSULTATION: 1,
  CALLED: 2,
  WAITING: 3,
  COMPLETED: 4,
  SKIPPED: 5,
  CANCELLED: 6,
  NO_SHOW: 7,
}

function StarRating({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={cn('transition-transform', onChange && 'hover:scale-110')}
            disabled={!onChange}
          >
            <Star
              size={18}
              className={cn(
                filled ? 'fill-amber-400 text-amber-400' : 'text-surface-300',
                !onChange && 'cursor-default'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

function getDisplayToken(token: QueueToken): string {
  return token.token_display || formatTokenDisplay(token.token_number)
}

function getDateLabel(value?: string | null): string {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleDateString()
}

function getDateTimeLabel(value?: string | null): string {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleString()
}

function getDateKey(value?: string | null): string {
  if (!value) return ''
  if (value.length >= 10) return value.slice(0, 10)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function toTokenSortTimestamp(token: QueueToken): number {
  const raw = token.consult_end || token.consult_start || token.joined_at || token.date
  const timestamp = new Date(raw).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getActiveTokenMessage(token: QueueToken): string {
  if (token.status === 'IN_CONSULTATION') return 'Your consultation is in progress.'
  if (token.status === 'CALLED') return 'Your token has been called. Please proceed to the clinic.'
  if (token.status === 'EMERGENCY') return 'Your token is marked as emergency priority.'

  if (token.position <= 1) return 'You are next in line.'
  return `${Math.max(token.position - 1, 0)} patient(s) ahead of you.`
}

export default function PatientDashboardPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewNotice, setReviewNotice] = useState<string | null>(null)

  const [history, setHistory] = useState<MedicalHistoryEntry[]>([])
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [bookings, setBookings] = useState<QueueToken[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const [clinicNames, setClinicNames] = useState<Record<string, string>>({})
  const [doctorsByClinic, setDoctorsByClinic] = useState<Record<string, { id: string; name: string }[]>>({})
  const [doctorNames, setDoctorNames] = useState<Record<string, string>>({})

  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [reviewVisitId, setReviewVisitId] = useState<string | null>(null)

  const [targetType, setTargetType] = useState<ReviewTarget>('clinic')
  const [clinicId, setClinicId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const user = getUser()

  useEffect(() => {
    if (!user?.id || user.role !== 'patient') {
      router.replace('/auth/login')
      return
    }

    let isActive = true

    const load = async () => {
      try {
        const [{ data: dashboard }, { data: patientReviews }, { data: patientTokens }] = await Promise.all([
          patientsApi.getDashboard(user.id),
          reviewsApi.getByPatient(user.id),
          tokensApi.getByPatient(user.id),
        ])

        if (!isActive) return

        setHistory(dashboard.medical_history)
        setDocuments(dashboard.documents)
        setReviews(patientReviews)
        setBookings(patientTokens)

        const allClinicIds = Array.from(new Set([
          ...dashboard.medical_history.map((entry) => entry.clinic_id),
          ...dashboard.documents.map((document) => document.clinic_id),
          ...patientTokens.map((token) => token.clinic_id),
        ].filter((value): value is string => Boolean(value))))

        if (allClinicIds.length === 0) {
          setClinicId('')
          setDoctorId('')
          return
        }

        const clinicData = await Promise.all(
          allClinicIds.map(async (id) => {
            try {
              const [clinicRes, doctorsRes] = await Promise.all([
                clinicsApi.getById(id),
                clinicsApi.getDoctors(id),
              ])
              return {
                clinic: clinicRes.data,
                doctors: doctorsRes.data,
              }
            } catch {
              return null
            }
          })
        )

        if (!isActive) return

        const nextClinicNames: Record<string, string> = {}
        const nextDoctorsByClinic: Record<string, { id: string; name: string }[]> = {}
        const nextDoctorNames: Record<string, string> = {}

        clinicData.forEach((entry) => {
          if (!entry) return
          nextClinicNames[entry.clinic._id] = entry.clinic.name
          nextDoctorsByClinic[entry.clinic._id] = entry.doctors.map((doctor) => ({
            id: doctor._id,
            name: doctor.name,
          }))
          entry.doctors.forEach((doctor) => {
            nextDoctorNames[doctor._id] = doctor.name
          })
        })

        setClinicNames(nextClinicNames)
        setDoctorsByClinic(nextDoctorsByClinic)
        setDoctorNames(nextDoctorNames)

        const preferredVisit = patientTokens.find((token) => token.status === 'COMPLETED')
        const defaultClinicId = preferredVisit?.clinic_id ?? allClinicIds[0] ?? ''
        const defaultDoctorId = preferredVisit?.doctor_id ?? nextDoctorsByClinic[defaultClinicId]?.[0]?.id ?? ''
        setClinicId(defaultClinicId)
        setDoctorId(defaultDoctorId)
      } catch (err) {
        if (!isActive) return
        if (axios.isAxiosError(err)) {
          setLoadError(err.response?.data?.detail ?? 'Failed to load dashboard')
        } else {
          setLoadError('Failed to load dashboard')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [router, user?.id, user?.role])

  const activeBookings = useMemo(() => {
    return bookings
      .filter((token) => ACTIVE_BOOKING_STATUSES.includes(token.status))
      .sort((a, b) => {
        const priority = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
        if (priority !== 0) return priority
        if (a.status === 'WAITING' && b.status === 'WAITING') {
          return a.position - b.position
        }
        return toTokenSortTimestamp(a) - toTokenSortTimestamp(b)
      })
  }, [bookings])

  const visitedBookings = useMemo(() => {
    return bookings
      .filter((token) => token.status === 'COMPLETED')
      .sort((a, b) => toTokenSortTimestamp(b) - toTokenSortTimestamp(a))
  }, [bookings])

  const selectedVisit = useMemo(() => {
    if (visitedBookings.length === 0) return null
    if (!selectedVisitId) return visitedBookings[0]
    return visitedBookings.find((visit) => visit._id === selectedVisitId) ?? visitedBookings[0]
  }, [selectedVisitId, visitedBookings])

  const reviewVisit = useMemo(() => {
    if (!reviewVisitId) return null
    return visitedBookings.find((visit) => visit._id === reviewVisitId) ?? null
  }, [reviewVisitId, visitedBookings])

  const selectedVisitRelatedHistory = useMemo(() => {
    if (!selectedVisit) return []

    const clinicMatched = history.filter((entry) => entry.clinic_id === selectedVisit.clinic_id)
    if (clinicMatched.length === 0) return []

    const visitDateKey = getDateKey(selectedVisit.consult_end || selectedVisit.consult_start || selectedVisit.joined_at || selectedVisit.date)
    const dayMatched = clinicMatched.filter((entry) => getDateKey(entry.visit_date) === visitDateKey)

    return dayMatched.length > 0 ? dayMatched : clinicMatched
  }, [history, selectedVisit])

  const selectedVisitRelatedDocuments = useMemo(() => {
    if (!selectedVisit) return []

    const historyIds = new Set(selectedVisitRelatedHistory.map((entry) => entry.id))
    const visitDateKey = getDateKey(selectedVisit.consult_end || selectedVisit.consult_start || selectedVisit.joined_at || selectedVisit.date)

    return documents.filter((document) => {
      if (document.clinic_id !== selectedVisit.clinic_id) return false
      if (document.medical_history_id && historyIds.has(document.medical_history_id)) return true

      const issuedDateKey = getDateKey(document.issued_on)
      const createdDateKey = getDateKey(document.created_at)
      return issuedDateKey === visitDateKey || createdDateKey === visitDateKey
    })
  }, [documents, selectedVisit, selectedVisitRelatedHistory])

  const nextActiveToken = activeBookings[0] ?? null

  const reviewedStats = useMemo(() => {
    const clinicReviews = reviews.filter((review) => review.target_type === 'clinic')
    const doctorReviews = reviews.filter((review) => review.target_type === 'doctor')
    const avg = reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : '0.0'

    return {
      avg,
      clinicCount: clinicReviews.length,
      doctorCount: doctorReviews.length,
    }
  }, [reviews])

  const handleReviewClinicSelection = (selectedClinicId: string) => {
    setClinicId(selectedClinicId)
    const doctors = doctorsByClinic[selectedClinicId] ?? []
    setDoctorId(doctors[0]?.id ?? '')
  }

  const handleReviewVisit = (visit: QueueToken) => {
    setReviewVisitId(visit._id)
    setClinicId(visit.clinic_id)
    setDoctorId(visit.doctor_id ?? doctorsByClinic[visit.clinic_id]?.[0]?.id ?? '')
    setTargetType('clinic')
    setRating(0)
    setComment('')
    setReviewError(null)
    setReviewNotice(null)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    if (!clinicId || rating < 1) {
      setReviewError('Please select clinic and star rating')
      return
    }

    const doctorsForClinic = doctorsByClinic[clinicId] ?? []
    const selectedDoctorId = doctorsForClinic.some((doctor) => doctor.id === doctorId)
      ? doctorId
      : doctorsForClinic[0]?.id ?? ''

    if (targetType === 'doctor' && !selectedDoctorId) {
      setReviewError('Please select doctor')
      return
    }

    setReviewError(null)
    setReviewNotice(null)
    setIsSubmitting(true)
    try {
      await reviewsApi.add({
        clinic_id: clinicId,
        target_type: targetType,
        doctor_id: targetType === 'doctor' ? selectedDoctorId : undefined,
        patient_user_id: user.id,
        token_id: reviewVisit?._id ?? undefined,
        rating,
        comment,
        patient_name: user.name,
      })

      setRating(0)
      setComment('')
      setReviewNotice('Review submitted successfully.')

      const { data: patientReviews } = await reviewsApi.getByPatient(user.id)
      setReviews(patientReviews)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setReviewError(err.response?.data?.detail ?? 'Unable to submit review')
      } else {
        setReviewError('Unable to submit review')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Card className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading text-surface-900">Patient Dashboard</h1>
        <p className="text-sm text-surface-500 mt-1">Track your booking, view visited clinics, and manage your reviews.</p>
      </div>

      <Tabs defaultValue="home" className="space-y-4">
        <TabsList className="h-auto w-full flex-nowrap sm:flex-wrap justify-start rounded-2xl border border-surface-200 bg-white p-1.5 overflow-x-auto">
          <TabsTrigger value="home" className="h-9 shrink-0 gap-1.5 rounded-xl px-3.5 text-xs sm:text-sm data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            <Home size={14} />
            Home
          </TabsTrigger>
          <TabsTrigger value="bookings" className="h-9 shrink-0 gap-1.5 rounded-xl px-3.5 text-xs sm:text-sm data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            <CalendarClock size={14} />
            Current Bookings
          </TabsTrigger>
          <TabsTrigger value="visits" className="h-9 shrink-0 gap-1.5 rounded-xl px-3.5 text-xs sm:text-sm data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            <History size={14} />
            Visited Clinics
          </TabsTrigger>
          <TabsTrigger value="reviews" className="h-9 shrink-0 gap-1.5 rounded-xl px-3.5 text-xs sm:text-sm data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            <Star size={14} />
            My Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
              <p className="text-xs text-surface-500">Active bookings</p>
              <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{activeBookings.length}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
              <p className="text-xs text-surface-500">Visited clinics</p>
              <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{visitedBookings.length}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
              <p className="text-xs text-surface-500">Average rating given</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold font-heading text-surface-900">{reviewedStats.avg}</p>
                <Star size={16} className="fill-amber-400 text-amber-400" />
              </div>
            </Card>
          </div>

          {nextActiveToken ? (
            <Card className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Current queue status</p>
                  <h2 className="text-xl font-bold font-heading text-surface-900 mt-1">
                    Token {getDisplayToken(nextActiveToken)} at {clinicNames[nextActiveToken.clinic_id] ?? 'Clinic'}
                  </h2>
                  <p className="text-sm text-surface-700 mt-1">{getActiveTokenMessage(nextActiveToken)}</p>
                  <p className="text-xs text-surface-500 mt-2">
                    Status: {nextActiveToken.status.replace(/_/g, ' ')}
                    {' · '}
                    ETA: ~{formatWaitTime(nextActiveToken.est_wait_mins)}
                  </p>
                </div>

                <Button
                  onClick={() => router.push(`/patient/token/${nextActiveToken._id}`)}
                  className="h-10 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                >
                  Track token
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-surface-200 bg-white p-5">
              <p className="text-sm text-surface-600">No active token right now. Book a clinic to start tracking your queue status.</p>
            </Card>
          )}

          {activeBookings.length > 0 && (
            <Card className="rounded-2xl border border-surface-200 bg-white p-5">
              <h2 className="font-semibold font-heading text-surface-900 mb-3">Current bookings snapshot</h2>
              <div className="space-y-2">
                {activeBookings.slice(0, 3).map((token) => (
                  <div key={token._id} className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-surface-900">
                        {clinicNames[token.clinic_id] ?? 'Clinic'} · {getDisplayToken(token)}
                      </p>
                      <span className="text-xs font-medium text-brand-600">{token.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">~{formatWaitTime(token.est_wait_mins)} remaining</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card className="rounded-2xl border border-surface-200 bg-white p-5">
            <h2 className="font-semibold font-heading text-surface-900 mb-4">Current Bookings</h2>
            {activeBookings.length === 0 ? (
              <p className="text-sm text-surface-500">You do not have any active bookings.</p>
            ) : (
              <div className="space-y-3">
                {activeBookings.map((token) => (
                  <div key={token._id} className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-surface-900">
                          {clinicNames[token.clinic_id] ?? 'Clinic'}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">
                          Token {getDisplayToken(token)} · Joined {getDateTimeLabel(token.joined_at)}
                        </p>
                        <p className="text-xs text-surface-600 mt-1">
                          Status: {token.status.replace(/_/g, ' ')} · Position: {token.position || '—'} · ETA: ~{formatWaitTime(token.est_wait_mins)}
                        </p>
                      </div>

                      <Button
                        onClick={() => router.push(`/patient/token/${token._id}`)}
                        variant="outline"
                        className="rounded-xl border-surface-300"
                      >
                        Track
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
            <Card className="rounded-2xl border border-surface-200 bg-white p-5">
              <h2 className="font-semibold font-heading text-surface-900 mb-4">Visited Clinics</h2>
              {visitedBookings.length === 0 ? (
                <p className="text-sm text-surface-500">No completed visits yet.</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {visitedBookings.map((visit) => {
                    const isSelected = selectedVisit?._id === visit._id
                    return (
                      <div
                        key={visit._id}
                        className={cn(
                          'rounded-xl border p-4 transition-colors',
                          isSelected ? 'border-brand-300 bg-brand-50' : 'border-surface-100 bg-surface-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-surface-900">
                              {clinicNames[visit.clinic_id] ?? 'Clinic'}
                            </p>
                            <p className="text-xs text-surface-500 mt-0.5">
                              Token {getDisplayToken(visit)} · {getDateLabel(visit.consult_end || visit.consult_start || visit.joined_at || visit.date)}
                            </p>
                          </div>
                          <span className="text-[11px] rounded-full bg-green-100 px-2 py-0.5 text-green-700 font-medium">
                            Completed
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-surface-300"
                            onClick={() => setSelectedVisitId(visit._id)}
                          >
                            View history
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-brand-500 text-white hover:bg-brand-600"
                            onClick={() => handleReviewVisit(visit)}
                          >
                            Add review
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border border-surface-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="font-semibold font-heading text-surface-900">Visit Medical History</h2>
                {!selectedVisit ? (
                  <p className="text-sm text-surface-500 mt-1">Select a visit to view related medical history and documents.</p>
                ) : (
                  <p className="text-xs text-surface-500 mt-1">
                    {clinicNames[selectedVisit.clinic_id] ?? 'Clinic'} · Token {getDisplayToken(selectedVisit)}
                  </p>
                )}
              </div>

              {selectedVisit ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2">Medical history entries</p>
                    {selectedVisitRelatedHistory.length === 0 ? (
                      <p className="text-sm text-surface-500">No linked history entries for this visit.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedVisitRelatedHistory.map((entry) => (
                          <div key={entry.id} className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                            <p className="text-sm font-semibold text-surface-900">{entry.title}</p>
                            <p className="text-xs text-surface-500 mt-0.5">{getDateLabel(entry.visit_date)}</p>
                            <p className="text-sm text-surface-700 mt-1.5">{entry.diagnosis || 'No diagnosis added.'}</p>
                            {entry.prescriptions.length > 0 && (
                              <p className="text-xs text-surface-600 mt-1">Prescription: {entry.prescriptions.join(', ')}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2">Related documents</p>
                    {selectedVisitRelatedDocuments.length === 0 ? (
                      <p className="text-sm text-surface-500">No linked documents for this visit.</p>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {selectedVisitRelatedDocuments.map((document) => (
                          <a
                            key={document.id}
                            href={document.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl border border-surface-100 bg-surface-50 p-3 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                          >
                            <p className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                              <FileText size={14} className="text-brand-500" />
                              {document.title}
                            </p>
                            <p className="text-xs text-surface-500 mt-0.5">{document.document_type.replace(/_/g, ' ')}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </Card>
          </div>

          {reviewVisit && (
            <Card className="rounded-2xl border border-surface-200 bg-white p-5">
              <h2 className="font-semibold font-heading text-surface-900 mb-4">Add Review For Visit</h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">Review target</Label>
                  <Select value={targetType} onValueChange={(value) => setTargetType(value as ReviewTarget)}>
                    <SelectTrigger className="h-10 rounded-xl border-surface-200 bg-surface-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block">Clinic</Label>
                  <Select value={clinicId} onValueChange={handleReviewClinicSelection}>
                    <SelectTrigger className="h-10 rounded-xl border-surface-200 bg-surface-50">
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(clinicNames).map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {targetType === 'doctor' && (
                  <div>
                    <Label className="mb-1.5 block">Doctor</Label>
                    <Select value={doctorId} onValueChange={setDoctorId}>
                      <SelectTrigger className="h-10 rounded-xl border-surface-200 bg-surface-50">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {(doctorsByClinic[clinicId] ?? []).map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="mb-1.5 block">Star rating</Label>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div>
                  <Label className="mb-1.5 block">Comment</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience"
                    rows={3}
                    className="rounded-xl border-surface-200 bg-surface-50 resize-none"
                  />
                </div>

                {reviewError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {reviewError}
                  </div>
                )}

                {reviewNotice && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    {reviewNotice}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-surface-300"
                    onClick={() => setReviewVisitId(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-brand-500 text-white hover:bg-brand-600">
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit review'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
              <p className="text-xs text-surface-500">Average rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold font-heading text-surface-900">{reviewedStats.avg}</p>
                <Star size={16} className="fill-amber-400 text-amber-400" />
              </div>
            </Card>
            <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
              <p className="text-xs text-surface-500">Clinic reviews</p>
              <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{reviewedStats.clinicCount}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
              <p className="text-xs text-surface-500">Doctor reviews</p>
              <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{reviewedStats.doctorCount}</p>
            </Card>
          </div>

          <Card className="rounded-2xl border border-surface-200 bg-white p-5">
            <h2 className="font-semibold font-heading text-surface-900 mb-4">My Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-surface-500">You have not submitted any reviews yet.</p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {reviews.map((review) => (
                  <div key={review._id} className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                        {review.target_type === 'clinic' ? <Building2 size={14} /> : <Stethoscope size={14} />}
                        {review.target_type === 'clinic'
                          ? clinicNames[review.clinic_id] ?? 'Clinic'
                          : doctorNames[review.doctor_id ?? ''] ?? 'Doctor'}
                      </p>
                      <StarRating value={review.rating} />
                    </div>
                    {review.comment && <p className="text-sm text-surface-700 mt-2">{review.comment}</p>}
                    <p className="text-xs text-surface-500 mt-2">{getDateLabel(review.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="rounded-2xl border border-surface-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-surface-500">
          <span className="inline-flex items-center gap-1.5">
            <Activity size={13} className="text-brand-500" />
            Queue status refreshes from live token records.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={13} className="text-brand-500" />
            Visit timelines and histories are mapped by clinic and visit date.
          </span>
        </div>
      </Card>
    </div>
  )
}
