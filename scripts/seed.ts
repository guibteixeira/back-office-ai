import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const users = [
  { name: 'Ana Silva',    email: 'ana@teste.com',    phone: '11999990001', profession: 'psychologist', slug: 'ana-silva' },
  { name: 'Bruno Costa',  email: 'bruno@teste.com',  phone: '11999990002', profession: 'nutritionist', slug: 'bruno-costa' },
  { name: 'Carla Mendes', email: 'carla@teste.com',  phone: '11999990003', profession: 'coach',        slug: 'carla-mendes' },
]

async function seed() {
  for (const user of users) {
    // 1. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: '123456',
      email_confirm: true,
    })

    if (authError) {
      console.error(`[${user.email}] Auth error:`, authError.message)
      continue
    }

    const userId = authData.user.id
    console.log(`[${user.email}] Auth user criado: ${userId}`)

    // 2. Cria o perfil na tabela professionals
    const { error: profileError } = await supabase.from('professionals').insert({
      id: userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profession: user.profession,
      slug: user.slug,
      timezone: 'America/Sao_Paulo',
    })

    if (profileError) {
      console.error(`[${user.email}] Profile error:`, profileError.message)
      continue
    }

    console.log(`[${user.email}] Perfil criado OK`)
  }

  console.log('\nSeed concluído.')
}

seed()
