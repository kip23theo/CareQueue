'use client'

import Link from 'next/link'
import { MessageSquareHeart } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface Props {
  href: string
}

export function TopRightFeedbackButton({ href }: Props) {
  return (
    <div className="fixed top-4 right-4 z-30">
      <Button
        asChild
        size="sm"
        variant="outline"
        className="h-9 rounded-full border-surface-300 bg-white/95 text-surface-700 shadow-sm backdrop-blur"
      >
        <Link href={href}>
          <MessageSquareHeart size={14} />
          Rate Us
        </Link>
      </Button>
    </div>
  )
}
