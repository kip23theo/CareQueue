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
        <div className="relative min-h-screen flex flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_26%),radial-gradient(circle_at_92%_8%,rgba(37,99,235,0.1),transparent_30%)]"
          />
          <NavWrapper />
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </PatientProvider>
    </ToastProvider>
  )
}
