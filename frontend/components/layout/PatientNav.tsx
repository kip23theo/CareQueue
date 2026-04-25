'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { Activity, Bell, Compass, Home, LayoutDashboard, LogOut, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getUser, logout, subscribeAuth } from '@/lib/auth'

interface Props {
  myTokenId?: string
}

const quickLinks = [
  {
    href: '/patient',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/patient/clinics',
    label: 'Clinics',
    icon: Compass,
  },
  {
    href: '/patient/notifications',
    label: 'Alerts',
    icon: Bell,
  },
]

export function PatientNav({ myTokenId }: Props) {
  const pathname = usePathname()
  const user = useSyncExternalStore(subscribeAuth, getUser, () => null)

  const isPatient = user?.role === 'patient'

  return (
    <nav className="sticky top-0 z-40 border-b border-surface-200/90 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/patient" className="group inline-flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/25">
              <Activity size={15} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-heading text-base font-bold tracking-tight text-surface-900">
                CareQueue
              </span>
              <span className="hidden truncate text-xs text-surface-500 sm:block">Patient App</span>
            </span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 rounded-full border border-surface-200 bg-white/80 p-1 md:flex">
          {quickLinks.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                )}
              >
                <Icon size={13} />
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {myTokenId && (
            <Button
              asChild
              className="h-9 rounded-full bg-brand-500 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
            >
              <Link href={`/patient/token/${myTokenId}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                My Token
              </Link>
            </Button>
          )}

          {isPatient ? (
            <>
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full border-surface-300 px-2 text-xs font-semibold text-surface-700 sm:px-3"
              >
                <Link href="/patient/notifications">
                  <Bell size={14} />
                  <span className="hidden sm:inline">Alerts</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full border-surface-300 px-2 text-xs font-semibold text-surface-700 sm:px-3"
              >
                <Link href="/patient/feedback">
                  <Star size={14} />
                  <span className="hidden sm:inline">Rate Us</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="hidden h-9 rounded-full border-surface-300 px-3 text-xs font-semibold text-surface-700 sm:inline-flex"
              >
                <Link href="/patient/dashboard">
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
              </Button>

              <Button
                onClick={logout}
                variant="ghost"
                className="h-9 rounded-full px-2 text-xs text-surface-600 hover:bg-surface-100 hover:text-surface-900 sm:px-3"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" className="h-9 rounded-full border-surface-300 px-4 text-xs">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
