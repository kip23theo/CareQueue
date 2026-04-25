'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Users, XCircle, RefreshCw, Building2 } from 'lucide-react'

import { superAdminApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import type { SuperAdminClinic, SuperAdminOverview, SuperAdminUser } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-surface-500">{label}</p>
        <div className="text-brand-600">{icon}</div>
      </div>
      <p className="text-2xl font-bold font-heading text-surface-900">{value}</p>
    </Card>
  )
}

const STATUS_FILTERS: Array<'all' | 'pending' | 'approved' | 'rejected'> = [
  'all',
  'pending',
  'approved',
  'rejected',
]

export default function SuperAdminPage() {
  const { success, error } = useToast()
  const currentUser = getUser()

  const [overview, setOverview] = useState<SuperAdminOverview | null>(null)
  const [clinics, setClinics] = useState<SuperAdminClinic[]>([])
  const [users, setUsers] = useState<SuperAdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingClinicId, setUpdatingClinicId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [userSearch, setUserSearch] = useState('')

  const load = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [overviewRes, clinicsRes, usersRes] = await Promise.all([
        superAdminApi.getOverview(),
        superAdminApi.getClinics(statusFilter === 'all' ? undefined : statusFilter),
        superAdminApi.getUsers(),
      ])
      setOverview(overviewRes.data)
      setClinics(clinicsRes.data)
      setUsers(usersRes.data)
    } catch {
      error('Failed to load super admin data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [error, statusFilter])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const verifyClinic = async (clinic: SuperAdminClinic, status: 'approved' | 'rejected') => {
    setUpdatingClinicId(clinic.id)
    try {
      const reason = status === 'rejected'
        ? window.prompt('Reason for rejection (optional):') ?? undefined
        : undefined

      await superAdminApi.verifyClinic(clinic.id, {
        status,
        reason,
        verified_by_user_id: currentUser?.id,
      })
      success(`Clinic ${status === 'approved' ? 'approved' : 'rejected'}`)
      await load()
    } catch {
      error('Failed to update clinic verification')
    } finally {
      setUpdatingClinicId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const query = userSearch.toLowerCase()
    return users.filter((user) =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.clinic_name || '').toLowerCase().includes(query)
    )
  }, [userSearch, users])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Super Admin Panel</h1>
          <p className="text-sm text-surface-500 mt-1">Monitor all clinics, verification status, and platform users.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isRefreshing} className="rounded-xl">
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Clinics" value={overview?.clinics.total ?? 0} icon={<Building2 size={16} />} />
        <StatCard label="Pending Clinics" value={overview?.clinics.pending ?? 0} icon={<Clock3 size={16} />} />
        <StatCard label="Approved Clinics" value={overview?.clinics.approved ?? 0} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Total Users" value={overview?.users.total ?? 0} icon={<Users size={16} />} />
      </div>

      <Card className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold font-heading text-surface-900">Clinics</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={statusFilter === item ? 'default' : 'outline'}
                onClick={() => setStatusFilter(item)}
                className="rounded-xl capitalize"
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((idx) => <div key={idx} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : clinics.length === 0 ? (
          <p className="text-sm text-surface-500 py-6 text-center">No clinics found for this filter.</p>
        ) : (
          <div className="space-y-3">
            {clinics.map((clinic) => {
              const isPending = clinic.verification_status === 'pending'
              const isUpdating = updatingClinicId === clinic.id

              return (
                <div key={clinic.id} className="rounded-xl border border-surface-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-surface-900">{clinic.name}</p>
                      <p className="text-sm text-surface-500">{clinic.address}</p>
                      <p className="text-xs text-surface-400 mt-1">{clinic.admin?.email || 'No admin email'} • {clinic.user_count} users</p>
                      {(clinic.latitude !== null && clinic.longitude !== null) && (
                        <p className="text-xs text-surface-400">Lat: {clinic.latitude}, Lng: {clinic.longitude}</p>
                      )}
                      {clinic.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">Reason: {clinic.rejection_reason}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        clinic.verification_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : clinic.verification_status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {clinic.verification_status}
                      </span>

                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
                            disabled={isUpdating}
                            onClick={() => void verifyClinic(clinic, 'approved')}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                            disabled={isUpdating}
                            onClick={() => void verifyClinic(clinic, 'rejected')}
                          >
                            <XCircle size={14} /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold font-heading text-surface-900">Users</h2>
          <Input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users by name, email, or clinic"
            className="w-full sm:w-72"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((idx) => <div key={idx} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-surface-500 py-6 text-center">No users found.</p>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-xl border border-surface-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-surface-900">{user.name}</p>
                  <p className="text-xs text-surface-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-600 capitalize">{user.role.replace('_', ' ')}</p>
                  <p className="text-xs text-surface-400">{user.clinic_name || 'Platform user'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
