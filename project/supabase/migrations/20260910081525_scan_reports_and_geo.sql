/*
# THREATX — Scan Reports with Geo Data (no-auth, single-tenant)

1. Purpose
   Since authentication was removed, this migration adds a new `scan_reports`
   table that stores full scan results including geolocation data for the
   no-auth single-tenant app. The old `profiles` and `scans` tables remain
   untouched.

2. New Table: scan_reports
   - id (uuid PK, default gen_random_uuid)
   - email_from (text)
   - email_to (text)
   - email_subject (text)
   - email_date (text)
   - originating_ip (text)
   - risk_score (integer 0-100)
   - threat_level (text: safe | suspicious | malicious)
   - is_phishing (boolean)
   - portal (text: citizen | law_enforcement)
   - analysis_json (jsonb — full AnalysisResult + indicators)
   - email_data_json (jsonb — full parsed EmailData)
   - geo_data_json (jsonb — geolocation lookup result)
   - created_at (timestamptz default now())

3. Security
   - RLS enabled on scan_reports.
   - Since there is NO sign-in screen, policies use TO anon, authenticated
     with USING (true) / WITH CHECK (true) — the data is intentionally public
     for this single-tenant app.

4. Notes
   - Safe to re-run (IF NOT EXISTS + DROP POLICY IF EXISTS).
*/

CREATE TABLE IF NOT EXISTS scan_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_from text,
  email_to text,
  email_subject text,
  email_date text,
  originating_ip text,
  risk_score integer DEFAULT 0,
  threat_level text DEFAULT 'safe',
  is_phishing boolean DEFAULT false,
  portal text DEFAULT 'citizen',
  analysis_json jsonb,
  email_data_json jsonb,
  geo_data_json jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scan_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_reports" ON scan_reports;
CREATE POLICY "anon_select_scan_reports" ON scan_reports
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scan_reports" ON scan_reports;
CREATE POLICY "anon_insert_scan_reports" ON scan_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scan_reports" ON scan_reports;
CREATE POLICY "anon_update_scan_reports" ON scan_reports
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scan_reports" ON scan_reports;
CREATE POLICY "anon_delete_scan_reports" ON scan_reports
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_scan_reports_created_at ON scan_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_reports_risk_score ON scan_reports (risk_score DESC);
