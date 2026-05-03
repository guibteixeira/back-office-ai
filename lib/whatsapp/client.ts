interface SendTextPayload {
  number: string
  text: string
}

interface SendTextResponse {
  success: boolean
  error?: string
}

function cleanPhone(phone: string): string {
  // Remove all non-digits and ensure 55 country code for Brazil
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<SendTextResponse> {
  const url = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME

  if (!url || !apiKey || !instance) {
    console.warn('WhatsApp not configured — skipping message send')
    return { success: false, error: 'WhatsApp not configured' }
  }

  const phone = cleanPhone(to)

  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      } satisfies SendTextPayload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('WhatsApp API error:', res.status, body)
      return { success: false, error: `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err) {
    console.error('WhatsApp send failed:', err)
    return { success: false, error: String(err) }
  }
}
