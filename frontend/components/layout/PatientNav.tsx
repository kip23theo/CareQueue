'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { ArrowLeft, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getUser, logout, subscribeAuth } from '@/lib/auth'

interface Props {
  myTokenId?: string
}

export function PatientNav({ myTokenId }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useSyncExternalStore(
    subscribeAuth,
    getUser,
    () => null
  )

  const isPatient = user?.role === 'patient'

  const isDeep = pathname !== '/patient' && pathname !== '/patient/clinics'
  const showBack = isDeep

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: back or logo */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-sm text-surface-600 hover:text-surface-900"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
          ) : (
            <Link href="/patient" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
                <Activity size={14} className="text-white" />
              </div>
              <span className="font-bold text-surface-900 font-heading text-sm">CareQueue</span>
            </Link>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {myTokenId && (
            <Button
              asChild
              className={cn(
                'h-8 rounded-full text-xs font-semibold',
                'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
              )}
            >
              <Link href={`/patient/token/${myTokenId}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                My Token
              </Link>
            </Button>
          )}

          {isPatient ? (
            <>
              <Button asChild variant="outline" className="h-8 rounded-full text-xs border-surface-200">
                <Link href="/patient/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={logout} variant="ghost" className="h-8 rounded-full text-xs px-3 text-surface-600">
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" className="h-8 rounded-full text-xs border-surface-200">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
