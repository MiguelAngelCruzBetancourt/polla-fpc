import { Timestamp } from "firebase-admin/firestore";
import { Router } from "express";
import { z } from "zod";
import { adminDb } from "../infrastructure/firebase-admin";
import { setResultsAdminRole, verifyFirebaseIdToken } from "../services/auth-service";

export const rolesRouter = Router();

const bodySchema = z.object({ resultsAdmin: z.boolean() });

/**
 * Reemplaza el script one-off scripts/set-results-admin.ts con un endpoint
 * auditado. Solo un resultsAdmin existente puede otorgar/revocar el rol —
 * el primer admin del sistema sigue necesitando asignarse manualmente
 * (Firebase console / Admin SDK directo), igual que hoy.
 */
rolesRouter.post("/admin/roles/:uid", async (req, res) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado." });
  }

  const actor = await verifyFirebaseIdToken(header.slice("Bearer ".length));
  if (!actor) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
  if (!actor.resultsAdmin) {
    return res.status(403).json({ error: "No tienes permiso de admin de resultados." });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const targetUid = req.params.uid;
  await setResultsAdminRole(targetUid, parsed.data.resultsAdmin);

  await adminDb()
    .collection("auditLog")
    .add({
      action: "role_changed",
      performedBy: actor.uid,
      performedAt: Timestamp.now(),
      targetType: "system",
      targetId: targetUid,
      details: { resultsAdmin: parsed.data.resultsAdmin },
    });

  return res.json({ ok: true });
});
