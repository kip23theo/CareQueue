'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { clinicAdminApi } from '@/lib/api-calls'
import type { ClinicAnalytics } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import { BarChart3, Calendar, TrendingUp, Loader2 } from 'lucide-react'

const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#94a3b8']

export default function AdminAnalyticsPage() {
  const user = getUser()
  const [analytics, setAnalytics] = useState<ClinicAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (!user?.clinic_id) return
    setIsLoading(true)
    clinicAdminApi.getAnalytics(user.clinic_id, selectedDate)
      .then(({ data }) => setAnalytics(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [user?.clinic_id, selectedDate])

  const hourlyData = analytics?.throughput_per_hour?.map((count, h) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    patients: count,
  })) ?? []

  const pieData = analytics
    ? [
        { name: 'Completed', value: analytics.completed },
        { name: 'Cancelled', value: analytics.cancelled },
        { name: 'No Shows', value: analytics.no_shows },
      ].filter((d) => d.value > 0)
    : []

  const statCards = analytics
    ? [
        { label: 'Total Patients', value: analytics.total_patients },
        { label: 'Completed', value: analytics.completed },
        { label: 'Avg Wait', value: `${Math.round(analytics.avg_wait_mins)} min` },
        { label: 'Avg Consult', value: `${Math.round(analytics.avg_consult_mins)} min` },
        { label: 'No Shows', value: analytics.no_shows },
        { label: 'Peak Hour', value: analytics.peak_hour || '—' },
      ]
    : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Analytics</h1>
          <p className="text-surface-500 text-sm mt-0.5">Queue performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-surface-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="h-10 w-40 rounded-xl border-surface-200 text-sm bg-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      ) : !analytics ? (
        <div className="text-center py-16">
          <BarChart3 size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No analytics data for this date</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <Card key={s.label} className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
                <p className="text-xs text-surface-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold font-heading text-surface-900">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Hourly throughput */}
          <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
            <h2 className="font-semibold font-heading text-surface-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-500" />
              Hourly Patient Throughput
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="patients" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <Card className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
              <h2 className="font-semibold font-heading text-surface-900 mb-4">Status Distribution</h2>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" paddingAngle={3}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d, idx) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                      <span className="text-sm text-surface-600">{d.name}</span>
                      <span className="text-sm font-bold text-surface-900 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
