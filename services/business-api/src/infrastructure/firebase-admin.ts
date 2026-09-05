import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0]!;

  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (usingEmulator) {
    return initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno de Firebase Admin (FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

// business-api solo necesita Firestore (rooms/matches/predictions/outboxEvents) —
// nunca inicializa adminAuth(), esa es responsabilidad exclusiva de security-api.
export const adminDb = () => getFirestore(getAdminApp());
