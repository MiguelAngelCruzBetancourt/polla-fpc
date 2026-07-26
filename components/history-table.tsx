import dayjs from "dayjs";
import type { MatchDoc, PredictionDoc } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamCrest } from "@/components/ui/team-crest";

export interface HistoryRow {
  prediction: PredictionDoc;
  match: MatchDoc;
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">Todavía no has pronosticado ningún partido.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ prediction, match }) => (
        <Card key={prediction.matchId} className="flex flex-row items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <TeamCrest teamName={match.homeTeam} size="sm" />
            <div>
              <p className="font-medium text-text">
                {match.homeTeam} vs {match.awayTeam}
              </p>
              <p className="text-xs text-text-muted">{dayjs(match.kickoff.toDate()).format("D MMM YYYY, h:mm A")}</p>
              <p className="text-xs text-text-muted">
                Mi pronóstico: {prediction.homeScore} - {prediction.awayScore}
              </p>
            </div>
            <TeamCrest teamName={match.awayTeam} size="sm" />
          </div>
          <div className="text-right text-sm">
            {match.status === "cancelled" && <Badge variant="neutral">Cancelado — no contó</Badge>}
            {match.status === "finished" && (
              <>
                <p className="text-text-muted">
                  Real: {match.officialHomeScore} - {match.officialAwayScore}
                </p>
                <Badge variant={prediction.points && prediction.points > 0 ? "success" : "neutral"}>
                  {prediction.points} pts
                </Badge>
              </>
            )}
            {match.status !== "finished" && match.status !== "cancelled" && (
              <Badge variant="info">Pendiente</Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
