'use client'

import { PlatformFeedbackForm } from '@/components/feedback/PlatformFeedbackForm'

export default function AdminFeedbackPage() {
  return (
    <PlatformFeedbackForm
      role="admin"
      backHref="/admin"
      title="Rate CareQueue"
      description="Share feedback about the platform experience for clinic admins."
    />
  )
}
