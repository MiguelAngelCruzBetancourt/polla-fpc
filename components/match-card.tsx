"use client";

import dayjs from "dayjs";
import "dayjs/locale/es";
import { AuditFeed } from "@/components/audit-feed";
import { PredictionForm } from "@/components/prediction-form";
import { getDisplayStatus } from "@/lib/match-status";
import type { MatchDoc, PredictionDoc } from "@/lib/types";

dayjs.locale("es");

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Por pronosticar",
  locked: "Cerrado",
  revealed: "Revelado",
  finished: "Finalizado",
  cancelled: "Cancelado",
};

export interface RevealedPrediction {
  uid: string;
  displayName: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
}

export function MatchCard({
  match,
  myPrediction,
  revealedPredictions,
  currentUid,
  onPredictionSubmitted,
}: {
  match: MatchDoc & { id: string };
  myPrediction: (PredictionDoc & { id: string }) | null;
  revealedPredictions: RevealedPrediction[] | null;
  currentUid: string;
  onPredictionSubmitted: () => void;
}) {
  const displayStatus = getDisplayStatus(match);

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {match.homeTeam} vs {match.awayTeam}
          </p>
          <p className="text-xs text-slate-500">
            Jornada {match.jornada} · {dayjs(match.kickoff.toDate()).format("ddd D MMM, h:mm A")}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {STATUS_LABEL[displayStatus]}
        </span>
      </div>

      {displayStatus === "cancelled" && (
        <p className="mt-3 text-sm text-slate-500">Cancelado — no cuenta para la calificación.</p>
      )}

      {displayStatus === "scheduled" && (
        <div className="mt-3">
          {myPrediction ? (
            <p className="text-sm text-slate-600">
              Tu pronóstico: {myPrediction.homeScore} - {myPrediction.awayScore}
            </p>
          ) : (
            <PredictionForm matchId={match.id} onSubmitted={onPredictionSubmitted} />
          )}
        </div>
      )}

      {displayStatus === "locked" && (
        <div className="mt-3">
          {myPrediction ? (
            <p className="text-sm text-slate-600">
              Tu pronóstico: {myPrediction.homeScore} - {myPrediction.awayScore}
            </p>
          ) : (
            <p className="text-sm text-slate-500">No enviaste tu pronóstico a tiempo.</p>
          )}
          <p className="mt-1 text-xs text-slate-400">Los pronósticos de los demás se revelan pronto.</p>
        </div>
      )}

      {(displayStatus === "revealed" || displayStatus === "finished") && (
        <div className="mt-3 flex flex-col gap-1">
          {displayStatus === "finished" && (
            <p className="text-sm font-medium text-slate-900">
              Marcador oficial: {match.officialHomeScore} - {match.officialAwayScore}
            </p>
          )}
          {revealedPredictions === null && (
            <p className="text-sm text-slate-500">Cargando pronósticos…</p>
          )}
          {revealedPredictions?.length === 0 && (
            <p className="text-sm text-slate-500">Nadie pronosticó este partido.</p>
          )}
          {revealedPredictions?.map((p) => (
            <div key={p.uid} className="flex items-center justify-between text-sm">
              <span className={p.uid === currentUid ? "font-medium text-slate-900" : "text-slate-600"}>
                {p.displayName}
              </span>
              <span className="text-slate-600">
                {p.homeScore} - {p.awayScore}
                {displayStatus === "finished" && p.points !== null && ` (${p.points} pts)`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <AuditFeed targetType="match" targetId={match.id} />
      </div>
    </div>
  );
}
