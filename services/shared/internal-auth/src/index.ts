import { SignJWT, jwtVerify } from "jose";

export type InternalTokenScope = "user" | "service";

export interface InternalTokenPayload {
  sub: string; // uid del usuario, o "service:<nombre>" para llamadas servicio-a-servicio
  scope: InternalTokenScope;
  roles?: Record<string, boolean>; // ej. { resultsAdmin: true }
}

const ISSUER = "security-api";
const DEFAULT_EXPIRATION = "15m";

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function issueInternalToken(
  payload: InternalTokenPayload,
  secret: string,
  expiresIn: string = DEFAULT_EXPIRATION,
): Promise<string> {
  return new SignJWT({ scope: payload.scope, roles: payload.roles ?? {} })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey(secret));
}

export async function verifyInternalToken(
  token: string,
  secret: string,
): Promise<InternalTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret), { issuer: ISSUER });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      scope: payload.scope as InternalTokenScope,
      roles: (payload.roles as Record<string, boolean>) ?? {},
    };
  } catch {
    return null;
  }
}
