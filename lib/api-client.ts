import { auth } from "./firebase-client";

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("No hay sesión activa.");
  }

  // FormData (ej. subida de archivos) necesita que el navegador fije su propio
  // Content-Type con el boundary del multipart — forzar application/json lo rompe.
  const isFormData = init.body instanceof FormData;

  return fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${idToken}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
}

export async function authFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  const body = await res.json();
  if (!res.ok) {
    const message = typeof body?.error === "string" ? body.error : JSON.stringify(body?.error ?? body);
    throw new Error(message);
  }
  return body as T;
}
