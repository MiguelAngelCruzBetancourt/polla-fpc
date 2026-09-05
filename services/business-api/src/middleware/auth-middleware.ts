import type { NextFunction, Request, Response } from "express";
import { verifyWithSecurityApi } from "../infrastructure/security-client";

export interface AuthContext {
  uid: string;
  resultsAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  // No usar asyncHandler aquí porque este middleware corre antes de la ruta —
  // un error de red/config hacia security-api no debe tumbar todo el proceso.
  let result;
  try {
    result = await verifyWithSecurityApi(header.slice("Bearer ".length));
  } catch (err) {
    next(err);
    return;
  }

  if (!result) {
    res.status(401).json({ error: "Token inválido o expirado." });
    return;
  }

  req.auth = { uid: result.uid, resultsAdmin: result.roles.resultsAdmin === true };
  next();
}

export function requireResultsAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.resultsAdmin) {
    res.status(403).json({ error: "No tienes permiso de admin de resultados." });
    return;
  }
  next();
}
