'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { ToastProvider } from '@/context/ToastContext'
import { QueueProvider } from '@/context/QueueContext'
import { StaffSidebar } from '@/components/layout/StaffSidebar'
import { useQueue } from '@/context/QueueContext'

function SidebarWrapper() {
  const { sseStatus } = useQueue()
  return <StaffSidebar sseStatus={sseStatus} />
}

function ReceptionistLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'receptionist') router.replace('/auth/login')
  }, [router])

  return (
    <div className="flex min-h-screen bg-transparent">
      <SidebarWrapper />
      <main className="relative flex-1 overflow-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_84%_0%,rgba(34,211,238,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.26),transparent)]"
        />
        {children}
      </main>
    </div>
  )
}

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <QueueProvider>
        <ReceptionistLayoutInner>{children}</ReceptionistLayoutInner>
      </QueueProvider>
    </ToastProvider>
  )
}
