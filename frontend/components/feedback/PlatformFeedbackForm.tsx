'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Star } from 'lucide-react'

import { platformFeedbackApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type FeedbackRole = 'admin' | 'doctor' | 'patient'

interface Props {
  role: FeedbackRole
  backHref: string
  title: string
  description: string
}

export function PlatformFeedbackForm({ role, backHref, title, description }: Props) {
  const user = getUser()
  const { success, error } = useToast()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roleMismatch = !user || user.role !== role

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id || rating < 1) return

    setIsSubmitting(true)
    try {
      await platformFeedbackApi.submit({
        user_id: user.id,
        rating,
        comment,
      })
      success('Thanks for your feedback!')
      setRating(0)
      setComment('')
    } catch {
      error('Unable to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Button asChild variant="ghost" className="h-9 rounded-full text-surface-600">
        <Link href={backHref}>
          <ArrowLeft size={14} />
          Back
        </Link>
      </Button>

      <Card className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold font-heading text-surface-900">{title}</h1>
        <p className="text-sm text-surface-500 mt-1">{description}</p>

        {roleMismatch ? (
          <p className="text-sm text-red-600 mt-4">You are not allowed to submit feedback from this page.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-medium text-surface-900 mb-2">How would you rate your platform experience?</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="rounded-lg p-1 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={26}
                      className={cn(
                        'transition-colors',
                        value <= rating ? 'fill-amber-400 text-amber-400' : 'text-surface-300'
                      )}
                    />
                  </button>
                ))}
                <span className="text-sm text-surface-500 ml-1">{rating > 0 ? `${rating}/5` : 'Select rating'}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-surface-900 mb-2">Comment (optional)</p>
              <Textarea
                rows={5}
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tell us what worked well and what we should improve."
                className="rounded-xl border-surface-200"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || rating < 1}
              className="h-10 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Submit Feedback
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
