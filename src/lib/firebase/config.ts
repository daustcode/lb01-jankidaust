import { initializeApp, getApps, getApp } from "firebase/app";
type FirebaseOptions = Record<string, any>;
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";

// Phase 1: Single source of truth — strictly driven by .env (NEXT_PUBLIC_*).
// No hardcoded project ids, no JSON fallback. Missing values log a loud
// warning so misconfiguration is caught immediately instead of silently
// hitting the wrong Firebase project.
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"] as const;
const missing = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(
    `[firebase/config] Missing required NEXT_PUBLIC_FIREBASE_* env vars: ${missing
      .map((k) => `NEXT_PUBLIC_FIREBASE_${k.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()}`)
      .join(", ")}. Set them in your .env file.`,
  );
}

// Optional: explicit named DB id from env. NEVER pass literal "(default)".
const RAW_DB_ID = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID || "";
const DB_ID = RAW_DB_ID && RAW_DB_ID !== "(default)" ? RAW_DB_ID : "";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/**
 * Firestore with IndexedDB persistence (multi-tab) when in browser.
 * SSR falls back to default in-memory Firestore so imports don't crash.
 * Phase 1: never pass "(default)" — when DB_ID is empty omit the arg entirely.
 */
function createDb() {
  if (typeof window === "undefined") {
    return DB_ID ? getFirestore(app, DB_ID) : getFirestore(app);
  }
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      DB_ID || undefined as any,
    );
  } catch {
    return DB_ID ? getFirestore(app, DB_ID) : getFirestore(app);
  }
}

const db = createDb();

export { app, auth, db };
