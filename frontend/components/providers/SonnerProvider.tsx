'use client'

import { Toaster } from 'sonner'

export function SonnerProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
      }}
    />
  )
}
