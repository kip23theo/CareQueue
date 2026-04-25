'use client'

import { useMemo, useState } from 'react'
import axios from 'axios'
import { adminQueueApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { cn, formatTokenDisplay } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'
import type { QueueToken } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, CreditCard, Search, Wallet } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
] as const

interface Props {
  title: string
  description: string
  completedTokens: QueueToken[]
  isLoading?: boolean
  onRefresh: () => Promise<void> | void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function PaymentEntryBoard({
  title,
  description,
  completedTokens,
  isLoading = false,
  onRefresh,
}: Props) {
  const user = getUser()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<QueueToken | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]['value']>('cash')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const sortedTokens = useMemo(() => {
    return [...completedTokens].sort((a, b) => {
      const at = new Date(a.consult_end ?? a.joined_at).getTime()
      const bt = new Date(b.consult_end ?? b.joined_at).getTime()
      return bt - at
    })
  }, [completedTokens])

  const filteredTokens = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sortedTokens
    return sortedTokens.filter((token) => {
      const display = token.token_display || formatTokenDisplay(token.token_number)
      return (
        token.patient_name.toLowerCase().includes(query) ||
        token.patient_phone.toLowerCase().includes(query) ||
        display.toLowerCase().includes(query)
      )
    })
  }, [search, sortedTokens])

  const paidCount = sortedTokens.filter((token) => (token.payment_amount ?? 0) > 0).length

  const openEntry = (token: QueueToken) => {
    setSelected(token)
    setAmount(token.payment_amount ? String(token.payment_amount) : '')
    setMethod((token.payment_method as (typeof PAYMENT_METHODS)[number]['value']) || 'cash')
    setNotes(token.payment_notes ?? '')
  }

  const closeEntry = () => {
    setSelected(null)
    setAmount('')
    setMethod('cash')
    setNotes('')
  }

  const handleSave = async () => {
    if (!selected) return
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toastError('Enter a valid amount')
      return
    }

    setIsSaving(true)
    try {
      await adminQueueApi.recordPayment(selected._id, {
        amount: parsedAmount,
        method,
        notes: notes.trim() || undefined,
        entered_by_role: user?.role,
        entered_by_name: user?.name,
      })
      success('Payment saved')
      closeEntry()
      await onRefresh()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Failed to save payment')
      } else {
        toastError('Failed to save payment')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-surface-900">{title}</h1>
        <p className="text-surface-500 text-sm mt-0.5">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-surface-500">Completed</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{sortedTokens.length}</p>
        </Card>
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-surface-500">Payments Entered</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{paidCount}</p>
        </Card>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by patient, token, phone..."
          className="h-10 rounded-xl border-surface-200 bg-white pl-9 pr-4 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((value) => (
            <div key={value} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filteredTokens.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-surface-300 p-10 text-center bg-white">
          <Wallet size={30} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No completed consultations found</p>
          <p className="text-surface-400 text-sm mt-1">Completed tokens will appear here for payment entry.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTokens.map((token) => {
            const display = token.token_display || formatTokenDisplay(token.token_number)
            const hasPayment = (token.payment_amount ?? 0) > 0
            return (
              <Card
                key={token._id}
                className={cn(
                  'rounded-2xl border p-4 bg-white',
                  hasPayment ? 'border-emerald-200' : 'border-surface-200'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-surface-500 font-medium">{display}</p>
                    <p className="text-lg font-semibold text-surface-900">{token.patient_name}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{token.patient_phone}</p>
                    {token.consult_end && (
                      <p className="text-xs text-surface-400 mt-1">
                        Consulted on {new Date(token.consult_end).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {hasPayment ? (
                      <div className="mb-2">
                        <p className="text-emerald-700 text-sm font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 size={14} />
                          Paid
                        </p>
                        <p className="text-base font-bold text-surface-900">
                          {formatCurrency(token.payment_amount ?? 0)}
                        </p>
                        <p className="text-xs text-surface-500 uppercase">
                          {token.payment_method}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700 mb-2">Payment pending</p>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openEntry(token)}
                      className={cn(
                        'h-8 rounded-lg px-3',
                        hasPayment
                          ? 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                          : 'bg-brand-500 text-white hover:bg-brand-600'
                      )}
                    >
                      <CreditCard size={14} />
                      {hasPayment ? 'Edit' : 'Enter'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeEntry()}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Payment Entry</DialogTitle>
            <DialogDescription>
              Save payment for {selected?.patient_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-surface-600">Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
                className="mt-1 h-10 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-surface-600">Method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as (typeof PAYMENT_METHODS)[number]['value'])}>
                <SelectTrigger className="mt-1 h-10 rounded-xl">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((paymentMethod) => (
                    <SelectItem key={paymentMethod.value} value={paymentMethod.value}>
                      {paymentMethod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-surface-600">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Add remarks..."
                className="mt-1 rounded-xl resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeEntry} className="rounded-xl">
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving} className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white">
                {isSaving ? 'Saving...' : 'Save Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
