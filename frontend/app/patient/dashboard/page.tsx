'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  clinicsApi,
  patientsApi,
  reviewsApi,
} from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type {
  MedicalDocument,
  MedicalHistoryEntry,
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
  Loader2,
  FileText,
  History,
  Star,
  Building2,
  Stethoscope,
} from 'lucide-react'
import axios from 'axios'

type ReviewTarget = 'clinic' | 'doctor'

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

export default function PatientDashboardPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [history, setHistory] = useState<MedicalHistoryEntry[]>([])
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const [clinicNames, setClinicNames] = useState<Record<string, string>>({})
  const [doctorsByClinic, setDoctorsByClinic] = useState<Record<string, { id: string; name: string }[]>>({})
  const [doctorNames, setDoctorNames] = useState<Record<string, string>>({})

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
        const [{ data: dashboard }, { data: patientReviews }] = await Promise.all([
          patientsApi.getDashboard(user.id),
          reviewsApi.getByPatient(user.id),
        ])

        if (!isActive) return

        setHistory(dashboard.medical_history)
        setDocuments(dashboard.documents)
        setReviews(patientReviews)

        const allClinicIds = Array.from(new Set([
          ...dashboard.medical_history.map((entry) => entry.clinic_id).filter(Boolean),
          ...dashboard.documents.map((document) => document.clinic_id).filter(Boolean),
        ] as string[]))

        if (allClinicIds.length === 0) return

        const clinicData = await Promise.all(
          allClinicIds.map(async (id) => {
            const [clinicRes, doctorsRes] = await Promise.all([
              clinicsApi.getById(id),
              clinicsApi.getDoctors(id),
            ])
            return {
              clinic: clinicRes.data,
              doctors: doctorsRes.data,
            }
          })
        )

        if (!isActive) return

        const nextClinicNames: Record<string, string> = {}
        const nextDoctorsByClinic: Record<string, { id: string; name: string }[]> = {}
        const nextDoctorNames: Record<string, string> = {}

        clinicData.forEach(({ clinic, doctors }) => {
          nextClinicNames[clinic._id] = clinic.name
          nextDoctorsByClinic[clinic._id] = doctors.map((doctor) => ({
            id: doctor._id,
            name: doctor.name,
          }))
          doctors.forEach((doctor) => {
            nextDoctorNames[doctor._id] = doctor.name
          })
        })

        setClinicNames(nextClinicNames)
        setDoctorsByClinic(nextDoctorsByClinic)
        setDoctorNames(nextDoctorNames)

        const defaultClinicId = allClinicIds[0]
        const defaultDoctorId = nextDoctorsByClinic[defaultClinicId]?.[0]?.id ?? ''
        setClinicId(defaultClinicId)
        setDoctorId(defaultDoctorId)
      } catch (err) {
        if (!isActive) return
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail ?? 'Failed to load dashboard')
        } else {
          setError('Failed to load dashboard')
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

  const handleClinicSelection = (selectedClinicId: string) => {
    setClinicId(selectedClinicId)
    const firstDoctorId = doctorsByClinic[selectedClinicId]?.[0]?.id ?? ''
    setDoctorId(firstDoctorId)
  }

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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    if (!clinicId || rating < 1) {
      setError('Please select clinic and star rating')
      return
    }

    if (targetType === 'doctor' && !doctorId) {
      setError('Please select doctor')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await reviewsApi.add({
        clinic_id: clinicId,
        target_type: targetType,
        doctor_id: targetType === 'doctor' ? doctorId : undefined,
        patient_user_id: user.id,
        rating,
        comment,
        patient_name: user.name,
      })

      setRating(0)
      setComment('')
      const { data: patientReviews } = await reviewsApi.getByPatient(user.id)
      setReviews(patientReviews)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Unable to submit review')
      } else {
        setError('Unable to submit review')
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading text-surface-900">Patient Dashboard</h1>
        <p className="text-sm text-surface-500 mt-1">Medical history, documents, and your doctor/clinic ratings.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl border border-surface-200 bg-white">
          <p className="text-xs text-surface-500">Average rating given</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <h2 className="font-semibold font-heading text-surface-900 flex items-center gap-2 mb-4">
            <History size={16} className="text-brand-500" />
            Medical History
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-surface-500">No history entries yet.</p>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                  <p className="font-semibold text-surface-900 text-sm">{entry.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{new Date(entry.visit_date).toLocaleDateString()}</p>
                  <p className="text-sm text-surface-700 mt-2">{entry.diagnosis || 'No diagnosis added.'}</p>
                  {entry.prescriptions.length > 0 && (
                    <p className="text-xs text-surface-600 mt-2">Prescription: {entry.prescriptions.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <h2 className="font-semibold font-heading text-surface-900 flex items-center gap-2 mb-4">
            <FileText size={16} className="text-brand-500" />
            Medical Documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-surface-500">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {documents.map((document) => (
                <a
                  key={document.id}
                  href={document.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-surface-100 bg-surface-50 p-4 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                >
                  <p className="font-semibold text-surface-900 text-sm">{document.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {document.document_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-brand-600 mt-2">Open document</p>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <h2 className="font-semibold font-heading text-surface-900 mb-4">Add Review</h2>
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
              <Select value={clinicId} onValueChange={handleClinicSelection}>
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

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-brand-500 text-white hover:bg-brand-600">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit review'
              )}
            </Button>
          </form>
        </Card>

        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <h2 className="font-semibold font-heading text-surface-900 mb-4">My Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-surface-500">You have not submitted any reviews yet.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
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
                  <p className="text-xs text-surface-500 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
