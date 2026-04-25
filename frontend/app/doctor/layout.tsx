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
    <div className="flex min-h-screen bg-transparent">
      <SidebarWrapper />
      <TopRightFeedbackButton href="/doctor/feedback" />
      <main className="relative flex-1 overflow-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_0%,rgba(14,116,144,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.26),transparent)]"
        />
        {children}
      </main>
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
