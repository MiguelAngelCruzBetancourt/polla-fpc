import { Router } from "express";
import { z } from "zod";
import { adminDb } from "../infrastructure/firebase-admin";
import { asyncHandler } from "../middleware/async-handler";
import { MatchServiceError } from "../domain/errors";
import { updateLiveScoreService } from "../services/matches-service";

export const internalRouter = Router();

const liveUpdateSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

/**
 * Consumido solo por live-matches-svc — nunca por el frontend. En este
 * scaffold local no valida identidad de servicio todavía (ver Fase 5 del
 * plan: JWT interno con scope "service:live-matches"); mientras tanto es
 * responsabilidad de la red local/entorno de despliegue restringir el acceso.
 */
internalRouter.post(
  "/internal/matches/:matchId/live-update",
  asyncHandler(async (req, res) => {
    const parsed = liveUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      await updateLiveScoreService(
        adminDb(),
        req.params.matchId,
        parsed.data.homeScore,
        parsed.data.awayScore,
      );
      return res.json({ ok: true });
    } catch (err) {
      if (err instanceof MatchServiceError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }),
);
