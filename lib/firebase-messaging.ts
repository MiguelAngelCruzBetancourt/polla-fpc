import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import "./firebase-client"; // asegura que el app de Firebase ya esté inicializado

const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

/**
 * Pide permiso de notificación al navegador y, si lo otorga, registra el
 * service worker dedicado a FCM (scope propio, ver public/firebase-messaging-sw.js)
 * y obtiene el token del dispositivo. Devuelve null si el navegador no
 * soporta push, si el usuario no otorgó el permiso, o si falta la VAPID key.
 */
export async function requestPushToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
    return null;
  }
  if (!(await isSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[firebase-messaging] Falta NEXT_PUBLIC_FIREBASE_VAPID_KEY.");
    return null;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: FCM_SW_SCOPE,
  });

  const messaging = getMessaging();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  return token || null;
}

/** Notificaciones recibidas con la app en foreground (onBackgroundMessage no aplica ahí). */
export function listenForegroundPush(onReceive: (title: string, body: string) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribe = () => {};
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging();
    unsubscribe = onMessage(messaging, (payload) => {
      onReceive(payload.notification?.title ?? "Polla BetPlay", payload.notification?.body ?? "");
    });
  });

  return () => unsubscribe();
}
