-- Preprocessing Configs Table
CREATE TABLE IF NOT EXISTS "public"."preprocessing_configs" (
    "id" uuid DEFAULT gen_random_uuid () NOT NULL PRIMARY KEY,
    "method_id" text NOT NULL UNIQUE, -- 'outlier', 'missing', etc.
    "enabled" boolean DEFAULT true,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Model Performance Table
CREATE TABLE IF NOT EXISTS "public"."model_performance" (
    "id" uuid DEFAULT gen_random_uuid () NOT NULL PRIMARY KEY,
    "station_id" bigint REFERENCES "public"."stations" ("id") ON DELETE CASCADE,
    "model_type" text NOT NULL,
    "rmse" double precision,
    "mae" double precision,
    "r2" double precision,
    "mape" double precision,
    "accuracy" double precision,
    "evaluated_at" timestamp with time zone DEFAULT now()
);

-- Regression Analysis Table