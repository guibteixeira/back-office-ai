'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, Users, Briefcase, Settings, LogOut, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  slug: string
  professionalName: string
}

const NAV = [
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Briefcase },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar({ slug, professionalName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agendar/${slug}`

  async function copyLink() {
    await navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <CalendarDays className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">AgendaPro</span>
      </div>

      {/* Booking link highlight */}
      <div className="mx-4 mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
        <p className="text-xs text-muted-foreground mb-1">Seu link de agendamento</p>
        <p className="text-xs font-medium text-primary truncate">/agendar/{slug}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full h-7 text-xs"
          onClick={copyLink}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copiado!' : 'Copiar link'}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{professionalName}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
