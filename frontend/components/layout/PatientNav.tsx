'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Activity, Bell, ChevronDown, Compass, Home, LayoutDashboard, LogOut, Star } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
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
]

export function PatientNav({ myTokenId }: Props) {
  const pathname = usePathname()
  const user = useSyncExternalStore(subscribeAuth, getUser, () => null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const isPatient = user?.role === 'patient'

  useEffect(() => {
    if (!isMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

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
                size="icon"
                className="h-9 w-9 rounded-full border-surface-300 text-surface-700"
              >
                <Link href="/patient/notifications" aria-label="Alerts">
                  <Bell size={14} />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-surface-300 text-surface-700"
              >
                <Link href="/patient/feedback" aria-label="Rate Us">
                  <Star size={14} />
                </Link>
              </Button>

              <div className="relative" ref={profileMenuRef}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-surface-300 px-2.5 text-surface-700 hover:bg-surface-100"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    {getInitials(user?.name ?? 'P')}
                  </span>
                  <span className="hidden text-xs font-semibold sm:inline">{user?.name?.split(' ')[0] ?? 'Profile'}</span>
                  <ChevronDown size={14} className={cn('transition-transform', isMenuOpen && 'rotate-180')} />
                </Button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-2xl border border-surface-200 bg-white p-1.5 shadow-lg">
                    <div className="px-3 py-2 border-b border-surface-100">
                      <p className="text-xs font-semibold text-surface-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-surface-500 truncate">{user?.email}</p>
                    </div>

                    <Link
                      href="/patient/dashboard"
                      className="mt-1 inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-surface-700 hover:bg-surface-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>

                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
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
