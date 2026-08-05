import { issueInternalToken } from "@polla-fpc/internal-auth";

function getSecret(): string {
  const secret = process.env.INTERNAL_AUTH_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno INTERNAL_AUTH_SECRET");
  return secret;
}

export function issueUserToken(uid: string, roles: Record<string, boolean>): Promise<string> {
  return issueInternalToken({ sub: uid, scope: "user", roles }, getSecret());
}

export function issueServiceToken(serviceName: string): Promise<string> {
  return issueInternalToken({ sub: `service:${serviceName}`, scope: "service" }, getSecret());
}
