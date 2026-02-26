# Public Data Maps (France)

This is a full-stack web app that allows users to draw a custom area on a map of France and get a list of all company headquarters located inside that area. This project is open source and we welcome contributions!

## Contributing

We welcome contributions of all kinds! Please feel free to open an issue or submit a pull request.

## Getting Started (for Contributors)

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have Node.js and npm installed on your machine. You will also need a Google account for Firebase.

### Installation & Setup

1.  **Fork the repository** and clone it to your local machine.

2.  **Install NPM packages:**
    ```bash
    npm install
    ```

3.  **Set up your own Firebase Project:**
    This project uses Firebase for user authentication and for saving drawn areas. You will need to create your own free Firebase project to run the app locally.

    1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    2.  In your new project, go to **Project Settings** (click the gear icon) and select **Add app**, choosing the **Web** platform.
    3.  Copy the `firebaseConfig` object provided.
    4.  Now, in your local project code, create your credentials file by copying the example:
        ```bash
        cp src/lib/firebase.example.ts src/lib/firebase.ts
        ```
        *(Note: `src/lib/firebase.ts` is ignored by Git, so your private keys will not be committed.)*
    5.  Paste your `firebaseConfig` object into the newly created `src/lib/firebase.ts`, replacing the placeholder values.
    6.  In the Firebase console, go to the **Authentication** section and enable the **Google** sign-in provider.
    7.  In the Firebase console, go to the **Firestore Database** section and create a database. Start in **test mode** for now, which allows open access for development.

4.  **Set up the data file:**
    A sample dataset (`data/sample.csv`) is included in the repository so you can run the app immediately. Note that the **sample data has empty company names**, so you'll see SIRET numbers instead. If you want to see actual company names, download the **entire SIRENE dataset (9.72 GB)** from Zenodo:

    > **Dataset:** [https://zenodo.org/records/18776020](https://zenodo.org/records/18776020)
    > **DOI:** [https://doi.org/10.5281/zenodo.18776020](https://doi.org/10.5281/zenodo.18776020)

    Once downloaded, replace `data/sample.csv` with the full file. The app will automatically load it on the first request (note: initial load time will be longer with the full dataset).

5.  **Run the development server:**
    ```bash
    npm run dev
    ```

6.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You should be able to log in with your Google account and save areas on the map.

## Project Roadmap

Here are some areas where you can contribute:

- [x] Plug in the real SIRENE data source for company data (CSV-based, see dataset section above).
- [ ] Migrate to a PostGIS database for better performance with the full dataset.
- [ ] Implement the search functionality to query the company database in addition to just locations.
- [x] Add filters
- [x] Fix area saving when logged in
- [x] Improve UI/UX
- [ ] Add other data types (currently only companies)
- [ ] Deploy the app to a hosting service like Vercel or Firebase Hosting.
