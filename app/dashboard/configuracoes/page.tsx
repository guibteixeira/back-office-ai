'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { PROFESSION_LABELS } from '@/types'

const DAYS = [
  { label: 'Domingo', value: 0 },
  { label: 'Segunda-feira', value: 1 },
  { label: 'Terça-feira', value: 2 },
  { label: 'Quarta-feira', value: 3 },
  { label: 'Quinta-feira', value: 4 },
  { label: 'Sexta-feira', value: 5 },
  { label: 'Sábado', value: 6 },
]

interface ProfileForm {
  name: string
  phone: string
  profession: string
}

interface AvailabilityDay {
  day_of_week: number
  active: boolean
  start_time: string
  end_time: string
  id?: string
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAvail, setSavingAvail] = useState(false)
  const [profession, setProfession] = useState<string>('')
  const [avail, setAvail] = useState<AvailabilityDay[]>(
    DAYS.map((d) => ({ day_of_week: d.value, active: false, start_time: '08:00', end_time: '18:00' }))
  )

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileForm>()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profResult, availResult] = await Promise.all([
        supabase.from('professionals').select('*').eq('id', user.id).single(),
        supabase.from('availability').select('*').eq('professional_id', user.id),
      ])

      if (profResult.data) {
        setValue('name', profResult.data.name)
        setValue('phone', profResult.data.phone ?? '')
        setProfession(profResult.data.profession ?? '')
      }

      if (availResult.data) {
        const merged = DAYS.map((d) => {
          const existing = availResult.data.find((a) => a.day_of_week === d.value)
          if (existing) {
            return {
              day_of_week: d.value,
              active: existing.active,
              start_time: existing.start_time,
              end_time: existing.end_time,
              id: existing.id,
            }
          }
          return { day_of_week: d.value, active: false, start_time: '08:00', end_time: '18:00' }
        })
        setAvail(merged)
      }
      setLoading(false)
    }
    load()
  }, [setValue])

  async function saveProfile(data: ProfileForm) {
    setSavingProfile(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('professionals')
      .update({ name: data.name, phone: data.phone, profession })
      .eq('id', user.id)
    if (error) toast.error('Erro ao salvar perfil')
    else toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  async function saveAvailability() {
    const activeDays = avail.filter((d) => d.active)
    if (activeDays.length === 0) {
      toast.error('Selecione pelo menos 1 dia de atendimento.')
      return
    }
    setSavingAvail(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('availability').delete().eq('professional_id', user.id)
    const rows = activeDays.map((d) => ({
      professional_id: user.id,
      day_of_week: d.day_of_week,
      start_time: d.start_time,
      end_time: d.end_time,
      active: true,
    }))
    const { error } = await supabase.from('availability').insert(rows)
    if (error) toast.error('Erro ao salvar horários')
    else toast.success('Horários atualizados!')
    setSavingAvail(false)
  }

  function updateAvailDay(index: number, field: keyof AvailabilityDay, value: unknown) {
    setAvail((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie seu perfil e disponibilidade</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Profissão</Label>
              <Select value={profession} onValueChange={setProfession}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROFESSION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input placeholder="(11) 99999-9999" {...register('phone')} />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar perfil
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horários de atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day, index) => {
            const dayData = avail[index]
            return (
              <div key={day.value} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-40">
                  <Checkbox
                    id={`cfg-day-${day.value}`}
                    checked={dayData.active}
                    onCheckedChange={(v) => updateAvailDay(index, 'active', !!v)}
                  />
                  <Label htmlFor={`cfg-day-${day.value}`} className="cursor-pointer text-sm">
                    {day.label}
                  </Label>
                </div>
                {dayData.active ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayData.start_time}
                      onChange={(e) => updateAvailDay(index, 'start_time', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={dayData.end_time}
                      onChange={(e) => updateAvailDay(index, 'end_time', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Não atende</span>
                )}
              </div>
            )
          })}
          <Button onClick={saveAvailability} disabled={savingAvail} className="mt-2">
            {savingAvail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar horários
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
