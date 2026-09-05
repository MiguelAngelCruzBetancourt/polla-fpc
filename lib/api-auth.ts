import { adminAuth } from "./firebase-admin";

export interface AuthContext {
  uid: string;
  resultsAdmin: boolean;
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const idToken = header.slice("Bearer ".length);
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, resultsAdmin: decoded.resultsAdmin === true };
  } catch {
    return null;
  }
}
