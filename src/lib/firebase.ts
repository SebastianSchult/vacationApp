// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";

// .env laden
const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
};

// optional: Debug
console.log("FB cfg", cfg);

// Singleton-App holen/erstellen (verhindert doppelte Inits bei HMR)
const app = getApps().length ? getApp() : initializeApp(cfg);

export const auth = getAuth(app);

// **WICHTIG**: Firestore **Lite**
export const db = getFirestore(app);
