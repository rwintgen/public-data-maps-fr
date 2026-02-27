/**
 * Firebase client SDK initialization.
 * Config values are safe to expose — Firebase security is enforced
 * server-side via Auth + Firestore security rules.
 */
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWZIge8FLfkN2agQFVtfl7plK-cvvlK6k",
  authDomain: "project-95adcfa2-64d3-4f79-be3.firebaseapp.com",
  projectId: "project-95adcfa2-64d3-4f79-be3",
  storageBucket: "project-95adcfa2-64d3-4f79-be3.firebasestorage.app",
  messagingSenderId: "1026058192278",
  appId: "1:1026058192278:web:1df72ec83115ee83b549b7"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
