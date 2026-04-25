'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { ToastProvider } from '@/context/ToastContext'
import { QueueProvider } from '@/context/QueueContext'
import { StaffSidebar } from '@/components/layout/StaffSidebar'
import { TopRightFeedbackButton } from '@/components/layout/TopRightFeedbackButton'
import { useQueue } from '@/context/QueueContext'

function SidebarWrapper() {
  const { sseStatus } = useQueue()
  return <StaffSidebar sseStatus={sseStatus} />
}

function DoctorLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'doctor') router.replace('/auth/login')
  }, [router])

  return (
    <div className="flex min-h-screen bg-surface-100">
      <SidebarWrapper />
      <TopRightFeedbackButton href="/doctor/feedback" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <QueueProvider>
        <DoctorLayoutInner>{children}</DoctorLayoutInner>
      </QueueProvider>
    </ToastProvider>
  )
}
