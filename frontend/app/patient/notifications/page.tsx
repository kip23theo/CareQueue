'use client'

import { Bell, MessageCircle, CheckCircle, XCircle } from 'lucide-react'

export default function PatientNotificationsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold font-heading text-surface-900 mb-6">Notifications</h1>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Bell size={28} className="text-surface-400" />
        </div>
        <p className="text-surface-600 font-medium">No notifications yet</p>
        <p className="text-surface-400 text-sm mt-1">You'll see alerts here when you're called</p>
      </div>
    </div>
  )
}
