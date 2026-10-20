-- =====================================================================
-- MILAN 2026 - Supabase Database Schema
-- Run this ENTIRE script in Supabase → SQL Editor → New Query → Run
-- =====================================================================

-- 1. ATTENDEES TABLE
CREATE TABLE IF NOT EXISTS attendees (
  id                  TEXT PRIMARY KEY,
  ticket_code         TEXT UNIQUE NOT NULL,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT NOT NULL DEFAULT '',
  roll_number         TEXT NOT NULL,
  usn                 TEXT NOT NULL,
  department          TEXT NOT NULL DEFAULT '',
  year                TEXT NOT NULL DEFAULT '',
  id_card_url         TEXT,
  degree_proof_url    TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason    TEXT,
  checked_in          BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at       TEXT,
  checked_in_by       TEXT,
  registered_at       TEXT NOT NULL,
  approved_at         TEXT,
  wristband_color     TEXT DEFAULT 'Neon Cyan (General)',
  wristband_number    TEXT,
  notes               TEXT,
  organization        TEXT,
  designation         TEXT,
  family_count        INTEGER DEFAULT 0,
  family_members      JSONB DEFAULT '[]'::jsonb,
  total_quota         INTEGER DEFAULT 1,
  admitted_count      INTEGER DEFAULT 0,
  check_in_logs       JSONB DEFAULT '[]'::jsonb,
  verification_method TEXT,
  is_contact_updated  BOOLEAN DEFAULT FALSE,
  original_email      TEXT,
  original_phone      TEXT,
  review_reason       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENT SETTINGS TABLE (single row, id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id                   INTEGER PRIMARY KEY DEFAULT 1,
  event_name           TEXT NOT NULL DEFAULT 'MILAN 2026',
  tagline              TEXT DEFAULT 'DBIT Alumni Association | Reconnecting Relations',
  event_date           TEXT DEFAULT 'Saturday, November 7, 2026',
  event_time           TEXT DEFAULT '02:30 PM',
  gates_open_time      TEXT DEFAULT '02:00 PM',
  event_venue          TEXT DEFAULT 'DBIT Cricket Ground, Bangalore',
  organizer            TEXT DEFAULT 'DBIT Alumni Association',
  total_capacity       INTEGER DEFAULT 1000,
  is_registration_open BOOLEAN DEFAULT TRUE,
  wristband_colors     JSONB DEFAULT '["Royal Blue (Alumni)", "Gold (VIP/Staff)", "Navy Blue (General)"]'::jsonb,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ACTIVE OTPs TABLE
CREATE TABLE IF NOT EXISTS active_otps (
  usn         TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'EMAIL',
  target      TEXT NOT NULL,
  expires_at  BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VERIFIED SESSIONS TABLE
CREATE TABLE IF NOT EXISTS verified_sessions (
  token       TEXT PRIMARY KEY,
  usn         TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  expires_at  BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- DISABLE ROW LEVEL SECURITY (server-side only app, no client access)
-- =====================================================================
ALTER TABLE attendees         DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings          DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_otps       DISABLE ROW LEVEL SECURITY;
ALTER TABLE verified_sessions DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- INDEXES FOR FAST LOOKUPS
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_attendees_usn        ON attendees(usn);
CREATE INDEX IF NOT EXISTS idx_attendees_ticket     ON attendees(ticket_code);
CREATE INDEX IF NOT EXISTS idx_attendees_status     ON attendees(status);
CREATE INDEX IF NOT EXISTS idx_attendees_email      ON attendees(email);
CREATE INDEX IF NOT EXISTS idx_active_otps_usn      ON active_otps(usn);
CREATE INDEX IF NOT EXISTS idx_verified_sessions_usn ON verified_sessions(usn);

-- =====================================================================
-- SEED DEFAULT SETTINGS (insert once)
-- =====================================================================
INSERT INTO settings (id, event_name, tagline, event_date, event_time, gates_open_time, event_venue, organizer, total_capacity, is_registration_open, wristband_colors)
VALUES (
  1,
  'MILAN 2026',
  'DBIT Alumni Association | Reconnecting Relations',
  'Saturday, November 7, 2026',
  '02:30 PM',
  '02:00 PM',
  'DBIT Cricket Ground, Bangalore',
  'DBIT Alumni Association',
  1000,
  TRUE,
  '["Royal Blue (Alumni)", "Gold (VIP/Staff)", "Navy Blue (General)"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- DONE! Your database is ready.
-- =====================================================================
