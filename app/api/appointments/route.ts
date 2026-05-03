import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications/send'
import { confirmationMessage, newAppointmentProfessionalMessage } from '@/lib/notifications/templates'

// GET /api/appointments — list for authenticated professional
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  let query = supabase
    .from('appointments')
    .select('*, clients(*), services(*)')
    .eq('professional_id', user.id)
    .order('scheduled_at', { ascending: true })

  if (from) query = query.gte('scheduled_at', from)
  if (to) query = query.lte('scheduled_at', to)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/appointments — create from public booking page (no auth required)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    professional_id,
    service_id,
    scheduled_at,
    ends_at,
    client_name,
    client_phone,
    client_email,
    notes,
  } = body

  if (!professional_id || !service_id || !scheduled_at || !ends_at || !client_name || !client_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate date is in the future
  if (new Date(scheduled_at) <= new Date()) {
    return NextResponse.json({ error: 'Cannot book past dates' }, { status: 400 })
  }

  // Check for overlapping appointments (server-side guard)
  const { data: overlapping } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('professional_id', professional_id)
    .neq('status', 'cancelled')
    .lt('scheduled_at', ends_at)
    .gt('ends_at', scheduled_at)

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({ error: 'Horário não disponível. Por favor, escolha outro.' }, { status: 409 })
  }

  // Upsert client (find by phone or create)
  let clientId: string
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('professional_id', professional_id)
    .eq('phone', client_phone)
    .maybeSingle()

  if (existingClient) {
    clientId = existingClient.id
    // Update name/email in case it changed
    await supabaseAdmin
      .from('clients')
      .update({ name: client_name, email: client_email || null })
      .eq('id', clientId)
  } else {
    const { data: newClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        professional_id,
        name: client_name,
        phone: client_phone,
        email: client_email || null,
      })
      .select('id')
      .single()
    if (clientError || !newClient) {
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }
    clientId = newClient.id
  }

  // Create appointment
  const { data: appointment, error: apptError } = await supabaseAdmin
    .from('appointments')
    .insert({
      professional_id,
      client_id: clientId,
      service_id,
      scheduled_at,
      ends_at,
      status: 'pending',
      notes: notes || null,
    })
    .select('*, clients(*), services(*), professionals:professional_id(*)')
    .single()

  if (apptError || !appointment) {
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }

  // Send notifications asynchronously (don't block response)
  setImmediate(async () => {
    const service = appointment.services as { name: string; price_cents: number } | null
    const professional = appointment.professionals as { name: string; phone: string | null } | null
    const client = appointment.clients as { name: string; phone: string } | null

    if (!service || !professional || !client) return

    const data = {
      clientName: client.name,
      clientPhone: client.phone,
      professionalName: professional.name,
      serviceName: service.name,
      scheduledAt: appointment.scheduled_at,
      priceCents: service.price_cents,
    }

    // Confirmation to client
    await sendNotification({
      appointmentId: appointment.id,
      phone: client.phone,
      message: confirmationMessage(data),
      type: 'confirmation',
    })

    // New appointment alert to professional
    if (professional.phone) {
      await sendNotification({
        appointmentId: appointment.id,
        phone: professional.phone,
        message: newAppointmentProfessionalMessage(data),
        type: 'new_appointment_professional',
      })
    }
  })

  return NextResponse.json({ appointment }, { status: 201 })
}
