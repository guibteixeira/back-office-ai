'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Appointment, APPOINTMENT_STATUS_LABELS } from '@/types'
import { formatDate, formatTime, formatCurrency, toSaoPauloDateString } from '@/lib/utils'

const TZ = 'America/Sao_Paulo'

function getWeekDays(date: Date): Date[] {
  const spDate = new Date(date.toLocaleString('en-US', { timeZone: TZ }))
  const dow = spDate.getDay()
  const monday = new Date(spDate)
  monday.setDate(spDate.getDate() - dow + 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STATUS_VARIANT: Record<string, 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'> = {
  pending: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'no_show',
}

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const todayStr = toSaoPauloDateString(new Date())
  const currentStr = toSaoPauloDateString(currentDate)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      let from: string, to: string
      if (viewMode === 'day') {
        from = `${currentStr}T00:00:00-03:00`
        to = `${currentStr}T23:59:59-03:00`
      } else {
        const week = getWeekDays(currentDate)
        from = `${toSaoPauloDateString(week[0])}T00:00:00-03:00`
        to = `${toSaoPauloDateString(week[6])}T23:59:59-03:00`
      }
      const res = await fetch(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      const data = await res.json()
      setAppointments(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [viewMode, currentStr])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (viewMode === 'day') d.setDate(d.getDate() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  async function updateStatus(id: string, status: string) {
    setActionLoading(true)
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(`Agendamento ${APPOINTMENT_STATUS_LABELS[status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? status}`)
      setSelectedAppt(null)
      fetchAppointments()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erro ao atualizar status')
    }
    setActionLoading(false)
  }

  // Group appointments by date
  const byDate: Record<string, Appointment[]> = {}
  for (const a of appointments) {
    const dateStr = toSaoPauloDateString(new Date(a.scheduled_at))
    if (!byDate[dateStr]) byDate[dateStr] = []
    byDate[dateStr].push(a)
  }

  const weekDays = viewMode === 'week' ? getWeekDays(currentDate) : [currentDate]

  // Today's summary
  const todayAppts = byDate[todayStr] ?? []
  const todayRevenue = todayAppts.reduce((sum, a) => {
    if (a.services && 'price_cents' in (a.services as object)) {
      return sum + ((a.services as { price_cents: number }).price_cents ?? 0)
    }
    return sum
  }, 0)

  const nextAppt = todayAppts
    .filter((a) => new Date(a.scheduled_at) > new Date() && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  function minutesUntil(iso: string) {
    return Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header + Day Summary */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: TZ })}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3">
          <div className="rounded-lg border bg-white p-3 text-center min-w-[90px]">
            <p className="text-2xl font-bold text-primary">{todayAppts.filter(a => a.status !== 'cancelled').length}</p>
            <p className="text-xs text-muted-foreground">hoje</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center min-w-[90px]">
            <p className="text-sm font-semibold text-secondary">{formatCurrency(todayRevenue)}</p>
            <p className="text-xs text-muted-foreground">previsto</p>
          </div>
          {nextAppt && (
            <div className="rounded-lg border bg-white p-3 text-center min-w-[90px]">
              <p className="text-sm font-semibold">{minutesUntil(nextAppt.scheduled_at)}min</p>
              <p className="text-xs text-muted-foreground">próximo</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border rounded-md p-1 bg-white">
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
            className="h-7"
          >
            Dia
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
            className="h-7"
          >
            Semana
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="icon" className="h-8 w-8 ml-auto" onClick={fetchAppointments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar view */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className={`grid gap-4 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
          {weekDays.map((day) => {
            const dateStr = toSaoPauloDateString(day)
            const dayAppts = byDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const dow = day.getDay()

            return (
              <div key={dateStr} className="min-w-0">
                {/* Day header */}
                <div className={`mb-2 rounded-md px-2 py-1.5 text-center ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-xs font-medium">{DAY_SHORT[dow]}</p>
                  <p className="text-lg font-bold leading-none">{day.getDate()}</p>
                </div>

                {/* Appointments */}
                <div className="space-y-1.5">
                  {dayAppts.length === 0 && viewMode === 'day' && (
                    <p className="text-center text-sm text-muted-foreground py-10">
                      Nenhum agendamento para hoje.
                    </p>
                  )}
                  {dayAppts.map((appt) => {
                    const client = appt.clients as { name: string } | null
                    const service = appt.services as { name: string } | null
                    return (
                      <button
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={`w-full text-left rounded-md border p-2 text-xs hover:shadow-sm transition-shadow ${
                          appt.status === 'cancelled' ? 'opacity-50 bg-gray-50' : 'bg-white'
                        }`}
                      >
                        <p className="font-semibold truncate">{formatTime(appt.scheduled_at)}</p>
                        <p className="truncate text-muted-foreground">{client?.name ?? '—'}</p>
                        {viewMode === 'day' && (
                          <p className="truncate text-muted-foreground">{service?.name}</p>
                        )}
                        <Badge variant={STATUS_VARIANT[appt.status] ?? 'outline'} className="mt-1">
                          {APPOINTMENT_STATUS_LABELS[appt.status as keyof typeof APPOINTMENT_STATUS_LABELS]}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <Dialog open onOpenChange={() => setSelectedAppt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do agendamento</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-medium">{(selectedAppt.clients as { name: string } | null)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Serviço</p>
                  <p className="font-medium">{(selectedAppt.services as { name: string } | null)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p className="font-medium">{formatDate(selectedAppt.scheduled_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Horário</p>
                  <p className="font-medium">{formatTime(selectedAppt.scheduled_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor</p>
                  <p className="font-medium">
                    {formatCurrency((selectedAppt.services as { price_cents: number } | null)?.price_cents ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={STATUS_VARIANT[selectedAppt.status] ?? 'outline'}>
                    {APPOINTMENT_STATUS_LABELS[selectedAppt.status as keyof typeof APPOINTMENT_STATUS_LABELS]}
                  </Badge>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedAppt.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => updateStatus(selectedAppt.id, 'confirmed')}
                  disabled={actionLoading}
                  className="gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirmar
                </Button>
              )}
              {(selectedAppt.status === 'pending' || selectedAppt.status === 'confirmed') && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateStatus(selectedAppt.id, 'completed')}
                    disabled={actionLoading}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Concluído
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(selectedAppt.id, 'no_show')}
                    disabled={actionLoading}
                    className="gap-1"
                  >
                    <UserX className="h-4 w-4" /> Não compareceu
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus(selectedAppt.id, 'cancelled')}
                    disabled={actionLoading}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" /> Cancelar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
