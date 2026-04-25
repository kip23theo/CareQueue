'use client'

import { PlatformFeedbackForm } from '@/components/feedback/PlatformFeedbackForm'

export default function PatientFeedbackPage() {
  return (
    <PlatformFeedbackForm
      role="patient"
      backHref="/patient"
      title="Rate CareQueue"
      description="Share feedback about your platform experience as a patient."
    />
  )
}
