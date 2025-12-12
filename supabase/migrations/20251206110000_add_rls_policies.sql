-- Enable Row Level Security on tables that are missing it
-- These tables were created in later migrations and need RLS policies

-- Enable RLS on all missing tables
ALTER TABLE "public"."preprocessing_configs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."model_performance" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."station_model_configs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Preprocessing Configs: Public read, admin can manage
-- ============================================================================

CREATE POLICY "Allow public read" ON "public"."preprocessing_configs" FOR
SELECT USING (true);

CREATE POLICY "Allow admin manage" ON "public"."preprocessing_configs" FOR ALL USING (
    public.authorize (
        'data.manage'::public.app_permission,
        auth.uid ()
    )
);

-- ============================================================================
-- Model Performance: Public read, experts/admins can manage
-- ============================================================================

CREATE POLICY "Allow public read" ON "public"."model_performance" FOR
SELECT USING (true);

CREATE POLICY "Allow experts/admins manage" ON "public"."model_performance" FOR ALL USING (
    public.authorize (
        'models.tune'::public.app_permission,
        auth.uid ()
    )
    OR public.authorize (
        'data.manage'::public.app_permission,
        auth.uid ()
    )
);

-- ============================================================================
-- Station Model Configs: Public read, experts/admins can manage
-- ============================================================================

CREATE POLICY "Allow public read" ON "public"."station_model_configs" FOR
SELECT USING (true);

CREATE POLICY "Allow experts/admins manage" ON "public"."station_model_configs" FOR ALL USING (
    public.authorize (
        'models.tune'::public.app_permission,
        auth.uid ()
    )
    OR public.authorize (
        'data.manage'::public.app_permission,
        auth.uid ()
    )
);