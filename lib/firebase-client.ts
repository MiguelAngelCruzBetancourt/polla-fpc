import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Sin configurar, el SDK web usa caché **en memoria**: se pierde en cada recarga
 * y no sirve de nada offline. Con `persistentLocalCache` los datos quedan en
 * IndexedDB entre sesiones, que es lo que importa en móvil con señal
 * intermitente. `persistentMultipleTabManager` evita que una segunda pestaña
 * falle al intentar tomar el lock del caché.
 */
function createDb() {
  // Este módulo también se evalúa en el servidor (Next prerenderiza los client
  // components), donde no existe IndexedDB.
  if (typeof window === "undefined") return getFirestore(app);

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Firestore ya inicializado (hot reload de Next) o almacenamiento no
    // disponible (modo incógnito, cookies bloqueadas): se cae al caché en
    // memoria, que es el comportamiento anterior.
    return getFirestore(app);
  }
}

export const db = createDb();

// Evita reconectar a los emuladores en cada hot-reload de Next.js en desarrollo.
declare global {
  // eslint-disable-next-line no-var
  var __firebaseEmulatorsConnected: boolean | undefined;
}

if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  !globalThis.__firebaseEmulatorsConnected
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalThis.__firebaseEmulatorsConnected = true;
}
