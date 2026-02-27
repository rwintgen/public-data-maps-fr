-- Run this once against your Cloud SQL PostgreSQL instance
-- via: psql $DATABASE_URL -f scripts/setup-db.sql

-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Main establishments table
-- All CSV columns are stored in the JSONB `fields` column so the app
-- can dynamically display any column without schema changes.
CREATE TABLE IF NOT EXISTS establishments (
  id       SERIAL PRIMARY KEY,
  siret    VARCHAR(14),
  lat      DOUBLE PRECISION NOT NULL,
  lon      DOUBLE PRECISION NOT NULL,
  geom     GEOMETRY(Point, 4326) NOT NULL,
  fields   JSONB NOT NULL DEFAULT '{}'
);

-- Spatial index — this is what makes polygon queries fast
CREATE INDEX IF NOT EXISTS idx_establishments_geom
  ON establishments USING GIST (geom);

-- Index for SIRET lookups
CREATE INDEX IF NOT EXISTS idx_establishments_siret
  ON establishments (siret);

-- GIN index for JSONB field filtering (optional, improves filter queries)
CREATE INDEX IF NOT EXISTS idx_establishments_fields
  ON establishments USING GIN (fields jsonb_path_ops);
