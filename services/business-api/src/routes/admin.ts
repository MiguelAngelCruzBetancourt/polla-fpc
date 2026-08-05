import { Router } from "express";
import multer from "multer";
import { parseBonusPointsFile } from "../domain/bonus-points";
import { applyBonusPoints, resolveBonusRows } from "../services/bonus-points-service";
import { adminDb } from "../infrastructure/firebase-admin";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth, requireResultsAdmin } from "../middleware/auth-middleware";

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

adminRouter.post(
  "/admin/bonus-points",
  requireAuth,
  requireResultsAdmin,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { roomId, mode } = req.body as { roomId?: string; mode?: string };

    if (typeof roomId !== "string" || !roomId) {
      return res.status(400).json({ error: "Falta roomId." });
    }
    if (mode !== "preview" && mode !== "apply") {
      return res.status(400).json({ error: 'mode debe ser "preview" o "apply".' });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo .xlsx." });
    }

    let rows;
    try {
      rows = parseBonusPointsFile(req.file.buffer);
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : "No se pudo leer el archivo.",
      });
    }

    const db = adminDb();
    const resolved = await resolveBonusRows(db, roomId, rows);

    if (mode === "apply") {
      const { applied } = await applyBonusPoints(db, req.auth!.uid, roomId, resolved);
      return res.json({ ok: true, mode: "apply", rows: resolved, applied });
    }

    return res.json({ ok: true, mode: "preview", rows: resolved });
  }),
);
