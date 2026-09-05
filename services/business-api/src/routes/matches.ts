import { createMatchesSchema, editMatchSchema, resultSchema } from "@polla-fpc/shared-schemas";
import { Router } from "express";
import { adminDb } from "../infrastructure/firebase-admin";
import { requireAuth, requireResultsAdmin } from "../middleware/auth-middleware";
import { asyncHandler } from "../middleware/async-handler";
import { MatchServiceError } from "../domain/errors";
import {
  cancelMatchService,
  createMatchesService,
  gradeMatchResultService,
  postponeMatchService,
  rescheduleMatchService,
  updateMatchService,
} from "../services/matches-service";

export const matchesRouter = Router();

matchesRouter.post(
  "/matches",
  requireAuth,
  requireResultsAdmin,
  asyncHandler(async (req, res) => {
    const parsed = createMatchesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { matchIds } = await createMatchesService(
      adminDb(),
      req.auth!.uid,
      parsed.data.roomId,
      parsed.data.matches,
    );
    return res.status(201).json({ matchIds });
  }),
);

matchesRouter.patch(
  "/matches/:matchId",
  requireAuth,
  requireResultsAdmin,
  asyncHandler(async (req, res) => {
    const parsed = editMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      if (parsed.data.action === "cancel") {
        await cancelMatchService(adminDb(), req.auth!.uid, req.params.matchId);
      } else if (parsed.data.action === "postpone") {
        await postponeMatchService(adminDb(), req.auth!.uid, req.params.matchId);
      } else if (parsed.data.action === "reschedule") {
        await rescheduleMatchService(adminDb(), req.auth!.uid, req.params.matchId, parsed.data.kickoff);
      } else {
        const { action: _action, ...fields } = parsed.data;
        void _action;
        const { changed } = await updateMatchService(adminDb(), req.auth!.uid, req.params.matchId, fields);
        if (!changed) {
          return res.status(400).json({ error: "No se especificó ningún campo a editar." });
        }
      }
      return res.json({ ok: true });
    } catch (err) {
      if (err instanceof MatchServiceError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }),
);

matchesRouter.post(
  "/matches/:matchId/result",
  requireAuth,
  requireResultsAdmin,
  asyncHandler(async (req, res) => {
    const parsed = resultSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const { predictionsGraded } = await gradeMatchResultService(
        adminDb(),
        req.auth!.uid,
        req.params.matchId,
        parsed.data.homeScore,
        parsed.data.awayScore,
      );
      return res.json({ ok: true, predictionsGraded });
    } catch (err) {
      if (err instanceof MatchServiceError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }),
);
