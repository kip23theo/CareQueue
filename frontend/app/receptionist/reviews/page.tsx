'use client'

import { useEffect, useMemo, useState } from 'react'
import { getUser } from '@/lib/auth'
import { reviewsApi } from '@/lib/api-calls'
import { Card } from '@/components/ui/card'
import { Stars } from '@/components/reviews/Stars'
import type { ClinicReviewSummary, Review } from '@/types'
import { Loader2, MessageSquare, Users } from 'lucide-react'

export default function ReceptionistReviewsPage() {
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

  const average = useMemo(() => {
    if (!reviews.length) return 0
    return Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
  }, [reviews])

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading text-surface-900">Clinic Reviews</h1>
        <p className="text-sm text-surface-500 mt-1">Live patient feedback for front-desk improvements.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs text-surface-500">Average clinic rating</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{average.toFixed(1)}</p>
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

      <Card className="rounded-2xl border border-surface-200 bg-white p-5">
        <h2 className="font-semibold font-heading text-surface-900 flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-brand-500" />
          Recent Feedback
        </h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-surface-500">No feedback yet.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {reviews.map((review) => (
              <div key={review._id} className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                    <Users size={14} className="text-brand-500" />
                    {review.patient_name || 'Patient'}
                  </p>
                  <Stars value={review.rating} />
                </div>
                {review.comment && <p className="text-sm text-surface-700 mt-2">{review.comment}</p>}
                <p className="text-xs text-surface-500 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
