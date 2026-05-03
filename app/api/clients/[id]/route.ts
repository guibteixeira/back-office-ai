import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('professional_id', user.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, services(*)')
    .eq('client_id', id)
    .order('scheduled_at', { ascending: false })

  return NextResponse.json({ client, appointments: appointments ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, phone, email, notes } = body

  const { data, error } = await supabase
    .from('clients')
    .update({ name, phone, email: email || null, notes: notes || null })
    .eq('id', id)
    .eq('professional_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
