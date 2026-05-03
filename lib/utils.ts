import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function parseCurrencyInput(value: string): number {
  const numeric = value.replace(/\D/g, '')
  return parseInt(numeric || '0', 10)
}

const TZ = 'America/Sao_Paulo'

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatWeekday(iso: string): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
  }).format(new Date(iso))
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

export function toSaoPauloDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function toSaoPauloTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Returns current date-time string in SP timezone for display
export function nowInSP(): Date {
  const sp = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  return sp
}

// Converts a "YYYY-MM-DD HH:mm" string (SP local time) to UTC ISO string
export function spLocalToUTC(dateStr: string, timeStr: string): string {
  // Treat as SP local time
  const localStr = `${dateStr}T${timeStr}:00`
  // We build a UTC date by interpreting it as SP time
  const tempDate = new Date(localStr + '-03:00') // SP is UTC-3 (approximate; ignores DST)
  return tempDate.toISOString()
}

export const DAY_NAMES_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

export const DAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
