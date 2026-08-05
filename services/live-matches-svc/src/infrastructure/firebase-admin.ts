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

// Único dueño de escritura de liveMatchesConfig y matchMappings. Nunca
// escribe en "matches" — eso se hace vía business-client.ts, respetando el
// principio "single writer" descrito en el plan de migración.
export const adminDb = () => getFirestore(getAdminApp());
