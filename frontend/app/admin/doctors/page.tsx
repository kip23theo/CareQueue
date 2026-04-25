'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { doctorsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import type { Doctor } from '@/types'
import axios from 'axios'
import { Stethoscope, CheckCircle2, Clock, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

export default function AdminDoctorsPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [delayEditing, setDelayEditing] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user?.clinic_id) return
    doctorsApi.getAll(user.clinic_id)
      .then(({ data }) => setDoctors(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [user?.clinic_id])

  const handleToggleAvailability = async (doc: Doctor) => {
    setUpdatingId(doc._id)
    try {
      await doctorsApi.updateAvailability(doc._id, { is_available: !doc.is_available })
      setDoctors((prev) =>
        prev.map((d) => d._id === doc._id ? { ...d, is_available: !d.is_available } : d)
      )
      success(`Dr. ${doc.name} marked as ${doc.is_available ? 'unavailable' : 'available'}`)
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSaveDelay = async (doc: Doctor) => {
    const delay = delayEditing[doc._id] ?? doc.delay_mins
    setUpdatingId(doc._id)
    try {
      await doctorsApi.updateDelay(doc._id, { delay_mins: delay })
      setDoctors((prev) =>
        prev.map((d) => d._id === doc._id ? { ...d, delay_mins: delay } : d)
      )
      success(`Dr. ${doc.name} delay updated`)
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-surface-900">Doctors</h1>
        <p className="text-surface-500 text-sm mt-0.5">Manage availability and delays</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16">
          <Stethoscope size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No doctors found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {doctors.map((doc) => {
            const currentDelay = delayEditing[doc._id] ?? doc.delay_mins
            const isUpdating = updatingId === doc._id
            return (
              <div key={doc._id} className={cn(
                'bg-white rounded-2xl border border-surface-200 p-5 shadow-sm transition-all',
                doc.is_available ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-surface-300'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0',
                      doc.is_available ? 'bg-brand-500' : 'bg-surface-400'
                    )}>
                      {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-surface-900 font-heading">Dr. {doc.name}</p>
                      <p className="text-sm text-surface-500">{doc.specialization}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-surface-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-green-500" />
                          {doc.completed_today} today
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-brand-500" />
                          {doc.avg_consult_mins} min avg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Availability toggle */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAvailability(doc)}
                      disabled={isUpdating}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                        doc.is_available
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-surface-200 text-surface-600 hover:bg-surface-300',
                        'disabled:opacity-50'
                      )}
                    >
                      {isUpdating
                        ? <Loader2 size={12} className="animate-spin" />
                        : doc.is_available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />
                      }
                      {doc.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                </div>

                {/* Delay row */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-100">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <span className="text-sm text-surface-600">Running late by</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={currentDelay}
                    onChange={(e) =>
                      setDelayEditing((prev) => ({ ...prev, [doc._id]: Number(e.target.value) }))
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-surface-200 text-center text-sm font-bold focus:outline-none focus:border-brand-400"
                  />
                  <span className="text-sm text-surface-600">min</span>
                  {delayEditing[doc._id] !== undefined && delayEditing[doc._id] !== doc.delay_mins && (
                    <button
                      onClick={() => handleSaveDelay(doc)}
                      disabled={isUpdating}
                      className="ml-auto px-3 py-1 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
