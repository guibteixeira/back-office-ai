'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'sonner'
import { CalendarDays, Check, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PROFESSION_LABELS } from '@/types'

const STEPS = ['Seu perfil', 'Link público', 'Serviços', 'Horários'] as const
type Step = 0 | 1 | 2 | 3

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

interface ProfileForm {
  name: string
  phone: string
  profession: string
}

interface SlugForm {
  slug: string
}

interface ServiceItem {
  name: string
  duration_minutes: string
  price_cents: string
  description: string
}

interface ServicesForm {
  services: ServiceItem[]
}

interface AvailabilityDay {
  day_of_week: number
  active: boolean
  start_time: string
  end_time: string
}

interface AvailabilityForm {
  days: AvailabilityDay[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [loading, setLoading] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [professionalId, setProfessionalId] = useState<string | null>(null)

  // Form 1 — Profile
  const profileForm = useForm<ProfileForm>()
  // Form 2 — Slug
  const slugForm = useForm<SlugForm>()
  // Form 3 — Services
  const servicesForm = useForm<ServicesForm>({
    defaultValues: {
      services: [{ name: '', duration_minutes: '50', price_cents: '', description: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({
    control: servicesForm.control,
    name: 'services',
  })
  // Form 4 — Availability
  const availabilityForm = useForm<AvailabilityForm>({
    defaultValues: {
      days: DAYS.map((d) => ({
        day_of_week: d.value,
        active: d.value >= 1 && d.value <= 5, // Mon-Fri default
        start_time: '08:00',
        end_time: '18:00',
      })),
    },
  })

  // Auto-generate slug from name
  useEffect(() => {
    const name = profileForm.watch('name')
    if (name && step === 1) {
      const generated = slugify(name)
      slugForm.setValue('slug', generated)
      checkSlug(generated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  let slugDebounce: ReturnType<typeof setTimeout>
  async function checkSlug(value: string) {
    clearTimeout(slugDebounce)
    if (!value || value.length < 2) return
    setSlugStatus('checking')
    slugDebounce = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('professionals')
        .select('id')
        .eq('slug', value)
        .maybeSingle()
      setSlugStatus(data ? 'taken' : 'available')
    }, 500)
  }

  async function saveProfile(data: ProfileForm) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: existing } = await supabase
      .from('professionals')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('professionals').update({
        name: data.name,
        phone: data.phone,
        profession: data.profession,
      }).eq('id', user.id)
      if (error) { toast.error('Erro ao salvar perfil.'); setLoading(false); return }
      setProfessionalId(user.id)
    } else {
      const { error } = await supabase.from('professionals').insert({
        id: user.id,
        name: data.name,
        email: user.email!,
        phone: data.phone,
        profession: data.profession,
        slug: `temp-${user.id.substring(0, 8)}`,
      })
      if (error) { toast.error('Erro ao salvar perfil.'); setLoading(false); return }
      setProfessionalId(user.id)
    }
    setLoading(false)
    setStep(1)
  }

  async function saveSlug(data: SlugForm) {
    if (slugStatus === 'taken') {
      toast.error('Este link já está em uso. Escolha outro.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('professionals').update({ slug: data.slug }).eq('id', user.id)
    if (error) { toast.error('Erro ao salvar link.'); setLoading(false); return }
    setLoading(false)
    setStep(2)
  }

  async function saveServices(data: ServicesForm) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = data.services.map((s) => ({
      professional_id: user.id,
      name: s.name,
      duration_minutes: parseInt(s.duration_minutes),
      price_cents: parseInt(s.price_cents.replace(/\D/g, '')) || 0,
      description: s.description || null,
    }))

    // Delete old drafts and re-insert
    await supabase.from('services').delete().eq('professional_id', user.id)
    const { error } = await supabase.from('services').insert(rows)
    if (error) {
      toast.error('Erro ao salvar serviços.')
      setLoading(false)
      return
    }
    setLoading(false)
    setStep(3)
  }

  async function saveAvailability(data: AvailabilityForm) {
    const activeDays = data.days.filter((d) => d.active)
    if (activeDays.length === 0) {
      toast.error('Selecione pelo menos 1 dia de atendimento.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = activeDays.map((d) => ({
      professional_id: user.id,
      day_of_week: d.day_of_week,
      start_time: d.start_time,
      end_time: d.end_time,
      active: true,
    }))

    await supabase.from('availability').delete().eq('professional_id', user.id)
    const { error } = await supabase.from('availability').insert(rows)
    if (error) {
      toast.error('Erro ao salvar horários.')
      setLoading(false)
      return
    }
    toast.success('Configuração concluída! 🎉')
    router.push('/dashboard/agenda')
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">AgendaPro</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    i < step
                      ? 'bg-secondary text-secondary-foreground'
                      : i === step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:block ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Profile */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
              <CardDescription>Como seus clientes vão te conhecer.</CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit(saveProfile)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input
                    placeholder="Dr. João Silva"
                    {...profileForm.register('name', { required: 'Nome obrigatório' })}
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Profissão *</Label>
                  <Select onValueChange={(v) => profileForm.setValue('profession', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione sua profissão" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROFESSION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    type="tel"
                    {...profileForm.register('phone', { required: 'Telefone obrigatório' })}
                  />
                  {profileForm.formState.errors.phone && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continuar
                </Button>
              </CardContent>
            </form>
          </Card>
        )}

        {/* Step 2 — Slug */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Seu link de agendamento</CardTitle>
              <CardDescription>
                Seus clientes vão acessar este link para agendar com você.
              </CardDescription>
            </CardHeader>
            <form onSubmit={slugForm.handleSubmit(saveSlug)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Link personalizado *</Label>
                  <div className="flex items-center gap-0">
                    <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                      agendapro.com.br/agendar/
                    </span>
                    <Input
                      className="rounded-l-none"
                      placeholder="seu-nome"
                      {...slugForm.register('slug', {
                        required: 'Link obrigatório',
                        pattern: { value: /^[a-z0-9-]+$/, message: 'Apenas letras minúsculas, números e hífens' },
                        minLength: { value: 3, message: 'Mínimo de 3 caracteres' },
                        onChange: (e) => checkSlug(e.target.value),
                      })}
                    />
                  </div>
                  {slugStatus === 'checking' && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidade...
                    </p>
                  )}
                  {slugStatus === 'available' && (
                    <p className="text-xs text-secondary flex items-center gap-1">
                      <Check className="h-3 w-3" /> Link disponível!
                    </p>
                  )}
                  {slugStatus === 'taken' && (
                    <p className="text-xs text-destructive">Este link já está em uso.</p>
                  )}
                  {slugForm.formState.errors.slug && (
                    <p className="text-xs text-destructive">{slugForm.formState.errors.slug.message}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading || slugStatus === 'taken'}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}

        {/* Step 3 — Services */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Seus serviços</CardTitle>
              <CardDescription>
                Cadastre os serviços que você oferece. Clientes escolherão na hora de agendar.
              </CardDescription>
            </CardHeader>
            <form onSubmit={servicesForm.handleSubmit(saveServices)}>
              <CardContent className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Serviço {index + 1}</span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do serviço *</Label>
                      <Input
                        placeholder="Ex: Consulta inicial"
                        {...servicesForm.register(`services.${index}.name`, { required: 'Nome obrigatório' })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Duração (min) *</Label>
                        <Input
                          type="number"
                          placeholder="50"
                          min={15}
                          step={5}
                          {...servicesForm.register(`services.${index}.duration_minutes`, { required: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input
                          placeholder="150,00"
                          {...servicesForm.register(`services.${index}.price_cents`, { required: 'Valor obrigatório' })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição (opcional)</Label>
                      <Input
                        placeholder="Breve descrição do serviço..."
                        {...servicesForm.register(`services.${index}.description`)}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    append({ name: '', duration_minutes: '50', price_cents: '', description: '' })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Adicionar serviço
                </Button>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}

        {/* Step 4 — Availability */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Horários de atendimento</CardTitle>
              <CardDescription>
                Defina em quais dias e horários você atende.
              </CardDescription>
            </CardHeader>
            <form onSubmit={availabilityForm.handleSubmit(saveAvailability)}>
              <CardContent className="space-y-4">
                {DAYS.map((day, index) => {
                  const isActive = availabilityForm.watch(`days.${index}.active`)
                  return (
                    <div key={day.value} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-32">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={isActive}
                          onCheckedChange={(checked) =>
                            availabilityForm.setValue(`days.${index}.active`, !!checked)
                          }
                        />
                        <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            className="w-full"
                            {...availabilityForm.register(`days.${index}.start_time`)}
                          />
                          <span className="text-sm text-muted-foreground">às</span>
                          <Input
                            type="time"
                            className="w-full"
                            {...availabilityForm.register(`days.${index}.end_time`)}
                          />
                        </div>
                      )}
                      {!isActive && (
                        <span className="text-sm text-muted-foreground">Não atende</span>
                      )}
                    </div>
                  )
                })}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Concluir configuração 🎉
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
