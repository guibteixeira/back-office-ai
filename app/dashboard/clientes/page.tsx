'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Phone, Mail, ChevronRight, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Client, Appointment, APPOINTMENT_STATUS_LABELS } from '@/types'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'

interface ClientForm {
  name: string
  phone: string
  email: string
  notes: string
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<{
    client: Client
    appointments: (Appointment & { services: { name: string; price_cents: number } | null })[]
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>()

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const url = search ? `/api/clients?search=${encodeURIComponent(search)}` : '/api/clients'
    const res = await fetch(url)
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchClients, 300)
    return () => clearTimeout(t)
  }, [fetchClients])

  async function openClientDetail(client: Client) {
    setDetailLoading(true)
    setSelectedClient({ client, appointments: [] })
    const res = await fetch(`/api/clients/${client.id}`)
    const data = await res.json()
    setSelectedClient({ client: data.client, appointments: data.appointments ?? [] })
    setDetailLoading(false)
  }

  async function addClient(data: ClientForm) {
    setAddLoading(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Cliente adicionado!')
      setShowAdd(false)
      reset()
      fetchClients()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erro ao adicionar cliente')
    }
    setAddLoading(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clients.length} clientes cadastrados</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-white overflow-hidden">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => openClientDetail(c)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-sm text-muted-foreground truncate">{c.phone}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Add client dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(addClient)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" {...register('name', { required: 'Nome obrigatório' })} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input placeholder="(11) 99999-9999" {...register('phone', { required: 'Telefone obrigatório' })} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input placeholder="email@exemplo.com" type="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Informações importantes sobre o cliente..." {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client detail dialog */}
      {selectedClient && (
        <Dialog open onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedClient.client.name}</DialogTitle>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="space-y-4">
                {/* Contact info */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient.client.phone}</span>
                  </div>
                  {selectedClient.client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{selectedClient.client.email}</span>
                    </div>
                  )}
                </div>

                {selectedClient.client.notes && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p>{selectedClient.client.notes}</p>
                  </div>
                )}

                {/* Appointment history */}
                <div>
                  <p className="text-sm font-semibold mb-2">
                    Histórico ({selectedClient.appointments.length} atendimentos)
                  </p>
                  {selectedClient.appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum atendimento ainda.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedClient.appointments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm rounded-md border p-2">
                          <div>
                            <p className="font-medium">{formatDate(a.scheduled_at)} · {formatTime(a.scheduled_at)}</p>
                            <p className="text-xs text-muted-foreground">{a.services?.name}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={a.status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'}>
                              {APPOINTMENT_STATUS_LABELS[a.status as keyof typeof APPOINTMENT_STATUS_LABELS]}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCurrency(a.services?.price_cents ?? 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
