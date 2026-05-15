import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env";

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

function getDefaultServiceAccountPath() {
  return fileURLToPath(new URL("../../intimate_service_acc.json", import.meta.url));
}

function getCredentialsFromServiceAccountFile(): FirebaseAdminCredentials | null {
  const candidatePath = env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : getDefaultServiceAccountPath();

  if (!existsSync(candidatePath)) return null;

  const raw = readFileSync(candidatePath, "utf8");
  const parsed = JSON.parse(raw) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
    storage_bucket?: string;
  };

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      `Service account file is missing one or more required fields at ${candidatePath}.`,
    );
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: normalizePrivateKey(parsed.private_key),
    storageBucket: env.FIREBASE_STORAGE_BUCKET || parsed.storage_bucket,
  };
}

let firebaseCredentials: FirebaseAdminCredentials | null = null;

try {
  firebaseCredentials = getCredentialsFromEnv() ?? getCredentialsFromServiceAccountFile();
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
