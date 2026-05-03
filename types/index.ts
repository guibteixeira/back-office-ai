export type Profession =
  | 'psicologo'
  | 'nutricionista'
  | 'fisioterapeuta'
  | 'coach'
  | 'advogado'
  | 'consultor'
  | 'outro'

export const PROFESSION_LABELS: Record<Profession, string> = {
  psicologo: 'Psicólogo(a)',
  nutricionista: 'Nutricionista',
  fisioterapeuta: 'Fisioterapeuta',
  coach: 'Coach',
  advogado: 'Advogado(a)',
  consultor: 'Consultor(a)',
  outro: 'Outro',
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-800',
  no_show: 'bg-red-100 text-red-800',
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type PaymentMethod = 'pix' | 'card' | 'cash' | 'pending'

export type NotificationType =
  | 'reminder_24h'
  | 'reminder_2h'
  | 'confirmation'
  | 'cancellation'
  | 'new_appointment_professional'

export type NotificationChannel = 'whatsapp' | 'email'

export interface Professional {
  id: string
  name: string
  email: string
  phone: string | null
  profession: Profession | null
  slug: string
  timezone: string
  created_at: string
}

export interface Service {
  id: string
  professional_id: string
  name: string
  duration_minutes: number
  price_cents: number
  description: string | null
  active: boolean
  created_at: string
}

export interface Client {
  id: string
  professional_id: string
  name: string
  email: string | null
  phone: string
  notes: string | null
  created_at: string
}

export interface Availability {
  id: string
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

export interface AvailabilityBlock {
  id: string
  professional_id: string
  blocked_date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export interface Appointment {
  id: string
  professional_id: string
  client_id: string | null
  service_id: string | null
  scheduled_at: string
  ends_at: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  payment_amount_cents: number | null
  payment_method: PaymentMethod | null
  payment_link: string | null
  notes: string | null
  reminder_24h_sent: boolean
  reminder_2h_sent: boolean
  created_at: string
  clients?: Client
  services?: Service
}

export interface NotificationLog {
  id: string
  appointment_id: string
  type: NotificationType
  channel: NotificationChannel
  status: 'sent' | 'failed'
  sent_at: string
}

export interface TimeSlot {
  start: string
  end: string
  label: string
}
