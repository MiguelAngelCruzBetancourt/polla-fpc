import { Router } from "express";
import { z } from "zod";
import { adminDb } from "../infrastructure/firebase-admin";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth-middleware";
import { MatchServiceError } from "../domain/errors";
import { kickMemberService, leaveRoomService } from "../services/rooms-service";

export const roomsRouter = Router();

const kickSchema = z.object({ uid: z.string().min(1) });

roomsRouter.post(
  "/rooms/:roomId/kick",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = kickSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const { newCode } = await kickMemberService(
        adminDb(),
        req.auth!.uid,
        req.auth!.resultsAdmin,
        req.params.roomId,
        parsed.data.uid,
      );
      return res.json({ ok: true, newCode });
    } catch (err) {
      if (err instanceof MatchServiceError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }),
);

roomsRouter.post(
  "/rooms/:roomId/leave",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      await leaveRoomService(adminDb(), req.auth!.uid, req.params.roomId);
      return res.json({ ok: true });
    } catch (err) {
      if (err instanceof MatchServiceError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }),
);
