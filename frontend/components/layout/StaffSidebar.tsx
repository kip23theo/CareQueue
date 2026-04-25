'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getUser, logout, subscribeAuth, type AuthUser } from '@/lib/auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SSEStatusDot } from '@/components/ui/LiveDot'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard, Users, BarChart3, Bell,
  Settings, ClipboardList, Stethoscope,
  UserCog, LogOut, ChevronRight, Star, Wallet, FolderOpen
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/queue', label: 'Live Queue', icon: <ClipboardList size={18} /> },
  { href: '/admin/payments', label: 'Payments', icon: <Wallet size={18} /> },
  { href: '/admin/doctors', label: 'Doctors', icon: <Stethoscope size={18} /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { href: '/admin/reviews', label: 'Reviews', icon: <Star size={18} /> },
  { href: '/admin/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { href: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
]

const doctorNav: NavItem[] = [
  { href: '/doctor', label: 'My Queue', icon: <ClipboardList size={18} /> },
  { href: '/doctor/payments', label: 'Payments', icon: <Wallet size={18} /> },
  { href: '/doctor/records', label: 'Consulted Records', icon: <FolderOpen size={18} /> },
  { href: '/doctor/reviews', label: 'Reviews', icon: <Star size={18} /> },
  { href: '/doctor/settings', label: 'Settings', icon: <Settings size={18} /> },
]

const receptionistNav: NavItem[] = [
  { href: '/receptionist', label: 'Queue Board', icon: <ClipboardList size={18} /> },
  { href: '/receptionist/add', label: 'Add Walk-in', icon: <Users size={18} /> },
  { href: '/receptionist/payments', label: 'Payments', icon: <Wallet size={18} /> },
  { href: '/receptionist/search', label: 'Search Patient', icon: <UserCog size={18} /> },
  { href: '/receptionist/reviews', label: 'Reviews', icon: <Star size={18} /> },
]

const superAdminNav: NavItem[] = [
  { href: '/super-admin', label: 'Home', icon: <LayoutDashboard size={18} /> },
  { href: '/super-admin/feedback', label: 'Platform Feedback', icon: <Star size={18} /> },
]

const navMap = {
  super_admin: superAdminNav,
  admin: adminNav,
  doctor: doctorNav,
  receptionist: receptionistNav,
  patient: [],
}

const roleColors = {
  super_admin: 'bg-amber-100 text-amber-700',
  admin: 'bg-cyan-100 text-cyan-700',
  doctor: 'bg-brand-100 text-brand-700',
  receptionist: 'bg-blue-100 text-blue-700',
  patient: 'bg-surface-100 text-surface-700',
}

interface Props {
  sseStatus?: 'connected' | 'reconnecting' | 'disconnected'
}

export function StaffSidebar({ sseStatus = 'disconnected' }: Props) {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const syncUser = () => {
      setUser(getUser())
    }
    syncUser()
    return subscribeAuth(syncUser)
  }, [])

  if (!user) {
    return <aside aria-hidden="true" className="w-64 min-h-screen shrink-0 bg-surface-900/90" />
  }

  const navItems = navMap[user.role] ?? []

  return (
    <aside className="relative flex w-64 min-h-screen shrink-0 flex-col overflow-hidden border-r border-surface-200 bg-[linear-gradient(200deg,#f3f8fc_0%,#e9f2f9_56%,#e5eef7_100%)] text-surface-800">
      <div aria-hidden className="pointer-events-none absolute -right-12 top-20 h-48 w-48 rounded-full bg-cyan-200/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-16 bottom-16 h-52 w-52 rounded-full bg-blue-200/20 blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 border-b border-surface-200 px-5 py-5">
        <h1 className="text-lg font-bold font-heading tracking-tight text-surface-900">CareQueue AI</h1>
        <p className="mt-0.5 text-xs text-surface-500">Queue Management</p>
      </div>

      {/* User info */}
      <div className="relative z-10 border-b border-surface-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,#22d3ee,#0e7490)] text-sm font-bold text-white">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-surface-900 truncate">{user.name}</p>
            <Badge className={cn('border-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em]', roleColors[user.role])}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isRoleRoot = item.href === '/admin' || item.href === '/doctor' || item.href === '/receptionist' || item.href === '/super-admin'
          const isActive = pathname === item.href || (!isRoleRoot && pathname.startsWith(item.href))
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                'h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[linear-gradient(140deg,#0b8ba8,#0f6f86)] text-white'
                  : 'text-surface-600 hover:bg-white/80 hover:text-surface-900'
              )}
            >
              <Link href={item.href}>
                {item.icon}
                {item.label}
                {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* SSE status + logout */}
      <div className="relative z-10 space-y-3 border-t border-surface-200 px-5 py-4">
        {user.role !== 'super_admin' && (
          <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white/80 px-3 py-2 text-xs text-surface-600">
            <SSEStatusDot status={sseStatus} showLabel />
          </div>
        )}
        <Button
          onClick={logout}
          variant="ghost"
          className="h-auto justify-start gap-2 rounded-xl px-2 py-2 text-sm text-surface-600 hover:bg-white/90 hover:text-surface-900"
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
