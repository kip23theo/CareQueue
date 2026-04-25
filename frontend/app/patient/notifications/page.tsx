'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, MessageSquare, Phone, RefreshCw, Smartphone } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { notificationsApi } from '@/lib/api-calls'
import { usePatient } from '@/context/PatientContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, formatTimeAgo } from '@/lib/utils'
import type { Notification, NotificationChannel } from '@/types'

const channelIcon: Record<NotificationChannel, React.ReactNode> = {
  sms: <Phone size={13} />,
  whatsapp: <MessageSquare size={13} />,
  push: <Smartphone size={13} />,
}

const channelColor: Record<NotificationChannel, string> = {
  sms: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  push: 'bg-brand-100 text-brand-700',
}

export default function PatientNotificationsPage() {
  const user = getUser()
  const { myToken } = usePatient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (user?.role === 'patient' && user.id) {
        const { data } = await notificationsApi.getPatient(user.id)
        setNotifications(data)
      } else if (myToken?._id) {
        const { data } = await notificationsApi.getByToken(myToken._id)
        setNotifications(data)
      } else {
        setNotifications([])
      }
    } catch {
      setError('Unable to load notifications right now.')
    } finally {
      setIsLoading(false)
    }
  }, [user, myToken])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-heading text-surface-900">Notifications</h1>
          <p className="mt-1 text-xs text-surface-500">
            Queue calls, wait-time updates, and clinic alerts
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void load()}
          variant="outline"
          className="h-8 rounded-xl border-surface-200 px-3 text-xs text-surface-600"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((row) => (
            <div key={row} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100">
            <Bell size={28} className="text-surface-400" />
          </div>
          <p className="font-medium text-surface-600">No notifications yet</p>
          <p className="mt-1 text-sm text-surface-400">
            You will see queue alerts here when your status changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification._id} className="rounded-2xl border border-surface-200 bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-surface-900">
                    {notification.clinic_name || 'Clinic update'}
                  </p>
                  <p className="mt-0.5 text-xs text-surface-400">
                    {formatDate(notification.sent_at)} • {formatTimeAgo(notification.sent_at)}
                  </p>
                </div>
                <Badge className={cn('inline-flex items-center gap-1 rounded-lg border-transparent px-2 py-0.5 text-xs', channelColor[notification.channel])}>
                  {channelIcon[notification.channel]}
                  {notification.channel.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-surface-700">{notification.message}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
                <span>{notification.token_display ? `Token ${notification.token_display}` : 'Queue token update'}</span>
                <span className={notification.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                  {notification.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
