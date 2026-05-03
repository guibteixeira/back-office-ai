export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      professionals: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          profession: string | null
          slug: string
          timezone: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          profession?: string | null
          slug: string
          timezone?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          profession?: string | null
          slug?: string
          timezone?: string
          created_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          professional_id: string
          name: string
          duration_minutes: number
          price_cents: number
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          name: string
          duration_minutes: number
          price_cents: number
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          name?: string
          duration_minutes?: number
          price_cents?: number
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'services_professional_id_fkey'
            columns: ['professional_id']
            isOneToOne: false
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          }
        ]
      }
      clients: {
        Row: {
          id: string
          professional_id: string
          name: string
          email: string | null
          phone: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          name: string
          email?: string | null
          phone: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          name?: string
          email?: string | null
          phone?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_professional_id_fkey'
            columns: ['professional_id']
            isOneToOne: false
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          }
        ]
      }
      availability: {
        Row: {
          id: string
          professional_id: string
          day_of_week: number
          start_time: string
          end_time: string
          active: boolean
        }
        Insert: {
          id?: string
          professional_id: string
          day_of_week: number
          start_time: string
          end_time: string
          active?: boolean
        }
        Update: {
          id?: string
          professional_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'availability_professional_id_fkey'
            columns: ['professional_id']
            isOneToOne: false
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          }
        ]
      }
      availability_blocks: {
        Row: {
          id: string
          professional_id: string
          blocked_date: string
          start_time: string | null
          end_time: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          professional_id: string
          blocked_date: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          professional_id?: string
          blocked_date?: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'availability_blocks_professional_id_fkey'
            columns: ['professional_id']
            isOneToOne: false
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          }
        ]
      }
      appointments: {
        Row: {
          id: string
          professional_id: string
          client_id: string | null
          service_id: string | null
          scheduled_at: string
          ends_at: string
          status: string
          payment_status: string
          payment_amount_cents: number | null
          payment_method: string | null
          payment_link: string | null
          notes: string | null
          reminder_24h_sent: boolean
          reminder_2h_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          client_id?: string | null
          service_id?: string | null
          scheduled_at: string
          ends_at: string
          status?: string
          payment_status?: string
          payment_amount_cents?: number | null
          payment_method?: string | null
          payment_link?: string | null
          notes?: string | null
          reminder_24h_sent?: boolean
          reminder_2h_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          client_id?: string | null
          service_id?: string | null
          scheduled_at?: string
          ends_at?: string
          status?: string
          payment_status?: string
          payment_amount_cents?: number | null
          payment_method?: string | null
          payment_link?: string | null
          notes?: string | null
          reminder_24h_sent?: boolean
          reminder_2h_sent?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_professional_id_fkey'
            columns: ['professional_id']
            isOneToOne: false
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      notification_logs: {
        Row: {
          id: string
          appointment_id: string | null
          type: string
          channel: string
          status: string
          sent_at: string
        }
        Insert: {
          id?: string
          appointment_id?: string | null
          type: string
          channel: string
          status: string
          sent_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string | null
          type?: string
          channel?: string
          status?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_logs_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
