import { Availability, AvailabilityBlock, Appointment, TimeSlot } from '@/types'
import { toSaoPauloDateString } from '@/lib/utils'

const TZ = 'America/Sao_Paulo'

// Generate all time slots for a given date given availability config and booked appointments
export function generateSlots(
  date: Date,
  availabilities: Availability[],
  blocks: AvailabilityBlock[],
  appointments: Appointment[],
  durationMinutes: number
): TimeSlot[] {
  const dateStr = toSaoPauloDateString(date)

  // Check if date is in SP timezone (use SP date)
  const spNow = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  const spToday = toSaoPauloDateString(spNow)
  if (dateStr < spToday) return []

  // Find availability for this day of week
  // Get day of week in SP timezone
  const spDayOfWeek = new Date(
    new Date(dateStr + 'T12:00:00').toLocaleString('en-US', { timeZone: TZ })
  ).getDay()

  const dayAvailability = availabilities.find(
    (a) => a.day_of_week === spDayOfWeek && a.active
  )
  if (!dayAvailability) return []

  // Check if entire day is blocked
  const fullDayBlock = blocks.find(
    (b) => b.blocked_date === dateStr && !b.start_time && !b.end_time
  )
  if (fullDayBlock) return []

  // Get partial blocks for this date
  const partialBlocks = blocks.filter(
    (b) => b.blocked_date === dateStr && b.start_time && b.end_time
  )

  // Get existing appointments for this date (non-cancelled)
  const dayAppointments = appointments.filter((a) => {
    if (a.status === 'cancelled') return false
    const apptDateStr = toSaoPauloDateString(new Date(a.scheduled_at))
    return apptDateStr === dateStr
  })

  // Parse availability times
  const [startH, startM] = dayAvailability.start_time.split(':').map(Number)
  const [endH, endM] = dayAvailability.end_time.split(':').map(Number)

  const slots: TimeSlot[] = []
  let currentMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes)
    const slotEnd = minutesToTime(currentMinutes + durationMinutes)

    // Build UTC ISO strings for this slot
    const slotStartISO = `${dateStr}T${slotStart}:00-03:00`
    const slotEndISO = `${dateStr}T${slotEnd}:00-03:00`
    const slotStartDate = new Date(slotStartISO)
    const slotEndDate = new Date(slotEndISO)

    // Don't show past slots (add 5 min buffer)
    const now = new Date()
    if (slotStartDate <= new Date(now.getTime() + 5 * 60 * 1000)) {
      currentMinutes += durationMinutes
      continue
    }

    // Check partial blocks
    const blockedByPartial = partialBlocks.some((b) => {
      if (!b.start_time || !b.end_time) return false
      const blockStart = `${dateStr}T${b.start_time}-03:00`
      const blockEnd = `${dateStr}T${b.end_time}-03:00`
      return slotStartDate < new Date(blockEnd) && slotEndDate > new Date(blockStart)
    })
    if (blockedByPartial) {
      currentMinutes += durationMinutes
      continue
    }

    // Check existing appointments
    const hasConflict = dayAppointments.some((a) => {
      const apptStart = new Date(a.scheduled_at)
      const apptEnd = new Date(a.ends_at)
      return slotStartDate < apptEnd && slotEndDate > apptStart
    })
    if (hasConflict) {
      currentMinutes += durationMinutes
      continue
    }

    slots.push({
      start: slotStartDate.toISOString(),
      end: slotEndDate.toISOString(),
      label: formatSlotTime(slotStart),
    })

    currentMinutes += durationMinutes
  }

  return slots
}

// Get dates that have at least 1 slot available (for calendar disabled logic)
export function getDatesWithSlots(
  availabilities: Availability[],
  blocks: AvailabilityBlock[],
  appointments: Appointment[],
  durationMinutes: number,
  monthStart: Date,
  monthEnd: Date
): Set<string> {
  const activeDays = new Set(
    availabilities.filter((a) => a.active).map((a) => a.day_of_week)
  )
  const result = new Set<string>()
  const current = new Date(monthStart)

  while (current <= monthEnd) {
    const spDayOfWeek = new Date(
      current.toLocaleString('en-US', { timeZone: TZ })
    ).getDay()

    if (activeDays.has(spDayOfWeek)) {
      const slots = generateSlots(
        current,
        availabilities,
        blocks,
        appointments,
        durationMinutes
      )
      if (slots.length > 0) {
        result.add(toSaoPauloDateString(current))
      }
    }

    current.setDate(current.getDate() + 1)
  }

  return result
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = (totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function formatSlotTime(time: string): string {
  return time.substring(0, 5)
}
