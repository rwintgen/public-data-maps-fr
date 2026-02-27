![Public Data Maps](./public/logo-full.png)

# Public Data Maps (France)

A full-stack web app to draw a custom area on a map of France and instantly retrieve a list of company establishments within that area, using the public data. Built with Next.js, Firebase, and Leaflet.

## Features

- **Draw on the map** — polygon or rectangle selection using Leaflet Draw
- **SIRENE data** — queries a PostGIS database of French company establishments (SIRET, name, address, geolocation), with an in-memory CSV fallback for quick local development
- **Company list** — sortable, filterable table with configurable columns
  - Filter operators: `contains`, `equals`, `empty`, with a NOT toggle
  - Sort by any column, ascending or descending
- **Company detail modal** — full field view for any establishment
- **Map markers** — click a pin to see a quick popup; click again to open the detail modal
- **Export** — download current results as CSV or JSON, with field selection
- **Saved searches** — sign in to save, restore, rename, and delete named searches (persisted in Firestore)
- **Map styles** — Default (OpenStreetMap), Themed (CartoCDN light/dark), Satellite (Esri)
- **Dark / Light theme** — persisted per-user in Firestore with localStorage cache for instant restore
- **Collapsible sidebar** — toggle the sidebar to reveal a full-screen map; smooth CSS transition
- **Geocoding** — search for any location in France (Nominatim) to pan the map
- **Geolocate** — jump to your current GPS position

## Tech Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript)                     |
| Styling     | Tailwind CSS 3                                          |
| Map         | Leaflet + react-leaflet + leaflet-draw                  |
| Auth        | Firebase Authentication (Google + email/password)       |
| User data   | Cloud Firestore (preferences, saved searches)           |
| Geo queries | Cloud SQL (PostgreSQL 15) + PostGIS                     |
| Fallback    | In-memory CSV with Turf.js point-in-polygon             |
| Hosting     | Firebase App Hosting                                    |

## Architecture

```
Browser ──▶ Next.js App (React + Leaflet)
               │
               ├──▶ /api/search (POST)  ──▶ PostGIS (ST_Contains)  ◀── Cloud SQL
               │                        └──▶ CSV fallback (Turf.js)
               │
               ├──▶ Firebase Auth
               └──▶ Cloud Firestore (user prefs & saved searches)
```

- **`/api/search` route** — accepts a GeoJSON geometry. When a PostGIS database is configured it runs a spatial `ST_Contains` query; otherwise it falls back to parsing the sample CSV in memory with Turf.js `booleanPointInPolygon`.
- **Dynamic columns** — all CSV columns are stored as a JSONB `fields` column in PostgreSQL, allowing the UI to display any column without schema changes.
- **Preferences** — written to `localStorage` immediately for zero-latency, then debounced to Firestore for cross-device sync.

---

## Getting Started (for Contributors)

We welcome contributions of all kinds — open an issue or submit a pull request.

### Prerequisites

- Node.js 18+ and npm
- A Google account (for Firebase)
- *(Optional)* A Cloud SQL PostgreSQL instance for the full dataset

### Installation & Setup

1. **Fork and clone** the repository.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase:**

   This project uses Firebase for authentication and saving searches. You need your own free Firebase project.

   1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
   2. In **Project Settings → Your apps**, add a **Web** app and copy the `firebaseConfig` object.
   3. Copy the Firebase credentials template:
      ```bash
      cp src/lib/firebase.example.ts src/lib/firebase.ts
      ```
      > `src/lib/firebase.ts` is git-ignored — your keys will not be committed.
   4. Paste your `firebaseConfig` into `src/lib/firebase.ts`.
   5. In the Firebase console, go to **Authentication → Sign-in method** and enable:
      - **Google**
      - **Email/Password**
   6. Go to **Firestore Database**, create a database, and publish the following security rules:
      ```
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /userProfiles/{userId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /savedAreas/{docId} {
            allow read, write, delete: if request.auth != null && request.auth.uid == resource.data.userId;
            allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
          }
        }
      }
      ```

4. **Set up the data source:**

   **Option A — Sample CSV (quickstart, no database needed):**

   A sample dataset is included at `data/economicref-france-sirene-v3-sample.csv`. The app falls back to it automatically when no database connection is configured. An amber banner in the sidebar indicates sample-data mode.

   **Option B — Full dataset via PostGIS:**

   1. Create a Cloud SQL PostgreSQL 15 instance (or any PostgreSQL 15+ with PostGIS).
   2. Apply the schema:
      ```bash
      psql $DATABASE_URL -f scripts/setup-db.sql
      ```
   3. Download the full SIRENE CSV from [Open Data Soft](https://public.opendatasoft.com/explore/assets/economicref-france-sirene-v3/) and import it:
      ```bash
      DATABASE_URL=postgresql://user:pass@localhost:5432/sirene_db node scripts/import-sirene.js path/to/file.csv
      ```
   4. For local development, run the Cloud SQL Auth Proxy and set `DATABASE_URL` in `.env.local`:
      ```
      DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/sirene_db
      ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). Sign in with Google or email/password to save searches.

---

## Database Schema

The PostGIS schema lives in [`scripts/setup-db.sql`](scripts/setup-db.sql):

| Column  | Type                  | Notes                                     |
|---------|-----------------------|-------------------------------------------|
| `id`    | `SERIAL PRIMARY KEY`  | Auto-increment                            |
| `siret` | `VARCHAR(14) UNIQUE`  | French establishment identifier           |
| `lat`   | `DOUBLE PRECISION`    | Latitude (WGS 84)                         |
| `lon`   | `DOUBLE PRECISION`    | Longitude (WGS 84)                        |
| `geom`  | `GEOMETRY(Point,4326)`| PostGIS point for spatial queries         |
| `fields`| `JSONB`               | All CSV columns stored as key-value pairs |

Indexes: `GIST` on `geom`, `B-tree` on `siret`, `GIN` on `fields`.

---

## Deployment

This app requires server-side rendering (Next.js API routes handle the search). **Firebase App Hosting** is the recommended deployment target as it natively supports Next.js SSR.

### Deploy with Firebase App Hosting

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Log in and initialise App Hosting:**
   ```bash
   firebase login
   firebase apphosting:backends:create
   ```
   Connect the GitHub repository and select the `main` branch for CI/CD deploys.

3. **Configure environment variables** in `apphosting.yaml`:
   - `CLOUD_SQL_CONNECTION_NAME` — e.g. `project-id:region:instance-name`
   - `DB_USER` — database user
   - `DB_NAME` — database name
   - `DB_PASSWORD` — stored as a Secret Manager secret

4. **Grant the App Hosting backend access to the secret:**
   ```bash
   firebase apphosting:secrets:grantaccess DB_PASSWORD --backend <backend-id>
   ```

5. **Push to `main`** — Firebase builds and deploys automatically.

---

## NPM Scripts

| Script        | Description                                        |
|---------------|----------------------------------------------------|
| `npm run dev` | Start the Next.js development server               |
| `npm run build` | Production build                                 |
| `npm run start` | Start the production server                      |
| `npm run lint`  | Run ESLint                                       |
| `npm run db:setup` | Apply the PostGIS schema via `psql`           |
| `npm run db:import` | Import a SIRENE CSV into PostgreSQL           |

---

## Project Roadmap

- [x] SIRENE v3 CSV data source
- [x] Draw-based area selection (polygon + rectangle)
- [x] Company list with sort and multi-condition filters
- [x] Company detail modal
- [x] Dark / Light theme
- [x] Multiple map styles (Default, Themed, Satellite)
- [x] Saved searches (Firebase Auth + Firestore)
- [x] Export results (CSV / JSON)
- [x] Geocoding search bar
- [x] PostGIS backend for full-dataset performance
- [x] Deploy via Firebase App Hosting
- [ ] Import full SIRENE dataset into Cloud SQL
- [ ] Increase result cap beyond 5 000 (pagination or streaming)
- [ ] Cluster map pins for performance with large result sets
- [ ] Add other data types beyond companies (e.g. schools, health facilities)
- [ ] Mobile-responsive layout
- [ ] Add AI overview
