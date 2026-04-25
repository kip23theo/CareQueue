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
    <div className="flex min-h-screen bg-surface-100">
      <SidebarWrapper />
      <main className="flex-1 overflow-auto">{children}</main>
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
