import { predictionSchema } from "@polla-fpc/shared-schemas";
import { Router } from "express";
import { adminDb } from "../infrastructure/firebase-admin";
import { checkRateLimitWithSecurityApi } from "../infrastructure/security-client";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth-middleware";
import { MatchServiceError } from "../domain/errors";
import { submitPredictionService } from "../services/predictions-service";

export const predictionsRouter = Router();

predictionsRouter.post(
  "/predictions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = await checkRateLimitWithSecurityApi(req.auth!.uid);
    if (!allowed) {
      return res.status(429).json({ error: "Estás enviando solicitudes demasiado rápido." });
    }

    const parsed = predictionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      await submitPredictionService(adminDb(), req.auth!.uid, parsed.data);
      return res.status(201).json({ ok: true });
    } catch (err) {
      if (err instanceof MatchServiceError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }),
);
