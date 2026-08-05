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

export async function verifyWithSecurityApi(firebaseIdToken: string): Promise<VerifyResult | null> {
  const res = await fetch(`${securityApiUrl()}/internal/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${firebaseIdToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as VerifyResult;
}
