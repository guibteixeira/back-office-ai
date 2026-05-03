import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NotificationType } from '@/types'

interface SendNotificationParams {
  appointmentId: string
  phone: string
  message: string
  type: NotificationType
}

export async function sendNotification({
  appointmentId,
  phone,
  message,
  type,
}: SendNotificationParams): Promise<void> {
  const result = await sendWhatsAppMessage(phone, message)

  // Log the attempt regardless of success
  await supabaseAdmin.from('notification_logs').insert({
    appointment_id: appointmentId,
    type,
    channel: 'whatsapp',
    status: result.success ? 'sent' : 'failed',
  })
}
