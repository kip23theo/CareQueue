'use client'

import { useState } from 'react'
import { getUser } from '@/lib/auth'
import { doctorsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { ToggleLeft, ToggleRight, Clock, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

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
      <Card className="bg-white rounded-2xl border border-surface-200 p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-surface-900 font-heading mb-1">Availability</h2>
        <p className="text-sm text-surface-500 mb-4">Control whether you're accepting patients right now</p>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-surface-700">I am available to see patients</span>
          <div className="flex items-center gap-2">
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            <span className="text-sm font-semibold text-surface-700">{isAvailable ? 'Available' : 'Unavailable'}</span>
          </div>
        </div>
        <Button
          onClick={handleSaveAvailability}
          disabled={isSavingAvail}
          className="h-10 px-4 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          <Save size={14} />
          {isSavingAvail ? 'Saving...' : 'Save'}
        </Button>
      </Card>

      {/* Delay */}
      <Card className="bg-white rounded-2xl border border-surface-200 p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-surface-900 font-heading mb-1">Running Late</h2>
        <p className="text-sm text-surface-500 mb-4">Add extra buffer to patient wait time estimates</p>
        <div className="flex items-center gap-3 mb-4">
          <Clock size={18} className="text-brand-500 shrink-0" />
          <span className="text-sm text-surface-700">I'm running late by</span>
          <Input
            type="number"
            min="0"
            max="60"
            value={delayMins}
            onChange={(e) => setDelayMins(Number(e.target.value))}
            className="h-9 w-20 rounded-xl border-surface-200 px-3 text-center font-bold"
          />
          <span className="text-sm text-surface-700">minutes</span>
        </div>
        <Button
          onClick={handleSaveDelay}
          disabled={isSavingDelay}
          className="h-10 px-4 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          <Save size={14} />
          {isSavingDelay ? 'Saving...' : 'Save'}
        </Button>
      </Card>

      {/* Today's stats */}
      <Card className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
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
      </Card>
    </div>
  )
}
