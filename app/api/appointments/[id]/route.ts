import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/appointments/:id — update status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, notes, payment_status, payment_method } = body

  // Validate no_show only for past appointments
  if (status === 'no_show') {
    const { data: appt } = await supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('id', id)
      .eq('professional_id', user.id)
      .single()
    if (appt && new Date(appt.scheduled_at) > new Date()) {
      return NextResponse.json(
        { error: 'Não é possível marcar como não compareceu antes do horário.' },
        { status: 400 }
      )
    }
  }

  type UpdateData = {
    status?: string
    notes?: string
    payment_status?: string
    payment_method?: string
  }
  const updateData: UpdateData = {}
  if (status !== undefined) updateData.status = status
  if (notes !== undefined) updateData.notes = notes
  if (payment_status !== undefined) updateData.payment_status = payment_status
  if (payment_method !== undefined) updateData.payment_method = payment_method

  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id)
    .eq('professional_id', user.id)
    .select('*, clients(*), services(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/appointments/:id — cancel appointment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('professional_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
