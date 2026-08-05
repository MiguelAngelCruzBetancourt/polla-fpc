function securityApiUrl(): string {
  const base = process.env.SECURITY_API_URL;
  if (!base) throw new Error("Falta la variable de entorno SECURITY_API_URL");
  return base;
}

export interface VerifyResult {
  uid: string;
  roles: { resultsAdmin: boolean };
  internalToken: string;
}

/** business-api ya no verifica tokens de Firebase directamente — delega en security-api. */
export async function verifyWithSecurityApi(firebaseIdToken: string): Promise<VerifyResult | null> {
  const res = await fetch(`${securityApiUrl()}/internal/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${firebaseIdToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as VerifyResult;
}

export async function checkRateLimitWithSecurityApi(
  uid: string,
  minIntervalMs?: number,
): Promise<boolean> {
  const res = await fetch(`${securityApiUrl()}/internal/rate-limit/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, minIntervalMs }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { allowed: boolean };
  return data.allowed === true;
}

export interface UserLookupResult {
  email: string;
  uid: string;
  displayName: string;
}

export async function lookupUsersByEmail(emails: string[]): Promise<UserLookupResult[]> {
  if (emails.length === 0) return [];
  const res = await fetch(
    `${securityApiUrl()}/internal/users/lookup?emails=${encodeURIComponent(emails.join(","))}`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { users: UserLookupResult[] };
  return data.users ?? [];
}
