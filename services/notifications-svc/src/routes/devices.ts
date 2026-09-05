import { Router } from "express";
import { z } from "zod";
import { registerDevice, removeDevice } from "../services/device-service";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth-middleware";

export const devicesRouter = Router();

const registerSchema = z.object({ fcmToken: z.string().min(1) });

devicesRouter.post(
  "/devices/register",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { tokenId } = await registerDevice(req.auth!.uid, parsed.data.fcmToken);
    return res.status(201).json({ ok: true, tokenId });
  }),
);

devicesRouter.delete(
  "/devices/:tokenId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await removeDevice(req.auth!.uid, req.params.tokenId);
    return res.json({ ok: true });
  }),
);
