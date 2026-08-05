import { Router } from "express";
import { z } from "zod";
import { dispatchEvent } from "../services/notification-service";
import { drainOutboxOnce } from "../services/outbox-drain-service";
import { asyncHandler } from "../middleware/async-handler";

export const eventsRouter = Router();

const eventSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

/**
 * Webhook manual descrito en el plan (POST /internal/events) — útil para
 * disparar una notificación sin esperar el próximo drenaje de la outbox, y
 * para pruebas locales. El camino normal en producción es la outbox.
 */
eventsRouter.post(
  "/internal/events",
  asyncHandler(async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    await dispatchEvent(parsed.data.type, parsed.data.payload);
    return res.json({ ok: true });
  }),
);

/** Endpoint de debug para forzar un drenaje inmediato de outboxEvents en local. */
eventsRouter.post(
  "/internal/outbox/drain-now",
  asyncHandler(async (_req, res) => {
    const result = await drainOutboxOnce();
    return res.json({ ok: true, ...result });
  }),
);
