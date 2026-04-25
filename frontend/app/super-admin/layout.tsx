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
    <div className="flex min-h-screen bg-surface-100">
      <StaffSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
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
