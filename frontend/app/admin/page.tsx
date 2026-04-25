'use client'

import { useState, useEffect } from 'react'
import { useQueue } from '@/context/QueueContext'
import { clinicAdminApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ClinicAnalytics } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import {
  Users, Clock, CheckCircle2, UserX,
  ArrowRight, ToggleLeft, ToggleRight, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; color: string
}) {
  return (
    <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <p className="text-3xl font-bold font-heading text-surface-900">{value}</p>
      <p className="text-sm text-surface-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

export default function AdminDashboard() {
  const user = getUser()
  const { queue, isLoading } = useQueue()
  const { success, error: toastError } = useToast()
  const [analytics, setAnalytics] = useState<ClinicAnalytics | null>(null)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (!user?.clinic_id) return
    clinicAdminApi.getAnalytics(user.clinic_id)
      .then(({ data }) => setAnalytics(data))
      .catch(() => {})
  }, [user?.clinic_id])

  // Build hourly chart data from analytics
  const hourlyData = analytics?.throughput_per_hour?.map((count, h) => ({
    hour: `${h}:00`,
    patients: count,
  })).filter((d) => d.patients > 0) ?? []

  const stats = [
    {
      label: 'Total patients today',
      value: analytics?.total_patients ?? queue?.completed_count ?? '—',
      icon: <Users size={18} className="text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: 'Avg wait time',
      value: analytics ? `${Math.round(analytics.avg_wait_mins)} min` : '—',
      icon: <Clock size={18} className="text-amber-600" />,
      color: 'bg-amber-50',
    },
    {
      label: 'Completed',
      value: analytics?.completed ?? queue?.completed_count ?? '—',
      icon: <CheckCircle2 size={18} className="text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: 'No-shows',
      value: analytics?.no_shows ?? queue?.no_show_count ?? '—',
      icon: <UserX size={18} className="text-orange-600" />,
      color: 'bg-orange-50',
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-0.5">Today's clinic overview</p>
        </div>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-sm transition-all',
            isOpen ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'
          )}
        >
          {isOpen ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          Clinic {isOpen ? 'Open' : 'Closed'}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts */}
      {hourlyData.length > 0 && (
        <Card className="bg-white rounded-2xl border border-surface-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold font-heading text-surface-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" />
            Hourly Throughput
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="patients" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: '/admin/queue', label: 'Manage Live Queue', desc: `${queue?.waiting.length ?? 0} patients waiting`, color: 'bg-brand-500' },
          { href: '/admin/doctors', label: 'View Doctors', desc: 'Manage availability & delays', color: 'bg-blue-500' },
          { href: '/admin/analytics', label: 'Analytics', desc: 'Performance metrics & trends', color: 'bg-purple-500' },
          { href: '/admin/settings', label: 'Clinic Settings', desc: 'Profile & opening hours', color: 'bg-surface-700' },
        ].map((item) => (
          <Button
            key={item.href}
            asChild
            variant="outline"
            className="h-auto bg-white rounded-2xl border border-surface-200 p-5 flex items-center justify-between hover:shadow-md hover:border-brand-200 transition-all group shadow-sm"
          >
            <Link href={item.href}>
              <div className="text-left">
                <p className="font-semibold text-surface-900 font-heading">{item.label}</p>
                <p className="text-sm text-surface-500 mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight size={18} className="text-surface-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
