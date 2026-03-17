![Public Data Maps](./public/brand/logo-full.png)

# Public Data Maps (France)

A full-stack web app to draw a custom area on a map of France and instantly retrieve a list of company establishments within that area, using the public data. Built with Next.js, Firebase, and Leaflet.

## Features

- **Draw on the map** — polygon or rectangle selection using Leaflet Draw
- **SIRENE data** — queries a PostGIS database of French company establishments (SIRET, name, address, geolocation), with an in-memory CSV fallback for quick local development
- **Company list** — sortable, filterable table with configurable columns
  - Filter operators: `contains`, `equals`, `empty`, with a NOT toggle
  - Sort by any column, ascending or descending
- **Company detail modal** — full field view for any establishment
- **Map markers** — up to 50 000 pins rendered via native `leaflet.markercluster`; click a pin to see a quick popup, click again to open the detail modal
- **Export** — download current results as CSV or JSON, with field selection
- **Saved searches** — sign in to save, restore, rename, and delete named searches (persisted in Firestore)
- **Map styles** — Default (OpenStreetMap), Themed (CartoCDN light/dark), Satellite (Esri)
- **Dark / Light theme** — persisted per-user in Firestore with localStorage cache for instant restore
- **Collapsible sidebar** — toggle the sidebar to reveal a full-screen map; smooth CSS transition
- **Geocoding** — search for any location in France (Nominatim) to pan the map
- **Geolocate** — jump to your current GPS position
- **AI company overview** — agent-style AI analysis of any establishment using Gemini with Google Search grounding, streamed in real time

## Tech Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript)                     |
| Styling     | Tailwind CSS 3                                          |
| Map         | Leaflet + react-leaflet + leaflet-draw + leaflet.markercluster |
| Auth        | Firebase Authentication (Google + email/password)       |
| User data   | Cloud Firestore (preferences, saved searches)           |
| Geo queries | Cloud SQL (PostgreSQL 15) + PostGIS                     |
| Fallback    | In-memory CSV with Turf.js point-in-polygon             |
| AI          | Vertex AI (Gemini 2.0 Flash) + Google Search grounding    |
| Hosting     | Firebase App Hosting                                    |

## Architecture

```
Browser ──▶ Next.js App (React + Leaflet)
               │
               ├──▶ /api/search (POST)  ──▶ PostGIS (ST_Contains)  ◀── Cloud SQL
               │                        └──▶ CSV fallback (Turf.js)
               │
               ├──▶ Firebase Auth
               ├──▶ Cloud Firestore (user prefs & saved searches)
               └──▶ Vertex AI / Gemini (AI company overview)
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
            match /savedSearches/{docId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            match /aiOverviews/{docId} {
              allow read: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
      }
      ```

4. **Set up Stripe** *(optional — required for paid tiers)*:

   1. Create a free account at [dashboard.stripe.com](https://dashboard.stripe.com).
   2. In **Products**, create two products: **Individual** and **Enterprise**. For each, add two prices (monthly + yearly recurring).
   3. Copy the **price IDs** (they start with `price_...`, not `prod_...`) into `.env.local`:
      ```
      STRIPE_SECRET_KEY=sk_test_...
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
      STRIPE_WEBHOOK_SECRET=whsec_...
      STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_...
      STRIPE_PRICE_INDIVIDUAL_YEARLY=price_...
      STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY=price_...
      STRIPE_PRICE_ENTERPRISE_SEAT_YEARLY=price_...
      ```
   4. In **Developers → Webhooks**, add a destination pointing to `https://your-domain/api/stripe/webhook`.
      - Account: **Your account**
      - Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
      - Copy the **signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

5. **Set up the database (PostGIS):**

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

### Enable AI Overview (Vertex AI + Google Search Grounding)

The AI company overview feature uses **Vertex AI Gemini** with **Google Search grounding** to produce live, sourced intelligence about any company. This section walks through every step needed to get it running in production and locally.

#### Prerequisites

- A GCP project with billing enabled (Vertex AI is a paid API; Gemini Flash pricing is ~$0.075 / 1M input tokens).
- The `gcloud` CLI installed and authenticated (`gcloud auth login`).
- Your Firebase App Hosting backend already created (see the deployment section above).

#### Step 1 — Enable the Vertex AI API

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable Vertex AI (includes Gemini model access)
gcloud services enable aiplatform.googleapis.com
```

This single API covers both the Gemini model family and the Google Search grounding tool — no separate "grounding API" needs to be enabled.

#### Step 2 — Choose a region

Vertex AI endpoints are regional. Pick the region closest to your users and your Cloud SQL instance:

| Region | Location |
|--------|----------|
| `europe-west1` | Belgium (default) |
| `europe-west4` | Netherlands |
| `us-central1` | Iowa |
| `asia-northeast1` | Tokyo |

The full list is at [Vertex AI locations](https://cloud.google.com/vertex-ai/docs/general/locations). Set the chosen region as `GCP_LOCATION`.

#### Step 3 — Set environment variables

Add the following to `apphosting.yaml`:

```yaml
env:
  - variable: GCP_PROJECT_ID
    value: your-gcp-project-id
  - variable: GCP_LOCATION
    value: europe-west4          # must match Step 2
  # Optional — defaults to gemini-2.0-flash
  - variable: GEMINI_MODEL
    value: gemini-2.0-flash
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT_ID` | **Yes** | — | Your GCP project ID |
| `GCP_LOCATION` | No | `europe-west1` | Vertex AI region |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model name |

#### Step 4 — Grant IAM permissions to the App Hosting service account

Firebase App Hosting runs your Next.js server under a dedicated service account. It needs the **Vertex AI User** role to call the Gemini API.

```bash
# 1. Find the service account email.
#    It is shown during `firebase apphosting:backends:create`.
#    The format is: firebase-app-hosting-compute@<PROJECT_ID>.iam.gserviceaccount.com

SA="firebase-app-hosting-compute@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# 2. Grant the role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/aiplatform.user"
```

If you use a custom service account, replace the email accordingly.

#### Step 5 — Local development setup

Locally, the Vertex AI SDK authenticates through **Application Default Credentials (ADC)**.

```bash
# 1. Log in with your personal Google account
gcloud auth application-default login

# 2. Set the quota project (so usage is billed to the right project)
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

Then add to `.env.local`:

```env
GCP_PROJECT_ID=your-gcp-project-id
# GCP_LOCATION=europe-west1   (optional, defaults to europe-west1)
# GEMINI_MODEL=gemini-2.0-flash (optional)
```

Start the dev server with `npm run dev` and the AI overview button will be functional.

#### Step 6 — Verify it works

1. Open the app and draw an area to load companies.
2. Click a company row → **Company detail modal** opens.
3. Click the **AI Overview** button at the bottom.
4. You should see the agent steps animate ("Analyzing…", "Searching…", "Generating…") and a streamed markdown report appear.

If you get a 503 error, check that `GCP_PROJECT_ID` is set. If you get a permission error, double-check the IAM binding from Step 4.

#### Step 7 — Monitor usage and costs

Vertex AI usage appears in the GCP console under **Vertex AI → Overview → Usage**. You can also set budget alerts:

```bash
# View recent Gemini API calls
gcloud logging read 'resource.type="aiplatform.googleapis.com/Endpoint"' \
  --project=YOUR_PROJECT_ID --limit=20 --format=json
```

Gemini 2.0 Flash pricing (as of March 2026):
- Input: ~$0.075 / 1M tokens
- Output: ~$0.30 / 1M tokens
- Google Search grounding: billed per grounded request (~$35 / 1K requests)

Set up a [GCP budget alert](https://console.cloud.google.com/billing/budgets) to avoid surprises.

#### How it works (architecture)

```
User clicks "AI Overview"
  → Frontend streams from POST /api/ai-overview (SSE)
    → Server verifies Firebase auth token
    → Builds prompt from all 104 SIRENE fields + GPS coordinates
    → Calls Vertex AI Gemini with Google Search grounding enabled
    → Gemini autonomously decides whether to search Google
    → Response is streamed back as Server-Sent Events
      • step events  (agent progress indicators)
      • chunk events (incremental markdown text)
      • done event   (final text + list of search queries used)
```

The model receives the full SIRENE record and is instructed to search for: company website, Google Maps profile, leadership contacts, general contact info, recent news, and financial signals. Google Search grounding lets the model access live web data without a separate search API.

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
- [x] Add more export formats
- [x] Geocoding search bar
- [x] PostGIS backend for full-dataset performance
- [x] Deploy via Firebase App Hosting
- [x] Increase result cap beyond 5 000 — now up to 50,000 results (individual plan)
- [x] Cluster map pins for performance with large result sets
- [x] Audit and fix all quick filter labels
- [x] Add possibility to create custom filter labels
- [x] Add pre-search labels to filter results in the back-end
- [x] Improve Loading elements (while querying and loading user data)
- [x] Create company dashboard (seats/permissions management, org settings)
- [x] Add AI overview
- [x] Set up custom domain (publicdatamaps.com) with Firebase App Hosting, Resend, and Stripe
- [x] Create landing page
- [x] AND/OR logic between filters
- [x] Default pre-search quick filters
- [x] Default hidden fields (keep only most relevant ones)
- [x] Split settings modal into "Settings" and "Data Settings" sections
- [ ] Import full SIRENE dataset into Cloud SQL + Create indexes on pre-search quick filters
- [ ] Create private CRM dashboard
- [ ] Add more auth features (forgot passsword, SSO sign-in, company sign in)
- [ ] Add other data types beyond companies (e.g. schools, health facilities)
- [ ] Mobile-responsive layout
