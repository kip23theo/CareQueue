'use client'

import { PatientProvider } from '@/context/PatientContext'
import { ToastProvider } from '@/context/ToastContext'
import { PatientNav } from '@/components/layout/PatientNav'
import { usePatient } from '@/context/PatientContext'

function NavWrapper() {
  const { myToken } = usePatient()
  return <PatientNav myTokenId={myToken?._id} />
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PatientProvider>
        <div className="min-h-screen flex flex-col bg-surface-50">
          <NavWrapper />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </PatientProvider>
    </ToastProvider>
  )
}
