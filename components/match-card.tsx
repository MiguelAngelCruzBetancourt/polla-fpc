"use client";

import dayjs from "dayjs";
import "dayjs/locale/es";
import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { AuditFeed } from "@/components/audit-feed";
import { PredictionForm } from "@/components/prediction-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TeamCrest } from "@/components/ui/team-crest";
import { getDisplayStatus, type DisplayStatus } from "@/lib/match-status";
import type { MatchDoc, PredictionDoc } from "@/lib/types";

dayjs.locale("es");

const STATUS_META: Record<
  DisplayStatus,
  { label: string; variant: "info" | "warning" | "success" | "error" | "accent"; icon: typeof Clock }
> = {
  scheduled: { label: "Por pronosticar", variant: "info", icon: Clock },
  locked: { label: "Cerrado", variant: "warning", icon: Lock },
  revealed: { label: "Revelado", variant: "accent", icon: CheckCircle2 },
  finished: { label: "Finalizado", variant: "success", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", variant: "error", icon: XCircle },
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
  const status = STATUS_META[displayStatus];
  const StatusIcon = status.icon;

  return (
    <Card className="animate-in">
      <CardHeader className="items-start">
        <div className="flex items-center gap-3">
          <TeamCrest teamName={match.homeTeam} />
          <div>
            <p className="font-medium text-text">
              {match.homeTeam} vs {match.awayTeam}
            </p>
            <p className="text-xs text-text-muted">
              Jornada {match.jornada} · {dayjs(match.kickoff.toDate()).format("ddd D MMM, h:mm A")}
            </p>
          </div>
          <TeamCrest teamName={match.awayTeam} />
        </div>
        <Badge variant={status.variant} icon={<StatusIcon size={12} />}>
          {status.label}
        </Badge>
      </CardHeader>

      <CardBody>
        {displayStatus === "cancelled" && (
          <p className="text-sm text-text-muted">Cancelado — no cuenta para la calificación.</p>
        )}

        {displayStatus === "scheduled" && (
          <div>
            <PredictionForm
              matchId={match.id}
              initialHomeScore={myPrediction?.homeScore}
              initialAwayScore={myPrediction?.awayScore}
              onSubmitted={onPredictionSubmitted}
            />
            {myPrediction && (
              <p className="mt-1 text-xs text-text-muted">
                Puedes corregirlo mientras el partido siga abierto.
              </p>
            )}
          </div>
        )}

        {displayStatus === "locked" && (
          <div>
            {myPrediction ? (
              <p className="text-sm text-text-muted">
                Tu pronóstico: {myPrediction.homeScore} - {myPrediction.awayScore}
              </p>
            ) : (
              <p className="text-sm text-text-muted">No enviaste tu pronóstico a tiempo.</p>
            )}
            <p className="mt-1 text-xs text-text-muted">Los pronósticos de los demás se revelan pronto.</p>
          </div>
        )}

        {(displayStatus === "revealed" || displayStatus === "finished") && (
          <div className="flex flex-col gap-1">
            {displayStatus === "finished" && (
              <p className="text-sm font-medium text-text">
                Marcador oficial: {match.officialHomeScore} - {match.officialAwayScore}
              </p>
            )}
            {revealedPredictions === null && (
              <p className="text-sm text-text-muted">Cargando pronósticos…</p>
            )}
            {revealedPredictions?.length === 0 && (
              <p className="text-sm text-text-muted">Nadie pronosticó este partido.</p>
            )}
            {revealedPredictions?.map((p) => (
              <div key={p.uid} className="flex items-center justify-between text-sm">
                <span className={p.uid === currentUid ? "font-medium text-text" : "text-text-muted"}>
                  {p.displayName}
                </span>
                <span className="text-text-muted">
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
      </CardBody>
    </Card>
  );
}
