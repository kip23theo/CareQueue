import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/65 focus-visible:ring-offset-1',
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,#0d8ca8,#0f6f86)] text-primary-foreground hover:brightness-105 active:translate-y-[1px]',
        destructive:
          'bg-[linear-gradient(135deg,#dc2626,#b91c1c)] text-destructive-foreground hover:brightness-105 active:translate-y-[1px]',
        outline:
          'border border-input bg-white/75 text-surface-700 hover:border-brand-300 hover:bg-white',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-surface-200/70',
        ghost: 'text-surface-600 hover:bg-white/65 hover:text-surface-900',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-xl px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
