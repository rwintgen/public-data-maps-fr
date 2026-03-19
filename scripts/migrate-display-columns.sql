-- Migration: add promoted display columns to avoid TOAST reads during search.
-- Run after upgrading the Cloud SQL instance.

ALTER TABLE establishments ADD COLUMN IF NOT EXISTS denomination TEXT;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS denomination_usu TEXT;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS section_etab TEXT;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS commune TEXT;

-- Backfill from JSONB fields (runs once, may take a few minutes on large datasets)
UPDATE establishments SET
  denomination     = fields->>'Dénomination de l''unité légale',
  denomination_usu = fields->>'Dénomination usuelle de l''établissement',
  section_etab     = fields->>'Section de l''établissement',
  code_postal      = fields->>'Code postal de l''établissement',
  commune          = fields->>'Commune de l''établissement'
WHERE denomination IS NULL;
