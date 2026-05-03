-- ============================================================
-- AgendaPro — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  profession text,
  slug text UNIQUE NOT NULL,
  timezone text DEFAULT 'America/Sao_Paulo',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes int NOT NULL,
  price_cents int NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  active boolean DEFAULT true,
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time time,
  end_time time,
  reason text
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_amount_cents int,
  payment_method text CHECK (payment_method IN ('pix', 'card', 'cash', 'pending') OR payment_method IS NULL),
  payment_link text,
  notes text,
  reminder_24h_sent boolean DEFAULT false,
  reminder_2h_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(scheduled_at, ends_at, '[)') WITH &&
  ) WHERE (status NOT IN ('cancelled'))
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_professional_scheduled
  ON appointments(professional_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_reminders
  ON appointments(reminder_24h_sent, reminder_2h_sent, scheduled_at)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_clients_professional
  ON clients(professional_id);

CREATE INDEX IF NOT EXISTS idx_services_professional
  ON services(professional_id, active);

CREATE INDEX IF NOT EXISTS idx_availability_professional
  ON availability(professional_id, active);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- professionals: each user sees only their own row
CREATE POLICY "professionals_self" ON professionals
  FOR ALL USING (id = auth.uid());

-- services: professional sees only their own
CREATE POLICY "services_owner" ON services
  FOR ALL USING (professional_id = auth.uid());

-- Public read for booking page (services by professional slug)
CREATE POLICY "services_public_read" ON services
  FOR SELECT USING (active = true);

-- clients: professional sees only their own
CREATE POLICY "clients_owner" ON clients
  FOR ALL USING (professional_id = auth.uid());

-- availability: professional sees only their own
CREATE POLICY "availability_owner" ON availability
  FOR ALL USING (professional_id = auth.uid());

-- Public read for booking page
CREATE POLICY "availability_public_read" ON availability
  FOR SELECT USING (active = true);

-- availability_blocks: professional sees only their own
CREATE POLICY "blocks_owner" ON availability_blocks
  FOR ALL USING (professional_id = auth.uid());

-- Public read for booking page
CREATE POLICY "blocks_public_read" ON availability_blocks
  FOR SELECT USING (true);

-- appointments: professional sees only their own
CREATE POLICY "appointments_owner" ON appointments
  FOR ALL USING (professional_id = auth.uid());

-- notification_logs: professional sees own appointment logs
CREATE POLICY "logs_owner" ON notification_logs
  FOR ALL USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE professional_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTION: Create professional profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Profile is created during onboarding, not automatically
  RETURN NEW;
END;
$$;

-- ============================================================
-- Enable the btree_gist extension for the EXCLUDE constraint
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;
