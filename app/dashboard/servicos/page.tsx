'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Loader2, Clock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Service } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface ServiceForm {
  name: string
  duration_minutes: string
  price_input: string
  description: string
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ServiceForm>()

  async function fetchServices() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', user.id)
      .order('created_at', { ascending: true })
    setServices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  function openCreate() {
    setEditing(null)
    reset()
    setShowForm(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setValue('name', s.name)
    setValue('duration_minutes', String(s.duration_minutes))
    setValue('price_input', (s.price_cents / 100).toFixed(2).replace('.', ','))
    setValue('description', s.description ?? '')
    setShowForm(true)
  }

  async function onSubmit(data: ServiceForm) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const price_cents = Math.round(parseFloat(data.price_input.replace(',', '.').replace(/[^\d.]/g, '')) * 100) || 0

    if (editing) {
      const { error } = await supabase
        .from('services')
        .update({
          name: data.name,
          duration_minutes: parseInt(data.duration_minutes),
          price_cents,
          description: data.description || null,
        })
        .eq('id', editing.id)
      if (error) toast.error('Erro ao salvar')
      else toast.success('Serviço atualizado!')
    } else {
      const { error } = await supabase.from('services').insert({
        professional_id: user.id,
        name: data.name,
        duration_minutes: parseInt(data.duration_minutes),
        price_cents,
        description: data.description || null,
      })
      if (error) toast.error('Erro ao criar serviço')
      else toast.success('Serviço criado!')
    }
    setShowForm(false)
    fetchServices()
    setSaving(false)
  }

  async function toggleActive(s: Service) {
    const supabase = createClient()
    await supabase.from('services').update({ active: !s.active }).eq('id', s.id)
    fetchServices()
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground text-sm">Gerencie os serviços que você oferece</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum serviço cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 rounded-lg border bg-white p-4 ${!s.active ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{s.name}</p>
                  {!s.active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground truncate">{s.description}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{formatCurrency(s.price_cents)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do serviço *</Label>
              <Input placeholder="Ex: Consulta inicial" {...register('name', { required: 'Nome obrigatório' })} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (minutos) *</Label>
                <Input type="number" min={15} step={5} placeholder="50" {...register('duration_minutes', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input placeholder="150,00" {...register('price_input', { required: 'Valor obrigatório' })} />
                {errors.price_input && <p className="text-xs text-destructive">{errors.price_input.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Descrição breve do serviço..." {...register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
