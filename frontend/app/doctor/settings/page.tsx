'use client'

import { useState } from 'react'
import { getUser } from '@/lib/auth'
import { doctorsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { ToggleLeft, ToggleRight, Clock, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DoctorSettingsPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [isAvailable, setIsAvailable] = useState(true)
  const [delayMins, setDelayMins] = useState(0)
  const [isSavingAvail, setIsSavingAvail] = useState(false)
  const [isSavingDelay, setIsSavingDelay] = useState(false)

  const handleSaveAvailability = async () => {
    if (!user) return
    setIsSavingAvail(true)
    try {
      await doctorsApi.updateAvailability(user.id, { is_available: isAvailable })
      success('Availability updated')
    } catch {
      toastError('Failed to update availability')
    } finally {
      setIsSavingAvail(false)
    }
  }

  const handleSaveDelay = async () => {
    if (!user) return
    setIsSavingDelay(true)
    try {
      await doctorsApi.updateDelay(user.id, { delay_mins: delayMins })
      success(`Delay set to ${delayMins} minutes`)
    } catch {
      toastError('Failed to update delay')
    } finally {
      setIsSavingDelay(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold font-heading text-surface-900 mb-6">Settings</h1>

      {/* Availability */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-surface-900 font-heading mb-1">Availability</h2>
        <p className="text-sm text-surface-500 mb-4">Control whether you're accepting patients right now</p>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-surface-700">I am available to see patients</span>
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all',
              isAvailable ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-600'
            )}
          >
            {isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {isAvailable ? 'Available' : 'Unavailable'}
          </button>
        </div>
        <button
          onClick={handleSaveAvailability}
          disabled={isSavingAvail}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {isSavingAvail ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Delay */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-surface-900 font-heading mb-1">Running Late</h2>
        <p className="text-sm text-surface-500 mb-4">Add extra buffer to patient wait time estimates</p>
        <div className="flex items-center gap-3 mb-4">
          <Clock size={18} className="text-brand-500 shrink-0" />
          <span className="text-sm text-surface-700">I'm running late by</span>
          <input
            type="number"
            min="0"
            max="60"
            value={delayMins}
            onChange={(e) => setDelayMins(Number(e.target.value))}
            className="w-20 px-3 py-1.5 rounded-xl border border-surface-200 text-center font-bold focus:outline-none focus:border-brand-400"
          />
          <span className="text-sm text-surface-700">minutes</span>
        </div>
        <button
          onClick={handleSaveDelay}
          disabled={isSavingDelay}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {isSavingDelay ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Today's stats */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
        <h2 className="font-semibold text-surface-900 font-heading mb-4">Today's Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Patients seen', value: '—' },
            { label: 'Avg consultation', value: '— min' },
            { label: 'Waiting now', value: '—' },
            { label: 'Total today', value: '—' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-surface-50">
              <p className="text-xs text-surface-500">{s.label}</p>
              <p className="text-xl font-bold font-heading text-surface-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
