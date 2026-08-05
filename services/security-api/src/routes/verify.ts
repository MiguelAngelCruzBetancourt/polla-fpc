import { Router } from "express";
import { verifyFirebaseIdToken } from "../services/auth-service";
import { issueUserToken } from "../services/token-service";

export const verifyRouter = Router();

/**
 * Reemplaza las llamadas directas a adminAuth().verifyIdToken() que hoy hace
 * cada API route de negocio (lib/api-auth.ts::getAuthContext). Recibe el
 * Firebase ID token del usuario y devuelve su identidad + un JWT interno de
 * corta duración que los demás servicios pueden verificar sin llamar aquí.
 */
verifyRouter.post("/internal/verify", async (req, res) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado." });
  }

  const idToken = header.slice("Bearer ".length);
  const auth = await verifyFirebaseIdToken(idToken);
  if (!auth) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }

  const internalToken = await issueUserToken(auth.uid, { resultsAdmin: auth.resultsAdmin });
  return res.json({ uid: auth.uid, roles: { resultsAdmin: auth.resultsAdmin }, internalToken });
});
