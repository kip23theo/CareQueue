'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { getUser } from '@/lib/auth'
import { ToastProvider } from '@/context/ToastContext'
import { StaffSidebar } from '@/components/layout/StaffSidebar'

function SuperAdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'super_admin') {
      router.replace('/auth/login')
    }
  }, [router])

  return (
    <div className="flex min-h-screen bg-transparent">
      <StaffSidebar />
      <main className="relative flex-1 overflow-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.28),transparent)]"
        />
        {children}
      </main>
    </div>
  )
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>
    </ToastProvider>
  )
}
