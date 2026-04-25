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

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'admin') router.replace('/auth/login')
  }, [router])

  return (
    <div className="flex min-h-screen bg-transparent">
      <SidebarWrapper />
      <TopRightFeedbackButton href="/admin/feedback" />
      <main className="relative flex-1 overflow-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.28),transparent)]"
        />
        {children}
      </main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <QueueProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </QueueProvider>
    </ToastProvider>
  )
}
