/*
# THREATX Schema — User Profiles and Scan History

1. Purpose
   Stores THREATX user profiles (created during phone OTP onboarding) and
   email threat scan records so users can revisit past analyses.

2. New Tables
   - `profiles`
     - `id` uuid PK (links to auth.users)
     - `phone` text, unique, not null
     - `full_name` text
     - `email` text
     - `city` text
     - `country` text
     - `portal_role` text (citizen | law_enforcement)
     - `created_at` timestamptz default now()
   - `scans`
     - `id` uuid PK default gen_random_uuid()
     - `user_id` uuid FK -> auth.users ON DELETE CASCADE, default auth.uid()
     - `email_label` text
     - `risk_score` integer (0-100)
     - `threat_level` text (safe | suspicious | malicious)
     - `is_phishing` boolean
     - `portal` text (citizen | law_enforcement)
     - `summary` text
     - `created_at` timestamptz default now()

3. Security
   - RLS enabled on both tables.
   - profiles: owner-scoped CRUD (authenticated, auth.uid = id).
   - scans: owner-scoped CRUD (authenticated, auth.uid = user_id).
   - user_id on scans defaults to auth.uid() so client inserts without
     passing user_id still satisfy the WITH CHECK predicate.

4. Notes
   - No destructive operations; safe to re-run (IF NOT EXISTS + DROP POLICY IF EXISTS).
   - Phone OTP is simulated client-side for the prototype; profiles table
     stores the verified phone number for persistence.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE NOT NULL,
  full_name text,
  email text,
  city text,
  country text,
  portal_role text DEFAULT 'citizen',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email_label text,
  risk_score integer DEFAULT 0,
  threat_level text DEFAULT 'safe',
  is_phishing boolean DEFAULT false,
  portal text DEFAULT 'citizen',
  summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scans" ON scans;
CREATE POLICY "select_own_scans" ON scans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scans" ON scans;
CREATE POLICY "insert_own_scans" ON scans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scans" ON scans;
CREATE POLICY "update_own_scans" ON scans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scans" ON scans;
CREATE POLICY "delete_own_scans" ON scans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
