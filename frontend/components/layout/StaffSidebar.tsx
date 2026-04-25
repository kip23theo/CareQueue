'use client'

import { cn } from '@/lib/utils'
import { getUser, logout } from '@/lib/auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SSEStatusDot } from '@/components/ui/LiveDot'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard, Users, BarChart3, Bell,
  Settings, ClipboardList, Stethoscope,
  UserCog, LogOut, ChevronRight
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/queue', label: 'Live Queue', icon: <ClipboardList size={18} /> },
  { href: '/admin/doctors', label: 'Doctors', icon: <Stethoscope size={18} /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { href: '/admin/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { href: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
]

const doctorNav: NavItem[] = [
  { href: '/doctor', label: 'My Queue', icon: <ClipboardList size={18} /> },
  { href: '/doctor/settings', label: 'Settings', icon: <Settings size={18} /> },
]

const receptionistNav: NavItem[] = [
  { href: '/receptionist', label: 'Queue Board', icon: <ClipboardList size={18} /> },
  { href: '/receptionist/add', label: 'Add Walk-in', icon: <Users size={18} /> },
  { href: '/receptionist/search', label: 'Search Patient', icon: <UserCog size={18} /> },
]

const navMap = { admin: adminNav, doctor: doctorNav, receptionist: receptionistNav }

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  doctor: 'bg-brand-100 text-brand-700',
  receptionist: 'bg-blue-100 text-blue-700',
}

interface Props {
  sseStatus?: 'connected' | 'reconnecting' | 'disconnected'
}

export function StaffSidebar({ sseStatus = 'disconnected' }: Props) {
  const pathname = usePathname()
  const user = getUser()
  if (!user) return null

  const navItems = navMap[user.role] ?? []

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-surface-900 text-white shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-lg font-bold font-heading text-white tracking-tight">CareQueue AI</h1>
        <p className="text-xs text-white/40 mt-0.5">Queue Management</p>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <Badge className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium border-transparent', roleColors[user.role])}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/doctor' && item.href !== '/receptionist' && pathname.startsWith(item.href))
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 h-auto rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
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
      <div className="px-5 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <SSEStatusDot status={sseStatus} showLabel />
        </div>
        <Button
          onClick={logout}
          variant="ghost"
          className="h-auto px-0 justify-start gap-2 text-sm text-white/50 hover:text-white hover:bg-transparent"
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
