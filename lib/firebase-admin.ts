import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

/**
 * La clave privada de la service account viaja por variables de entorno, y cada
 * proveedor/UI la maltrata distinto: unos la guardan con `\n` literales, otros
 * con saltos reales, otros la envuelven en comillas o duplican los backslashes
 * al pegarla. Si algo de eso sobrevive hasta `cert()`, OpenSSL falla con un
 * críptico `DECODER routines::unsupported`. Acá se normaliza todo a un PEM
 * válido antes de intentar usarlo.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Comillas envolventes (típico al copiar el valor desde un .env).
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // `\\n` (backslash escapado al pegar en una UI) y luego `\n` literal.
  key = key.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
  // Saltos de Windows.
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return key.trim() + "\n";
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0]!;

  // Contra el Firebase Emulator Suite las credenciales no se validan — basta con el projectId.
  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (usingEmulator) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    return initializeApp({ projectId });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      "Faltan variables de entorno de Firebase Admin (FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)",
    );
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);

  // Falla temprano y con un mensaje accionable: sin esto, una clave truncada o
  // mal pegada solo produce "DECODER routines::unsupported" desde OpenSSL, que
  // no dice nada sobre qué revisar. No se loguea la clave, solo su forma.
  if (
    !privateKey.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.endsWith("-----END PRIVATE KEY-----\n")
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY no tiene formato PEM válido: debe empezar con " +
        "-----BEGIN PRIVATE KEY----- y terminar con -----END PRIVATE KEY-----. " +
        `Recibido: ${privateKey.length} caracteres, empieza con "${privateKey.slice(0, 28)}". ` +
        "Suele ser un pegado truncado o con comillas de más.",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
// Envío de notificaciones push (FCM) — usado por lib/server/notification-service.ts.
export const adminMessaging = () => getMessaging(getAdminApp());
