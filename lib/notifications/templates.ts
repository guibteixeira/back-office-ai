import { formatDate, formatTime, formatWeekday, formatCurrency } from '@/lib/utils'

interface AppointmentData {
  clientName: string
  clientPhone: string
  professionalName: string
  serviceName: string
  scheduledAt: string
  priceCents: number
  address?: string
}

export function confirmationMessage(data: AppointmentData): string {
  return `Olá, ${data.clientName}! ✅

Seu agendamento foi confirmado:

📅 ${formatWeekday(data.scheduledAt)}, ${formatDate(data.scheduledAt)} às ${formatTime(data.scheduledAt)}
💼 ${data.serviceName}
👤 ${data.professionalName}
💰 ${formatCurrency(data.priceCents)}

Qualquer dúvida, responda essa mensagem.`
}

export function reminder24hMessage(data: AppointmentData): string {
  return `Olá, ${data.clientName}! 👋

Lembrando que você tem um agendamento amanhã:

📅 ${formatWeekday(data.scheduledAt)}, ${formatDate(data.scheduledAt)}
⏰ ${formatTime(data.scheduledAt)}
💼 ${data.serviceName} com ${data.professionalName}
💰 Valor: ${formatCurrency(data.priceCents)}

Qualquer dúvida, entre em contato.
Até lá! 😊`
}

export function reminder2hMessage(data: AppointmentData): string {
  const location = data.address || 'Online'
  return `Olá, ${data.clientName}! ⏰

Seu atendimento é em 2 horas:

🕐 ${formatTime(data.scheduledAt)} — ${data.serviceName}
📍 ${location}

Te esperamos! Até já 👊`
}

export function newAppointmentProfessionalMessage(data: AppointmentData): string {
  return `📅 Novo agendamento!

👤 ${data.clientName}
📱 ${data.clientPhone}
💼 ${data.serviceName}
🕐 ${formatDate(data.scheduledAt)} às ${formatTime(data.scheduledAt)}

Acesse o painel para confirmar.`
}
