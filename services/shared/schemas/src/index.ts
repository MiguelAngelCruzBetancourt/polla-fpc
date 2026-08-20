import { z } from "zod";

export const goalScoreSchema = z.number().int().min(0).max(20);

export const matchInputSchema = z.object({
  jornada: z.number().int().positive(),
  homeTeam: z.string().trim().min(1),
  awayTeam: z.string().trim().min(1),
  kickoff: z.string().datetime({ offset: true }).or(z.string().min(1)), // ISO string
});

export const createMatchesSchema = z.object({
  roomId: z.string().min(1),
  matches: z.array(matchInputSchema).min(1),
});

export const editMatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("edit"),
    homeTeam: z.string().trim().min(1).optional(),
    awayTeam: z.string().trim().min(1).optional(),
    kickoff: z.string().min(1).optional(),
    jornada: z.number().int().positive().optional(),
  }),
  z.object({ action: z.literal("postpone") }),
  z.object({ action: z.literal("reschedule"), kickoff: z.string().min(1) }),
]);

export const resultSchema = z.object({
  homeScore: goalScoreSchema,
  awayScore: goalScoreSchema,
});

export const predictionSchema = z.object({
  matchId: z.string().min(1),
  homeScore: goalScoreSchema,
  awayScore: goalScoreSchema,
});
