// Service worker de Firebase Cloud Messaging para notificaciones push en
// background (pestaña/app no enfocada). Se registra con un scope propio
// (/firebase-cloud-messaging-push-scope, ver lib/firebase-messaging.ts) para
// no chocar con el service worker de la PWA (public/sw.js, generado por
// @ducanh2912/next-pwa) que también vive en la raíz.
//
// Los valores de abajo son la misma config pública NEXT_PUBLIC_FIREBASE_* que
// ya viaja en el bundle del cliente — no son secretos, pero este archivo es
// estático (no pasa por el build de Next.js), así que no puede leer
// process.env; si cambian las credenciales del proyecto Firebase, hay que
// actualizarlos acá también.
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCumx3nwCiTgAllKBq02hqqD1JxQarFa0M",
  authDomain: "pollabetplay.firebaseapp.com",
  projectId: "pollabetplay",
  storageBucket: "pollabetplay.firebasestorage.app",
  messagingSenderId: "1077343249386",
  appId: "1:1077343249386:web:0117985b4d793a7e468893",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Polla BetPlay";
  const body = payload.notification?.body ?? "";
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
  });
});
