'use client'

import { PlatformFeedbackForm } from '@/components/feedback/PlatformFeedbackForm'

export default function DoctorFeedbackPage() {
  return (
    <PlatformFeedbackForm
      role="doctor"
      backHref="/doctor"
      title="Rate CareQueue"
      description="Share feedback about the platform experience for doctors."
    />
  )
}
