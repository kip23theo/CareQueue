'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { showErrorToast, toast } from '@/lib/toast'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ToastContextValue>(
    () => ({
      toast: (message, type = 'info') => {
        if (type === 'success') toast.success(message)
        else if (type === 'error') showErrorToast(message)
        else if (type === 'warning') toast.warning(message)
        else toast.info(message)
      },
      success: (message) => toast.success(message),
      error: (message) => showErrorToast(message),
      warning: (message) => toast.warning(message),
      info: (message) => toast.info(message),
    }),
    []
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
