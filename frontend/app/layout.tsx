import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClinicFlow AI — Real-time Queue Management',
  description: 'Uber-style real-time clinic queue management. Join the queue, track your turn, and get AI-powered clinic recommendations.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
