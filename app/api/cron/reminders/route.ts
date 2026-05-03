import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications/send'
import { reminder24hMessage, reminder2hMessage } from '@/lib/notifications/templates'

// GET /api/cron/reminders — called by Vercel Cron every 30 minutes
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let sent24h = 0
  let sent2h = 0
  let errors = 0

  // ── 24h reminders ──────────────────────────────────────
  const window24hFrom = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const window24hTo = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: appts24h } = await supabaseAdmin
    .from('appointments')
    .select('*, clients(*), services(*), professionals:professional_id(*)')
    .in('status', ['confirmed', 'pending'])
    .eq('reminder_24h_sent', false)
    .gte('scheduled_at', window24hFrom.toISOString())
    .lte('scheduled_at', window24hTo.toISOString())

  for (const appt of appts24h ?? []) {
    const client = appt.clients as { name: string; phone: string } | null
    const service = appt.services as { name: string; price_cents: number } | null
    const professional = appt.professionals as { name: string } | null

    if (!client || !service || !professional) continue

    const result = await sendNotification({
      appointmentId: appt.id,
      phone: client.phone,
      message: reminder24hMessage({
        clientName: client.name,
        clientPhone: client.phone,
        professionalName: professional.name,
        serviceName: service.name,
        scheduledAt: appt.scheduled_at,
        priceCents: service.price_cents,
      }),
      type: 'reminder_24h',
    })

    await supabaseAdmin
      .from('appointments')
      .update({ reminder_24h_sent: true })
      .eq('id', appt.id)

    sent24h++
  }

  // ── 2h reminders ───────────────────────────────────────
  const window2hFrom = new Date(now.getTime() + 105 * 60 * 1000) // +1h45
  const window2hTo = new Date(now.getTime() + 135 * 60 * 1000)   // +2h15

  const { data: appts2h } = await supabaseAdmin
    .from('appointments')
    .select('*, clients(*), services(*), professionals:professional_id(*)')
    .in('status', ['confirmed', 'pending'])
    .eq('reminder_2h_sent', false)
    .gte('scheduled_at', window2hFrom.toISOString())
    .lte('scheduled_at', window2hTo.toISOString())

  for (const appt of appts2h ?? []) {
    const client = appt.clients as { name: string; phone: string } | null
    const service = appt.services as { name: string; price_cents: number } | null
    const professional = appt.professionals as { name: string } | null

    if (!client || !service || !professional) continue

    await sendNotification({
      appointmentId: appt.id,
      phone: client.phone,
      message: reminder2hMessage({
        clientName: client.name,
        clientPhone: client.phone,
        professionalName: professional.name,
        serviceName: service.name,
        scheduledAt: appt.scheduled_at,
        priceCents: service.price_cents,
      }),
      type: 'reminder_2h',
    })

    await supabaseAdmin
      .from('appointments')
      .update({ reminder_2h_sent: true })
      .eq('id', appt.id)

    sent2h++
  }

  console.log(`[cron/reminders] 24h: ${sent24h}, 2h: ${sent2h}, errors: ${errors}`)
  return NextResponse.json({ sent24h, sent2h, errors })
}
