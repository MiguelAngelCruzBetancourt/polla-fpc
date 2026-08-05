import { Router } from "express";
import { z } from "zod";
import { addLeague, listLeagues } from "../services/leagues-service";
import { createMapping, listMappingsForLeague } from "../services/mappings-service";
import { asyncHandler } from "../middleware/async-handler";
import { getProvider } from "../infrastructure/provider";

export const leaguesRouter = Router();

/** Debug/observabilidad — no lo consume el frontend, ver plan de migración. */
leaguesRouter.get(
  "/leagues/:leagueExternalId/matches",
  asyncHandler(async (req, res) => {
    const matches = await getProvider().getMatchesForLeague(req.params.leagueExternalId);
    return res.json({ matches });
  }),
);

const addLeagueSchema = z.object({
  leagueExternalId: z.string().min(1),
  leagueName: z.string().min(1),
});

leaguesRouter.get(
  "/leagues",
  asyncHandler(async (_req, res) => {
    const leagues = await listLeagues();
    return res.json({ leagues });
  }),
);

leaguesRouter.post(
  "/leagues",
  asyncHandler(async (req, res) => {
    const parsed = addLeagueSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const league = await addLeague(parsed.data.leagueExternalId, parsed.data.leagueName);
    return res.status(201).json(league);
  }),
);

const mappingSchema = z.object({
  internalMatchId: z.string().min(1),
  externalMatchId: z.string().min(1),
});

leaguesRouter.post(
  "/leagues/:leagueExternalId/mappings",
  asyncHandler(async (req, res) => {
    const parsed = mappingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const mapping = await createMapping(
      parsed.data.internalMatchId,
      parsed.data.externalMatchId,
      req.params.leagueExternalId,
    );
    return res.status(201).json(mapping);
  }),
);

leaguesRouter.get(
  "/leagues/:leagueExternalId/mappings",
  asyncHandler(async (req, res) => {
    const mappings = await listMappingsForLeague(req.params.leagueExternalId);
    return res.json({ mappings });
  }),
);
