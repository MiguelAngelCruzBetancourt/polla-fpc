import { Router } from "express";
import { z } from "zod";
import { checkRateLimit } from "../services/rate-limit-service";

export const rateLimitRouter = Router();

const bodySchema = z.object({
  uid: z.string().min(1),
  minIntervalMs: z.number().int().positive().optional(),
});

rateLimitRouter.post("/internal/rate-limit/check", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { allowed } = await checkRateLimit(parsed.data.uid, parsed.data.minIntervalMs);
  return res.json({ allowed });
});
