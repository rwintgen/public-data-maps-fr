# Backend Performance — Knowledge Base

## Hard Facts

| Fact | Value |
|------|-------|
| Current dataset | **1.1M rows** (sample) |
| Target dataset | **40M+ rows** (full SIRENE) |
| Cloud SQL tier | **Upgraded: e2-custom-4-16384 (4 vCPU, 16 GB, SSD)** |
| Previous tier | db-f1-micro (1 shared vCPU, 628 MB RAM) |
| App Hosting | 1 vCPU, 512 MiB RAM |
| Connection pool | max 5 connections |

## Current Architecture: Two-Tier Data Loading

### Tier 1 — Skeleton (search time, no TOAST)
- Query selects only **promoted columns** (20+ inline columns, zero JSONB)
- Server builds a synthetic `{ lat, lon, fields }` from promoted columns
- Client sees the same shape — no changes to Map/CompanyList/popup rendering
- **TOAST I/O completely eliminated from the search path**

### Tier 2 — Full details (on demand)
- `POST /api/search/details` fetches full JSONB by SIRET
- Called when: user clicks a company (detail modal), user exports
- CompanyDetail shows skeleton instantly, enriches when JSONB loads (~100ms)
- ExportModal fetches full fields before building the export file

### Promoted columns (inline, no TOAST)
Filter columns: statut_admin, statut_admin_ul, date_fermeture, date_fermeture_ul, est_siege, diffusible, ape_code, naf_division, legal_form, assoc_id, categorie_ent, employeur, tranche_eff_sort, ess, mission

Display columns (NEW): denomination, denomination_usu, section_etab, code_postal, commune

### Migration
Run `scripts/migrate-display-columns.sql` on the DB to backfill new columns from JSONB.

## Root Cause (resolved)

The db-f1-micro had ~150 MB shared_buffers. EXPLAIN showed `shared hit=27, read=25,086` = 99.9% disk reads. Upgraded to 4 vCPU / 16 GB RAM with SSD, flags: work_mem=32768, effective_cache_size=1468006, random_page_cost=1.1.
