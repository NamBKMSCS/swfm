-- Active Models Configuration Table
-- Tracks which model is currently selected/active for each horizon
CREATE TABLE IF NOT EXISTS "public"."active_models" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "horizon_minutes" integer NOT NULL UNIQUE,
    "model_name" text NOT NULL,
    "model_version" text NOT NULL,
    "model_run_id" text NOT NULL,
    "activated_at" timestamp with time zone DEFAULT now(),
    "activated_by" uuid REFERENCES "auth"."users"("id"),
    "notes" text
);

-- Insert default active models for common horizons
INSERT INTO "public"."active_models" ("horizon_minutes", "model_name", "model_version", "model_run_id", "notes")
VALUES 
  (15, 'swfm-ridge-unified-15min', '1', 'placeholder', 'Default 15-minute forecast model'),
  (30, 'swfm-ridge-unified-30min', '1', 'placeholder', 'Default 30-minute forecast model'),
  (45, 'swfm-ridge-unified-45min', '1', 'placeholder', 'Default 45-minute forecast model'),
  (60, 'swfm-ridge-unified-60min', '1', 'placeholder', 'Default 60-minute forecast model')
ON CONFLICT (horizon_minutes) DO NOTHING;

-- Enable RLS
ALTER TABLE "public"."active_models" ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read" ON "public"."active_models" 
  FOR SELECT USING (true);

-- Allow data_scientist and admin to manage
CREATE POLICY "Allow experts/admins manage" ON "public"."active_models" 
  FOR ALL USING (
    auth.jwt() ->> 'user_role' IN ('data_scientist', 'admin')
  );
