import { adminAuth } from "@/lib/firebase-admin";
import type { AuthContext } from "./auth-types";

/** Equivalente a lib/api-auth.ts::getAuthContext del monolito, pero recibe el idToken ya extraído. */
export async function verifyFirebaseIdToken(idToken: string): Promise<AuthContext | null> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, resultsAdmin: decoded.resultsAdmin === true };
  } catch {
    return null;
  }
}

export async function setResultsAdminRole(uid: string, resultsAdmin: boolean): Promise<void> {
  await adminAuth().setCustomUserClaims(uid, { resultsAdmin });
}
