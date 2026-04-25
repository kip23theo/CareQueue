'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQueue } from '@/context/QueueContext'
import { clinicAdminApi, doctorsApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ClinicAnalytics, Doctor } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Users, Clock, CheckCircle2, UserX,
  ArrowRight, ToggleLeft, ToggleRight, TrendingUp, Wallet
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

interface DoctorReport {
  doctorId: string
  doctorName: string
  totalTokens: number
  completedCount: number
  paidCount: number
  pendingPayments: number
  collected: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function AdminDashboard() {
  const user = getUser()
  const { queue } = useQueue()
  const [analytics, setAnalytics] = useState<ClinicAnalytics | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (!user?.clinic_id) return
    clinicAdminApi.getAnalytics(user.clinic_id)
      .then(({ data }) => setAnalytics(data))
      .catch(() => {})
  }, [user?.clinic_id])

  useEffect(() => {
    if (!user?.clinic_id) return
    setIsDoctorsLoading(true)
    doctorsApi.getAll(user.clinic_id)
      .then(({ data }) => setDoctors(data))
      .catch(() => setDoctors([]))
      .finally(() => setIsDoctorsLoading(false))
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

  const doctorReports = useMemo<DoctorReport[]>(() => {
    const reports = new Map<string, DoctorReport>()

    for (const doctor of doctors) {
      reports.set(doctor._id, {
        doctorId: doctor._id,
        doctorName: doctor.name,
        totalTokens: 0,
        completedCount: 0,
        paidCount: 0,
        pendingPayments: 0,
        collected: 0,
      })
    }

    for (const token of queue?.tokens ?? []) {
      const doctorId = token.doctor_id || 'unassigned'
      const existing = reports.get(doctorId) ?? {
        doctorId,
        doctorName: 'Unknown doctor',
        totalTokens: 0,
        completedCount: 0,
        paidCount: 0,
        pendingPayments: 0,
        collected: 0,
      }

      existing.totalTokens += 1
      if (token.status === 'COMPLETED') {
        existing.completedCount += 1
        if ((token.payment_amount ?? 0) > 0) {
          existing.paidCount += 1
        } else {
          existing.pendingPayments += 1
        }
      }
      existing.collected += token.payment_amount ?? 0

      reports.set(doctorId, existing)
    }

    return Array.from(reports.values()).sort((a, b) => {
      if (b.collected !== a.collected) return b.collected - a.collected
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount
      return a.doctorName.localeCompare(b.doctorName)
    })
  }, [doctors, queue?.tokens])

  const totalCollectedToday = useMemo(
    () => doctorReports.reduce((sum, doctor) => sum + doctor.collected, 0),
    [doctorReports]
  )
  const totalPaidEntries = useMemo(
    () => doctorReports.reduce((sum, doctor) => sum + doctor.paidCount, 0),
    [doctorReports]
  )
  const totalPendingEntries = useMemo(
    () => doctorReports.reduce((sum, doctor) => sum + doctor.pendingPayments, 0),
    [doctorReports]
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-0.5">Today&apos;s clinic overview</p>
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

      <Card className="bg-white rounded-2xl border border-surface-200 p-5 mb-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h2 className="font-semibold font-heading text-surface-900">Doctor Reports (Today)</h2>
            <p className="text-xs text-surface-500">
              Per-doctor payment collection and completed consultation payment status.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 rounded-lg w-fit">
            <Link href="/admin/payments">
              Open Payment Entry
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Card className="rounded-xl border border-surface-200 bg-surface-50 p-3">
            <p className="text-xs uppercase tracking-wider text-surface-500">Collected today</p>
            <p className="text-xl font-bold font-heading text-surface-900 mt-1">
              {formatCurrency(totalCollectedToday)}
            </p>
          </Card>
          <Card className="rounded-xl border border-surface-200 bg-surface-50 p-3">
            <p className="text-xs uppercase tracking-wider text-surface-500">Payments entered</p>
            <p className="text-xl font-bold font-heading text-surface-900 mt-1">{totalPaidEntries}</p>
          </Card>
          <Card className="rounded-xl border border-surface-200 bg-surface-50 p-3">
            <p className="text-xs uppercase tracking-wider text-surface-500">Pending payments</p>
            <p className="text-xl font-bold font-heading text-surface-900 mt-1">{totalPendingEntries}</p>
          </Card>
        </div>

        {isDoctorsLoading && doctorReports.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-20 rounded-xl skeleton" />
            ))}
          </div>
        ) : doctorReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-300 px-4 py-8 text-center">
            <p className="text-sm text-surface-500">No doctor report data for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {doctorReports.map((doctor) => (
              <div
                key={doctor.doctorId}
                className="rounded-xl border border-surface-200 bg-white p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold font-heading text-surface-900">
                    {doctor.doctorId === 'unassigned' ? doctor.doctorName : `Dr. ${doctor.doctorName}`}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {doctor.completedCount} completed of {doctor.totalTokens} total tokens
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-surface-500">Collected</p>
                    <p className="text-sm font-semibold text-surface-900">{formatCurrency(doctor.collected)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-surface-500">Paid</p>
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                      <Wallet size={12} />
                      {doctor.paidCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-surface-500">Pending</p>
                    <p className="text-sm font-semibold text-amber-700">{doctor.pendingPayments}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: '/admin/queue', label: 'Manage Live Queue', desc: `${queue?.waiting.length ?? 0} patients waiting` },
          { href: '/admin/doctors', label: 'View Doctors', desc: 'Manage availability & delays' },
          { href: '/admin/payments', label: 'Daily Collections', desc: 'Enter and review payment entries' },
          { href: '/admin/analytics', label: 'Analytics', desc: 'Performance metrics & trends' },
          { href: '/admin/reviews', label: 'Patient Reviews', desc: 'Doctor and clinic star ratings' },
          { href: '/admin/settings', label: 'Clinic Settings', desc: 'Profile & opening hours' },
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
