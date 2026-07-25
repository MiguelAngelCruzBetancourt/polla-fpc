"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authFetchJson } from "@/lib/api-client";

export function PredictionForm({
  matchId,
  onSubmitted,
}: {
  matchId: string;
  onSubmitted: () => void;
}) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const home = Number(homeScore);
    const away = Number(awayScore);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      setError("Ingresa marcadores válidos (0 o más).");
      return;
    }

    setSubmitting(true);
    try {
      await authFetchJson("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el pronóstico.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Local</label>
        <input
          type="number"
          min={0}
          max={20}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="h-11 w-16 rounded-lg border border-slate-300 text-center"
          required
        />
      </div>
      <span className="pb-3 text-slate-400">-</span>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Visitante</label>
        <input
          type="number"
          min={0}
          max={20}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="h-11 w-16 rounded-lg border border-slate-300 text-center"
          required
        />
      </div>
      <Button type="submit" disabled={submitting} className="ml-2">
        {submitting ? "Enviando…" : "Enviar"}
      </Button>
      {error && <p className="ml-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
