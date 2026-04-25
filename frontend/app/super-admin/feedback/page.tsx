'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { superAdminApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import type { PlatformFeedback } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stars } from '@/components/reviews/Stars'

const FEEDBACK_ROLE_FILTERS: Array<'all' | 'admin' | 'doctor' | 'patient'> = [
  'all',
  'admin',
  'doctor',
  'patient',
]

export default function SuperAdminFeedbackPage() {
  const { error } = useToast()
  const currentUser = getUser()
  const [platformFeedback, setPlatformFeedback] = useState<PlatformFeedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedbackRoleFilter, setFeedbackRoleFilter] = useState<'all' | 'admin' | 'doctor' | 'patient'>('all')

  const load = useCallback(async () => {
    if (!currentUser?.id) {
      setIsLoading(false)
      return
    }

    setIsRefreshing(true)
    try {
      const response = await superAdminApi.getPlatformFeedback({
        viewer_user_id: currentUser.id,
        role: feedbackRoleFilter === 'all' ? undefined : feedbackRoleFilter,
      })
      setPlatformFeedback(response.data)
    } catch {
      error('Failed to load platform feedback')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [currentUser?.id, error, feedbackRoleFilter])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Platform Feedback</h1>
          <p className="text-sm text-surface-500 mt-1">Review feedback submitted by admins, doctors, and patients.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isRefreshing} className="rounded-xl">
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold font-heading text-surface-900">All Feedback</h2>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_ROLE_FILTERS.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={feedbackRoleFilter === item ? 'default' : 'outline'}
                onClick={() => setFeedbackRoleFilter(item)}
                className="rounded-xl capitalize"
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((idx) => <div key={idx} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : platformFeedback.length === 0 ? (
          <p className="text-sm text-surface-500 py-6 text-center">No platform feedback yet.</p>
        ) : (
          <div className="space-y-3">
            {platformFeedback.map((feedback) => (
              <div key={feedback.id} className="rounded-xl border border-surface-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{feedback.user_name}</p>
                    <p className="text-xs text-surface-500">{feedback.user_email}</p>
                    <p className="text-xs text-surface-400 mt-1">{feedback.clinic_name || 'Platform user'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-600 capitalize">{feedback.user_role}</p>
                    <p className="text-xs text-surface-400">{new Date(feedback.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={feedback.rating} />
                  <span className="text-xs text-surface-500">{feedback.rating}/5</span>
                </div>
                {feedback.comment ? (
                  <p className="text-sm text-surface-700 mt-2 whitespace-pre-wrap">{feedback.comment}</p>
                ) : (
                  <p className="text-sm text-surface-400 mt-2 italic">No comment provided.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
