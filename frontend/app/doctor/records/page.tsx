'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { doctorsApi } from '@/lib/api-calls'
import { getUser } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import { cn, formatTokenDisplay } from '@/lib/utils'
import type { ConsultedPatientRecord } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, FolderOpen, Search, UserRound } from 'lucide-react'

const LOOKUP_LABELS: Record<ConsultedPatientRecord['patient_lookup'], string> = {
  linked_token: 'Direct match',
  phone_match: 'Phone match',
  not_found: 'No patient account',
}

export default function DoctorConsultedRecordsPage() {
  const user = getUser()
  const { error: toastError } = useToast()

  const [records, setRecords] = useState<ConsultedPatientRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const refresh = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data } = await doctorsApi.getConsultedPatients(user.id, 100)
      setRecords(data.consulted_patients)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toastError(err.response?.data?.detail ?? 'Failed to load consulted records')
      } else {
        toastError('Failed to load consulted records')
      }
    } finally {
      setIsLoading(false)
    }
  }, [toastError, user?.id])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
  }, [refresh])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) => {
      const tokenDisplay = record.token.token_display || formatTokenDisplay(record.token.token_number)
      return (
        record.token.patient_name.toLowerCase().includes(query) ||
        record.token.patient_phone.toLowerCase().includes(query) ||
        tokenDisplay.toLowerCase().includes(query)
      )
    })
  }, [records, search])

  const linkedCount = records.filter((record) => record.patient_lookup !== 'not_found').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-surface-900">Consulted Patient Records</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          View medical history and documents for your consulted patients.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-surface-500">Consulted Patients</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{records.length}</p>
        </Card>
        <Card className="rounded-2xl border border-surface-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-surface-500">Matched Patient Accounts</p>
          <p className="text-2xl font-bold font-heading text-surface-900 mt-1">{linkedCount}</p>
        </Card>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by patient, phone, token..."
          className="h-10 rounded-xl border-surface-200 bg-white pl-9 pr-4 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((value) => (
            <div key={value} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 text-center">
          <UserRound size={30} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No consulted patient records found</p>
          <p className="text-surface-400 text-sm mt-1">Completed consultations appear here after visit completion.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const token = record.token
            const tokenDisplay = token.token_display || formatTokenDisplay(token.token_number)
            const isOpen = expanded[token._id] ?? false
            return (
              <Card key={token._id} className="rounded-2xl border border-surface-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-surface-500 font-medium">{tokenDisplay}</p>
                    <p className="text-lg font-semibold text-surface-900">{token.patient_name}</p>
                    <p className="text-sm text-surface-500">{token.patient_phone}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      {token.consult_end
                        ? `Consulted on ${new Date(token.consult_end).toLocaleString()}`
                        : 'Consultation completed'}
                    </p>
                    {record.patient && (
                      <p className="text-xs text-surface-500 mt-1">
                        Linked account: {record.patient.name} ({record.patient.email})
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <Badge className={cn(
                      'mb-2 border-transparent',
                      record.patient_lookup === 'not_found'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {LOOKUP_LABELS[record.patient_lookup]}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg"
                      onClick={() => setExpanded((value) => ({ ...value, [token._id]: !isOpen }))}
                    >
                      {isOpen ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-surface-100 grid gap-4 md:grid-cols-2 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-semibold text-surface-900 mb-2 flex items-center gap-1.5">
                        <FolderOpen size={14} className="text-brand-500" />
                        Medical History ({record.medical_history.length})
                      </h3>
                      {record.medical_history.length === 0 ? (
                        <p className="text-sm text-surface-500">No history entries found.</p>
                      ) : (
                        <div className="space-y-2">
                          {record.medical_history.map((entry) => (
                            <div key={entry.id} className="rounded-xl bg-surface-50 border border-surface-100 p-3">
                              <p className="text-sm font-semibold text-surface-900">{entry.title}</p>
                              <p className="text-xs text-surface-500 mt-0.5">
                                {new Date(entry.visit_date).toLocaleDateString()}
                              </p>
                              {entry.diagnosis && (
                                <p className="text-sm text-surface-700 mt-1">{entry.diagnosis}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-surface-900 mb-2 flex items-center gap-1.5">
                        <FileText size={14} className="text-brand-500" />
                        Documents ({record.documents.length})
                      </h3>
                      {record.documents.length === 0 ? (
                        <p className="text-sm text-surface-500">No document entries found.</p>
                      ) : (
                        <div className="space-y-2">
                          {record.documents.map((document) => (
                            <a
                              key={document.id}
                              href={document.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl bg-surface-50 border border-surface-100 p-3 hover:border-brand-200 transition-colors"
                            >
                              <p className="text-sm font-semibold text-surface-900">{document.title}</p>
                              <p className="text-xs text-surface-500 mt-0.5 uppercase">{document.document_type}</p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
