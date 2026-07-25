"use client";

import dayjs from "dayjs";
import type { MatchDoc, PredictionDoc } from "@/lib/types";

export interface HistoryRow {
  prediction: PredictionDoc;
  match: MatchDoc;
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no has pronosticado ningún partido.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ prediction, match }) => (
        <div
          key={prediction.matchId}
          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
        >
          <div>
            <p className="font-medium text-slate-900">
              {match.homeTeam} vs {match.awayTeam}
            </p>
            <p className="text-xs text-slate-500">{dayjs(match.kickoff.toDate()).format("D MMM YYYY, h:mm A")}</p>
            <p className="text-xs text-slate-500">
              Mi pronóstico: {prediction.homeScore} - {prediction.awayScore}
            </p>
          </div>
          <div className="text-right text-sm">
            {match.status === "cancelled" && <p className="text-slate-500">Cancelado — no contó</p>}
            {match.status === "finished" && (
              <>
                <p className="text-slate-600">
                  Real: {match.officialHomeScore} - {match.officialAwayScore}
                </p>
                <p className="font-medium text-slate-900">{prediction.points} pts</p>
              </>
            )}
            {match.status !== "finished" && match.status !== "cancelled" && (
              <p className="text-slate-500">Pendiente</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
