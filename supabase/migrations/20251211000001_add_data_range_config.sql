-- Add training_data_range configuration for training data range in months
INSERT INTO "public"."preprocessing_configs" ("method_id", "enabled", "config")
VALUES (
  'training_data_range',
  true,
  '{
    "description": "Number of months of historical data to use for training",
    "months": 1,
    "unit": "months",
    "note": "The model will use the most recent N months of data for training"
  }'::jsonb
)
ON CONFLICT (method_id) DO UPDATE
SET config = EXCLUDED.config,
    updated_at = now();
