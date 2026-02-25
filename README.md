
# Sirene Area Companies

This is a full-stack web app that allows users to draw a custom area on a map of France and get a list of all company headquarters located inside that area.

## Running the app locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Connecting to Firebase

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. In your Firebase project, create a new web app.
3. Copy the Firebase configuration object and paste it into `src/lib/firebase.ts`.
4. In your Firebase project, enable Firestore and Google Authentication.

## Plugging in the real SIRENE/PostGIS data source

1. In `src/app/api/search/route.ts`, replace the mock data with a call to your PostGIS database.
2. You will need to use a library like `node-postgres` to connect to your database.
3. The SQL query should look something like this:

   ```sql
   SELECT * FROM companies WHERE ST_Contains(ST_GeomFromGeoJSON('YOUR_GEOJSON'), location);
   ```
