import { adminDb } from "../infrastructure/firebase-admin";

export interface UserLookupResult {
  email: string;
  uid: string;
  displayName: string;
}

/**
 * Resuelve email -> {uid, displayName}. Reemplaza la lectura cross-dominio que
 * hoy hace lib/bonus-points-service.ts::resolveBonusRows directo a la colección
 * "users" — con la separación de servicios, "users" es propiedad exclusiva de
 * security-api, así que business-api debe pasar por este endpoint.
 */
export async function lookupUsersByEmail(emails: string[]): Promise<UserLookupResult[]> {
  const normalized = new Set(emails.map((e) => e.toLowerCase()));
  if (normalized.size === 0) return [];

  const usersSnap = await adminDb().collection("users").get();
  const results: UserLookupResult[] = [];

  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    const email = String(data.email ?? "").toLowerCase();
    if (normalized.has(email)) {
      results.push({ email, uid: doc.id, displayName: data.displayName });
    }
  });

  return results;
}
