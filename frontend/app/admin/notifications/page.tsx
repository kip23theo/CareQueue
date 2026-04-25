'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { notificationsApi } from '@/lib/api-calls'
import { useToast } from '@/context/ToastContext'
import { cn, formatTime, formatTimeAgo } from '@/lib/utils'
import type { Notification, NotificationChannel } from '@/types'
import { Bell, MessageSquare, Phone, Smartphone, CheckCircle2, XCircle, RefreshCw, Send } from 'lucide-react'
import axios from 'axios'

const channelIcon: Record<NotificationChannel, React.ReactNode> = {
  sms: <Phone size={14} />,
  whatsapp: <MessageSquare size={14} />,
  push: <Smartphone size={14} />,
}

const channelColor: Record<NotificationChannel, string> = {
  sms: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  push: 'bg-purple-100 text-purple-700',
}

const CHANNEL_FILTERS: { value: 'all' | NotificationChannel; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
]

export default function AdminNotificationsPage() {
  const user = getUser()
  const { success, error: toastError } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | NotificationChannel>('all')
  const [resending, setResending] = useState<string | null>(null)

  const load = async () => {
    if (!user?.clinic_id) return
    setIsLoading(true)
    try {
      const { data } = await notificationsApi.getLog(user.clinic_id)
      setNotifications(data)
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.clinic_id])

  const handleResend = async (n: Notification) => {
    setResending(n._id)
    try {
      await notificationsApi.send(n.token_id, n.channel)
      success('Notification resent')
      load()
    } catch (err) {
      if (axios.isAxiosError(err)) toastError(err.response?.data?.detail ?? 'Resend failed')
    } finally {
      setResending(null)
    }
  }

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.channel === filter)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-surface-900">Notification Log</h1>
          <p className="text-surface-500 text-sm mt-0.5">{notifications.length} notifications sent</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Channel filter */}
      <div className="flex gap-2 mb-6">
        {CHANNEL_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
              filter === f.value
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No notifications</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-surface-100">
            {filtered.map((n) => (
              <div key={n._id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
                {/* Channel badge */}
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shrink-0',
                  channelColor[n.channel]
                )}>
                  {channelIcon[n.channel]}
                  {n.channel.toUpperCase()}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{n.patient_name}</p>
                  <p className="text-xs text-surface-400 truncate mt-0.5">{n.message}</p>
                </div>

                {/* Time */}
                <p className="text-xs text-surface-400 shrink-0 hidden sm:block">
                  {formatTimeAgo(n.sent_at)}
                </p>

                {/* Status */}
                <span className={cn(
                  'flex items-center gap-1 text-xs font-medium shrink-0',
                  n.status === 'sent' ? 'text-green-600' : 'text-red-500'
                )}>
                  {n.status === 'sent'
                    ? <CheckCircle2 size={13} />
                    : <XCircle size={13} />
                  }
                  {n.status}
                </span>

                {/* Resend */}
                <button
                  onClick={() => handleResend(n)}
                  disabled={resending === n._id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-surface-200 text-xs text-surface-600 hover:bg-surface-50 transition-colors disabled:opacity-40 shrink-0"
                >
                  <Send size={11} />
                  Resend
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
