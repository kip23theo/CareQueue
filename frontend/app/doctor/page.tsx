'use client'

import { useState, useEffect, useCallback } from 'react'
import { getUser } from '@/lib/auth'
import { doctorsApi, adminQueueApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn, formatTokenDisplay } from '@/lib/utils'
import type { DoctorQueue } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SSEStatusDot } from '@/components/ui/LiveDot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { connectSSE } from '@/lib/sse'
import axios from 'axios'
import {
  CheckCircle2, SkipForward, Siren, Stethoscope,
  PhoneCall, Clock, Users, Loader2,
  ToggleLeft, ToggleRight, AlertCircle
} from 'lucide-react'

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-surface-200">
      <span className="text-brand-500">{icon}</span>
      <div>
        <p className="text-xs text-surface-500">{label}</p>
        <p className="text-sm font-bold text-surface-900 font-heading">{value}</p>
      </div>
    </Card>
  )
}

export default function DoctorPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [queue, setQueue] = useState<DoctorQueue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [sseStatus, setSseStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected')
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [delayMins, setDelayMins] = useState(0)

  const fetchQueue = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await doctorsApi.getQueue(user.id)
      setQueue(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchQueue()
    })
    if (!user?.clinic_id) return
    const disconnect = connectSSE(
      user.clinic_id,
      (event) => { if (event.type === 'queue_updated') fetchQueue() },
      () => setSseStatus('connected'),
      () => setSseStatus('reconnecting')
    )
    return disconnect
  }, [fetchQueue, user?.clinic_id])

  const handleAction = async (fn: () => Promise<unknown>, msg: string) => {
    setActionLoading(true)
    try {
      await fn()
      success(msg)
      fetchQueue()
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCallNext = () =>
    handleAction(
      () => adminQueueApi.callNext(user!.clinic_id, user!.id),
      'Next patient called'
    )

  const handleComplete = (id: string) =>
    handleAction(() => adminQueueApi.completeConsultation(id), '✓ Consultation completed')

  const handleSkip = (id: string) =>
    handleAction(() => adminQueueApi.skip(id), 'Patient skipped')

  const handleEmergency = (id: string) =>
    handleAction(() => adminQueueApi.markEmergency(id), '🚨 Marked as emergency')

  const handleToggleAvailability = async () => {
    const next = !isAvailable
    setIsAvailable(next)
    try {
      await doctorsApi.updateAvailability(user!.id, { is_available: next })
      success(next ? 'You are now available' : 'You are now unavailable')
    } catch {
      setIsAvailable(!next)
    }
  }

  const handleSaveDelay = async () => {
    try {
      await doctorsApi.updateDelay(user!.id, { delay_mins: delayMins })
      success(`Delay updated to ${delayMins} minutes`)
      setShowDelayModal(false)
    } catch {
      toastError('Failed to update delay')
    }
  }

  const current = queue?.current
  const nextFive = queue?.next_five ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">
            Dr. {user?.name}
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">Your queue dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <SSEStatusDot status={sseStatus} showLabel />
          <Button
            onClick={() => setShowDelayModal(true)}
            variant="secondary"
            size="sm"
            className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors flex items-center gap-1.5"
          >
            <AlertCircle size={14} />
            Running late?
          </Button>
          <Button
            onClick={handleToggleAvailability}
            className={cn(
              'flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-sm transition-all',
              isAvailable
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-surface-200 text-surface-600 hover:bg-surface-300'
            )}
          >
            {isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {isAvailable ? 'Available' : 'Unavailable'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatPill icon={<CheckCircle2 size={16} />} label="Completed today" value={queue?.completed_today ?? 0} />
        <StatPill icon={<Users size={16} />} label="Waiting" value={queue?.waiting_count ?? 0} />
        <StatPill icon={<Clock size={16} />} label="Avg consultation" value="—" />
      </div>

      {/* Current patient */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Now Serving</p>
        {isLoading ? (
          <div className="skeleton rounded-2xl h-48" />
        ) : current ? (
          <Card className={cn(
            'rounded-2xl border-2 p-6 bg-white transition-all animate-fade-in',
            current.status === 'IN_CONSULTATION' ? 'border-brand-400 shadow-md shadow-brand-100' : 'border-surface-200'
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-4xl font-bold font-heading text-surface-900">
                  {current.token_display || formatTokenDisplay(current.token_number)}
                </p>
                <p className="text-xl font-semibold text-surface-800 mt-1">{current.patient_name}</p>
                <p className="text-sm text-surface-500 mt-1">
                  {current.patient_age} yrs • {current.patient_gender ?? 'N/A'}
                </p>
              </div>
              <StatusBadge status={current.status} size="lg" />
            </div>
            {current.symptoms && (
              <div className="px-4 py-3 rounded-xl bg-surface-50 text-sm text-surface-700 mb-4 italic">
                &ldquo;{current.symptoms}&rdquo;
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleComplete(current._id)}
                disabled={actionLoading}
                className="h-10 px-5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Complete
              </Button>
              <Button
                onClick={() => handleSkip(current._id)}
                disabled={actionLoading}
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                <SkipForward size={16} />
                Skip
              </Button>
              <Button
                onClick={() => handleEmergency(current._id)}
                disabled={actionLoading}
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <Siren size={16} />
                Emergency
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl border-2 border-dashed border-surface-300 p-8 text-center bg-white">
            <Stethoscope size={32} className="text-surface-300 mx-auto mb-3" />
            <p className="text-surface-600 font-medium mb-4">No patient currently being served</p>
            <Button
              onClick={handleCallNext}
              disabled={actionLoading || (queue?.waiting_count ?? 0) === 0}
              className="inline-flex h-11 items-center gap-2 px-6 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-sm shadow-brand-500/25"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <PhoneCall size={18} />}
              Call Next Patient
            </Button>
          </Card>
        )}
      </div>

      {/* Next 5 */}
      {nextFive.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Up Next</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nextFive.map((t, i) => (
              <div
                key={t._id}
                className="rounded-xl border border-surface-200 bg-white p-4 flex items-center gap-3 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-xs font-bold text-surface-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900 truncate">{t.patient_name}</p>
                  <p className="text-xs text-surface-500">{t.patient_age} yrs{t.symptoms ? ` • ${t.symptoms.slice(0, 20)}...` : ''}</p>
                </div>
                <span className="text-sm font-bold text-surface-700 font-heading">
                  {t.token_display || formatTokenDisplay(t.token_number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delay modal */}
      <Dialog open={showDelayModal} onOpenChange={setShowDelayModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold font-heading text-surface-900">Update delay</DialogTitle>
            <DialogDescription className="text-sm text-surface-500">
              How many minutes are you running late?
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min="0"
            max="60"
            value={delayMins}
            onChange={(e) => setDelayMins(Number(e.target.value))}
            className="h-14 rounded-xl border-surface-200 text-center text-2xl font-bold font-heading"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDelayModal(false)}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDelay}
              className="flex-1 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
