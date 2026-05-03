import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateSlots } from '@/lib/slots'

// GET /api/availability/slots?professional_id=...&service_id=...&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const professionalId = searchParams.get('professional_id')
  const serviceId = searchParams.get('service_id')
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!professionalId || !serviceId || !date) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const [availabilities, blocks, service, appointments] = await Promise.all([
    supabaseAdmin
      .from('availability')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('active', true),
    supabaseAdmin
      .from('availability_blocks')
      .select('*')
      .eq('professional_id', professionalId),
    supabaseAdmin
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single(),
    supabaseAdmin
      .from('appointments')
      .select('scheduled_at, ends_at, status')
      .eq('professional_id', professionalId)
      .neq('status', 'cancelled'),
  ])

  if (!service.data) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const slots = generateSlots(
    new Date(date + 'T12:00:00Z'),
    availabilities.data ?? [],
    blocks.data ?? [],
    (appointments.data ?? []) as import('@/types').Appointment[],
    service.data.duration_minutes
  )

  return NextResponse.json({ slots })
}
