'use client'

import { useEffect, useMemo, useState } from 'react'
import { getUser } from '@/lib/auth'
import { reviewsApi } from '@/lib/api-calls'
import { Card } from '@/components/ui/card'
import { Stars } from '@/components/reviews/Stars'
import type { ClinicReviewSummary, Review } from '@/types'
import { Loader2, Building2, MessageSquare, Stethoscope } from 'lucide-react'

export default function AdminReviewsPage() {
  const user = getUser()

  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<ClinicReviewSummary | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    if (!user?.clinic_id) return

    Promise.all([
      reviewsApi.getClinicSummary(user.clinic_id),
      reviewsApi.getByClinic(user.clinic_id),
    ])
      .then(([summaryRes, reviewsRes]) => {
        setSummary(summaryRes.data)
        setReviews(reviewsRes.data)
      })
      .finally(() => setIsLoading(false))
  }, [user?.clinic_id])

  const latestReviews = useMemo(
    () => [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [reviews]
  )

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading text-surface-900">Patient Reviews</h1>
        <p className="text-sm text-surface-500 mt-1">Clinic and doctor star ratings from patients.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs text-surface-500">Clinic average</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">
            {summary?.clinic_average_rating.toFixed(1) ?? '0.0'}
          </p>
        </Card>
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs text-surface-500">Clinic reviews</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{summary?.total_clinic_reviews ?? 0}</p>
        </Card>
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs text-surface-500">Doctor reviews</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{summary?.total_doctor_reviews ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <h2 className="font-semibold font-heading text-surface-900 flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-brand-500" />
            Doctor Ratings
          </h2>

          {summary?.doctor_summaries.length ? (
            <div className="space-y-3">
              {summary.doctor_summaries.map((doctor) => (
                <div key={doctor.doctor_id} className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                  <p className="text-sm font-semibold text-surface-900">{doctor.doctor_name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Stars value={doctor.average_rating} />
                    <p className="text-xs text-surface-500">{doctor.total_reviews} reviews</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-500">No doctor reviews yet.</p>
          )}
        </Card>

        <Card className="rounded-2xl border border-surface-200 bg-white p-5">
          <h2 className="font-semibold font-heading text-surface-900 flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-brand-500" />
            Recent Clinic Reviews
          </h2>

          {latestReviews.length ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {latestReviews.map((review) => (
                <div key={review._id} className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                      <Building2 size={14} className="text-surface-500" />
                      {review.patient_name || 'Patient'}
                    </p>
                    <Stars value={review.rating} />
                  </div>
                  {review.comment && <p className="text-sm text-surface-700 mt-2">{review.comment}</p>}
                  <p className="text-xs text-surface-500 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-500">No clinic reviews yet.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
