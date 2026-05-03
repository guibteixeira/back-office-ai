import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/booking/:slug — public endpoint for the booking page
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: professional, error } = await supabaseAdmin
    .from('professionals')
    .select('id, name, profession, slug')
    .eq('slug', slug)
    .single()

  if (error || !professional) {
    return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
  }

  const { data: services } = await supabaseAdmin
    .from('services')
    .select('id, name, duration_minutes, price_cents, description')
    .eq('professional_id', professional.id)
    .eq('active', true)
    .order('name', { ascending: true })

  return NextResponse.json({ professional, services: services ?? [] })
}
