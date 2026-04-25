'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Props {
  myTokenId?: string
}

export function PatientNav({ myTokenId }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const isDeep = pathname !== '/patient' && pathname !== '/patient/clinics'
  const showBack = isDeep

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: back or logo */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-sm text-surface-600 hover:text-surface-900"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
          ) : (
            <Link href="/patient" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
                <Activity size={14} className="text-white" />
              </div>
              <span className="font-bold text-surface-900 font-heading text-sm">CareQueue</span>
            </Link>
          )}
        </div>

        {/* Right: My Token shortcut */}
        {myTokenId && (
          <Button
            asChild
            className={cn(
              'h-8 rounded-full text-xs font-semibold',
              'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
            )}
          >
            <Link href={`/patient/token/${myTokenId}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              My Token
            </Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
