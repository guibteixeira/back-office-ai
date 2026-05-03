'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { CalendarDays, Clock, DollarSign, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Service, Professional, TimeSlot } from '@/types'
import { formatCurrency, formatDate, formatTime, toSaoPauloDateString } from '@/lib/utils'
import { PROFESSION_LABELS, Profession } from '@/types'

interface ClientForm {
  name: string
  phone: string
  email: string
}

type Step = 'service' | 'date' | 'time' | 'form' | 'confirm' | 'done'

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [professional, setProfessional] = useState<Professional | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookedApptId, setBookedApptId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ClientForm>()

  // Load professional and services
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/booking/${slug}`)
      if (!res.ok) { setNotFound(true); setPageLoading(false); return }
      const data = await res.json()
      setProfessional(data.professional)
      setServices(data.services)
      setPageLoading(false)
    }
    load()
  }, [slug])

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService || !professional) return
    const dateStr = toSaoPauloDateString(selectedDate)
    setSlotsLoading(true)
    fetch(`/api/availability/slots?professional_id=${professional.id}&service_id=${selectedService.id}&date=${dateStr}`)
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots ?? []); setSlotsLoading(false) })
      .catch(() => setSlotsLoading(false))
  }, [selectedDate, selectedService, professional])

  async function onSubmit(formData: ClientForm) {
    if (!selectedSlot || !selectedService || !professional) return
    setSubmitting(true)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professional_id: professional.id,
        service_id: selectedService.id,
        scheduled_at: selectedSlot.start,
        ends_at: selectedSlot.end,
        client_name: formData.name,
        client_phone: formData.phone,
        client_email: formData.email,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setBookedApptId(data.appointment?.id)
      setStep('done')
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erro ao criar agendamento. Tente novamente.')
    }
    setSubmitting(false)
  }

  // Disable past dates and dates without availability
  function isDateDisabled(date: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true
    return false
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (notFound || !professional) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <CalendarDays className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Profissional não encontrado</h1>
        <p className="text-muted-foreground">O link de agendamento que você acessou não existe.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {professional.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{professional.name}</p>
            <p className="text-xs text-muted-foreground">
              {PROFESSION_LABELS[professional.profession as Profession] ?? professional.profession}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── STEP: Select service ── */}
        {step === 'service' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Escolha o serviço</h2>
            {services.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum serviço disponível no momento.
              </p>
            ) : (
              services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep('date') }}
                  className="w-full text-left rounded-lg border bg-white p-4 hover:border-primary hover:shadow-sm transition-all"
                >
                  <p className="font-semibold">{s.name}</p>
                  {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_minutes} min</span>
                    <span className="flex items-center gap-1 text-secondary font-medium">
                      <DollarSign className="h-3.5 w-3.5" />{formatCurrency(s.price_cents)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── STEP: Select date ── */}
        {step === 'date' && selectedService && (
          <div className="space-y-4">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setStep('service'); setSelectedDate(undefined) }}
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
            <h2 className="text-lg font-bold">Escolha a data</h2>
            <div className="bg-white rounded-lg border p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date)
                  setSelectedSlot(null)
                  if (date) setStep('time')
                }}
                disabled={isDateDisabled}
                fromDate={new Date()}
              />
            </div>
          </div>
        )}

        {/* ── STEP: Select time slot ── */}
        {step === 'time' && selectedDate && selectedService && (
          <div className="space-y-4">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setStep('date'); setSelectedSlot(null) }}
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
            <h2 className="text-lg font-bold">Horários disponíveis</h2>
            <p className="text-sm text-muted-foreground">{formatDate(selectedDate.toISOString())}</p>

            {slotsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum horário disponível nesta data.</p>
                <Button variant="outline" className="mt-4" onClick={() => setStep('date')}>
                  Escolher outro dia
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    onClick={() => { setSelectedSlot(slot); setStep('form') }}
                    className="rounded-md border bg-white py-2.5 text-center text-sm font-medium hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP: Client form ── */}
        {step === 'form' && selectedSlot && selectedService && (
          <div className="space-y-5">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setStep('time')}
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>

            {/* Booking summary */}
            <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
              <p className="font-semibold text-base">Resumo</p>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">{selectedService.name}</span></p>
                <p>📅 {formatDate(selectedSlot.start)} às {formatTime(selectedSlot.start)}</p>
                <p>⏱ {selectedService.duration_minutes} minutos</p>
                <p className="text-secondary font-semibold text-base">{formatCurrency(selectedService.price_cents)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <h2 className="text-lg font-bold">Seus dados</h2>
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input placeholder="Como devo te chamar?" {...register('name', { required: 'Nome obrigatório' })} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <Input placeholder="(11) 99999-9999" type="tel" {...register('phone', { required: 'Telefone obrigatório' })} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                <p className="text-xs text-muted-foreground">Você receberá a confirmação e lembretes por aqui.</p>
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input placeholder="seu@email.com" type="email" {...register('email')} />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar agendamento'}
              </Button>
            </form>
          </div>
        )}

        {/* ── STEP: Done ── */}
        {step === 'done' && selectedSlot && selectedService && (
          <div className="flex flex-col items-center text-center gap-6 py-8">
            <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Agendamento confirmado!</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Você receberá uma confirmação no WhatsApp em instantes.
              </p>
            </div>

            <div className="w-full rounded-lg border bg-white p-4 text-sm space-y-2 text-left">
              <p className="font-semibold">{selectedService.name}</p>
              <p className="text-muted-foreground">📅 {formatDate(selectedSlot.start)} às {formatTime(selectedSlot.start)}</p>
              <p className="text-muted-foreground">👤 {professional.name}</p>
              <p className="text-secondary font-semibold">{formatCurrency(selectedService.price_cents)}</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const start = new Date(selectedSlot.start)
                const end = new Date(selectedSlot.end)
                const gcUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedService.name + ' - ' + professional.name)}&dates=${start.toISOString().replace(/[-:]/g, '').replace('.000', '')}/${end.toISOString().replace(/[-:]/g, '').replace('.000', '')}`
                window.open(gcUrl, '_blank')
              }}
            >
              📅 Adicionar ao Google Calendar
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep('service')
                setSelectedService(null)
                setSelectedDate(undefined)
                setSelectedSlot(null)
              }}
            >
              Fazer outro agendamento
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
