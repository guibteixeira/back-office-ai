import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgendaPro — Back office para profissionais autônomos',
  description: 'Gerencie sua agenda, clientes e lembretes automáticos em um só lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
