import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { env } from "./env.js";

type FirebaseAdminCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket?: string;
};

let db: Firestore | null = null;
let firebaseInitError: string | null = null;

function normalizePrivateKey(rawKey: string) {
  // Handle keys copied from env providers where values are wrapped or escaped.
  let normalized = rawKey.trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  return normalized;
}

function getCredentialsFromEnv(): FirebaseAdminCredentials | null {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);

  if (privateKey.includes("YOUR_PRIVATE_KEY")) {
    return null;
  }

  return {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  };
}

let firebaseCredentials: FirebaseAdminCredentials | null = null;

try {
  firebaseCredentials = getCredentialsFromEnv();
} catch (error) {
  const reason = error instanceof Error ? error.message : "Unknown Firebase credential error";
  firebaseInitError = `Firebase credential loading failed: ${reason}`;
}

export const firebaseReady = Boolean(firebaseCredentials);

if (firebaseReady) {
  try {
    const credentials = firebaseCredentials!;

    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: credentials.projectId,
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
        }),
        storageBucket: credentials.storageBucket,
      });

    db = getFirestore(app);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Firebase initialization error";
    firebaseInitError = `Firebase initialization failed: ${reason}`;
    db = null;
  }
}

export { db, firebaseInitError };
