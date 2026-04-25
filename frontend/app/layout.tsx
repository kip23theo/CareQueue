import type { Metadata } from 'next'
import { DM_Sans, Inter } from 'next/font/google'
import { SonnerProvider } from '@/components/providers/SonnerProvider'
import AICopilotMount from '@/components/ai/AICopilotMount'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CareQueue AI — Real-time Queue Management',
  description: 'Uber-style real-time clinic queue management. Join the queue, track your turn, and get AI-powered clinic recommendations.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`min-h-full flex flex-col antialiased ${dmSans.variable} ${inter.variable}`}>{children}</body>
    </html>
  )
}
