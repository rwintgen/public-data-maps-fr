CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS establishments (
  id       SERIAL PRIMARY KEY,
  siret    VARCHAR(14) UNIQUE,
  lat      DOUBLE PRECISION NOT NULL,
  lon      DOUBLE PRECISION NOT NULL,
  geom     GEOMETRY(Point, 4326) NOT NULL,
  fields   JSONB NOT NULL DEFAULT '{}',

  -- Promoted columns for fast indexed filtering (populated by import script)
  statut_admin       TEXT,      -- 'Actif' / 'Fermé'
  statut_admin_ul    TEXT,      -- 'Active' / 'Cessée'
  date_fermeture     TEXT,      -- establishment close date (empty = open)
  date_fermeture_ul  TEXT,      -- legal unit close date
  est_siege          BOOLEAN,   -- true when siège
  diffusible         BOOLEAN,   -- true when statut diffusion = 'O'
  ape_code           TEXT,      -- e.g. '62.01Z'
  naf_division       SMALLINT,  -- first 2 digits of APE as integer
  legal_form         TEXT,      -- catégorie juridique code
  assoc_id           TEXT,      -- association identifier (nullable)
  categorie_ent      TEXT,      -- 'PME' / 'ETI' / 'GE'
  employeur          TEXT,      -- 'Oui' / 'Non'
  tranche_eff_sort   INTEGER,   -- sortable workforce bracket (nullable)
  ess                TEXT,      -- 'O' / 'N' (économie sociale et solidaire)
  mission            TEXT,      -- 'O' / 'N' (société à mission)

  -- Promoted display columns (avoid TOAST reads during search)
  denomination       TEXT,      -- company name (dénomination unité légale)
  denomination_usu   TEXT,      -- establishment trade name
  section_etab       TEXT,      -- section label (e.g. 'Commerce')
  code_postal        TEXT,      -- postal code
  commune            TEXT       -- city name
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_establishments_geom
  ON establishments USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_establishments_siret
  ON establishments (siret);

CREATE INDEX IF NOT EXISTS idx_establishments_fields
  ON establishments USING GIN (fields jsonb_path_ops);

-- B-tree indexes on promoted columns
CREATE INDEX IF NOT EXISTS idx_est_statut_admin ON establishments (statut_admin);
CREATE INDEX IF NOT EXISTS idx_est_ape_code     ON establishments (ape_code);
CREATE INDEX IF NOT EXISTS idx_est_naf_div      ON establishments (naf_division);
CREATE INDEX IF NOT EXISTS idx_est_legal_form   ON establishments (legal_form);
CREATE INDEX IF NOT EXISTS idx_est_categorie    ON establishments (categorie_ent);
CREATE INDEX IF NOT EXISTS idx_est_employeur    ON establishments (employeur);

-- Partial spatial indexes for the most common filter combos
CREATE INDEX IF NOT EXISTS idx_geom_active
  ON establishments USING GIST (geom) WHERE statut_admin = 'Actif';
CREATE INDEX IF NOT EXISTS idx_geom_active_siege
  ON establishments USING GIST (geom) WHERE statut_admin = 'Actif' AND est_siege = true;
CREATE INDEX IF NOT EXISTS idx_geom_diffusible
  ON establishments USING GIST (geom) WHERE diffusible = true;

-- Connector data: user-uploaded rows with lat/lon geom and arbitrary JSON fields
CREATE TABLE IF NOT EXISTS connector_rows (
  id            SERIAL PRIMARY KEY,
  connector_id  TEXT NOT NULL,
  org_id        TEXT NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  geom          GEOMETRY(Point, 4326) NOT NULL,
  fields        JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_connector_rows_connector
  ON connector_rows (connector_id);

CREATE INDEX IF NOT EXISTS idx_connector_rows_geom
  ON connector_rows USING GIST (geom);
