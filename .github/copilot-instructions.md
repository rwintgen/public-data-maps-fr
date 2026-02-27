# Copilot Instructions — Public Data Maps (France)

## Project Overview

A Next.js 14 (App Router) application that lets users draw an area on a Leaflet map and retrieve French company establishments from the SIRENE v3 dataset. The backend uses PostGIS for spatial queries with an in-memory CSV fallback.

## Code Style

### Comments & Documentation

- **No descriptive inline comments.** Do not add comments that merely restate what the code does (e.g. `// Fetch columns on mount`, `// Initialize state`). These add noise and go stale quickly.
- **Use JSDoc** for non-obvious logic: exported functions, complex hooks/effects, utility helpers, and API route handlers. Focus on *why*, not *what*.
- **Keep JSX section comments** (`{/* Header */}`, `{/* Sidebar */}`) only when they aid navigation in large render bodies (100+ lines). Remove them from small components.
- **CSS section comments** in `globals.css` (e.g. `/* === Tooltip system */`) are useful — keep them.

### TypeScript

- Prefer explicit types for function parameters and return values on exported functions.
- Use `interface` for component props; avoid `type` aliases for simple object shapes.
- Avoid `any` where possible. When unavoidable (e.g. Leaflet layer events), add a brief JSDoc noting why.

### React Patterns

- **Client Components** are marked `'use client'` at the top. The only server-side code lives in `src/app/api/` routes and `src/lib/db.ts`.
- **Theme tokens** — each component defines a `t` (or `d` in `page.tsx`) object mapping semantic names to Tailwind classes for dark/light mode. Keep this pattern when adding new themed UI.
- **Preferences** use a dual-write strategy: `localStorage` for instant restore + Firestore debounced for cross-device sync.
- Wrap callbacks passed to children in `useCallback`. Derived data should use `useMemo`.

### Tailwind CSS

- Use Tailwind utility classes exclusively — no custom CSS classes except in `globals.css` (Leaflet overrides, tooltip system, scrollbar, animations).
- Dark mode is controlled via a `data-theme` attribute on `<html>`, not Tailwind's `dark:` variant.
- The gray palette in `tailwind.config.ts` is overridden with neutral (non-blue-tinted) values — **do not** use Tailwind's default `zinc` or `slate` as a workaround.

### Design Consistency

When adding or editing themed UI, follow these rules to keep the app visually coherent:

- **No blue in dark mode.** All interactive accents (active tabs, checkboxes, buttons, focus rings) must use gray/white tones. Blue accents are only used in light mode.
- **Primary actions in dark mode** use `bg-white text-gray-900` (inverted) or a subtle `bg-white/10` style — never colored backgrounds.
- **Modal overlay** — always `bg-black/50` dark, `bg-black/30` light. Use `backdrop-blur-sm`.
- **Close buttons** — all modals use a `w-7 h-7 rounded-lg` button with a `w-4 h-4` SVG cross icon, positioned in a flex row header.
- **Checkbox active state** — `border-gray-400 bg-gray-400` dark, `border-blue-600 bg-blue-600` light.
- **Tab active indicator** — `border-white/60` dark, `border-blue-600` light.
- **Input focus** — `focus:border-white/30` dark, `focus:border-blue-400` light.
- Before adding a new color token, check existing components for the canonical value to avoid drift.

## Architecture

```
src/
  app/
    page.tsx          ← Main app component, all top-level state
    layout.tsx        ← Root layout (Inter font, global CSS)
    globals.css       ← Tailwind directives + Leaflet/tooltip overrides
    api/search/
      route.ts        ← GET (columns) / POST (spatial query)
  components/
    Map.tsx           ← Leaflet + draw tools
    CompanyList.tsx   ← Sortable/filterable paginated list
    CompanyDetail.tsx ← Field detail modal
    ColumnConfig.tsx  ← Reusable column picker (list / popup tabs)
    SavedAreas.tsx    ← Firestore-backed saved searches
    SearchBar.tsx     ← Nominatim geocoding
    AuthModal.tsx     ← Firebase Auth (Google + email/password)
    ExportModal.tsx   ← CSV/JSON export
  lib/
    firebase.ts       ← Firebase client SDK init (git-ignored)
    db.ts             ← PostgreSQL connection pool (Cloud SQL connector)
scripts/
  setup-db.sql        ← PostGIS schema
  import-sirene.js    ← CSV → PostgreSQL streaming importer
```

## Data Flow

1. User draws a polygon/rectangle → `Map.tsx` emits GeoJSON geometry via `onSearch`.
2. `page.tsx` POSTs geometry to `/api/search`.
3. `route.ts` routes to PostGIS (`ST_Contains`) or CSV fallback (Turf.js).
4. Response: `{ companies, columns, sampleData }`.
5. `mapCompanies` useMemo applies client-side filters before rendering markers.

## Database

- **PostGIS** on Cloud SQL (PostgreSQL 15). Schema in `scripts/setup-db.sql`.
- All CSV columns are stored in a JSONB `fields` column — the UI dynamically adapts to whatever columns exist.
- The `sampleData` flag in API responses triggers an amber warning banner.

## When Making Changes

1. **Update JSDoc** when modifying complex functions.
2. **Update `README.md`** when adding features, changing setup steps, or completing roadmap items.
3. **Check the roadmap** at the bottom of the README and tick off completed items.
4. **Do not introduce new inline comments** that merely describe the next line of code.
5. **Test the build** (`npm run build`) — the project deploys via Firebase App Hosting which runs a production build.
6. **Keep the CSV fallback working** — any changes to `route.ts` must preserve the CSV path for contributors without a database.

## Common Tasks

- **Add a new component:** create in `src/components/`, use `'use client'`, define a theme tokens object, add JSDoc to the default export.
- **Add a new API route:** create in `src/app/api/<name>/route.ts`, add JSDoc to each handler.
- **Add a new database column:** update `scripts/setup-db.sql`, update `import-sirene.js`, and note in README.
- **Change map tiles:** modify the `url` conditional in `Map.tsx`'s `<TileLayer>`.
