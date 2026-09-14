"use client";

import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import dayjs from "dayjs";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditFeed } from "@/components/audit-feed";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TeamCombobox } from "@/components/ui/team-combobox";
import { TeamCrest } from "@/components/ui/team-crest";
import { TextField } from "@/components/ui/text-field";
import { authFetchJson } from "@/lib/api-client";
import { db } from "@/lib/firebase-client";
import { getDisplayStatus, type DisplayStatus } from "@/lib/match-status";
import { canonicalTeam } from "@/lib/teams";
import type { MatchDoc, RoomDoc } from "@/lib/types";

const ADMIN_STATUS_LABEL: Record<DisplayStatus, string> = {
  scheduled: "Por pronosticar",
  locked: "Cerrado",
  revealed: "Revelado",
  finished: "Finalizado",
  cancelled: "Cancelado",
  postponed: "Aplazado",
};

type MatchWithId = MatchDoc & { id: string };
type RoomWithId = RoomDoc & { id: string };

interface ResolvedBonusRow {
  email: string;
  points: number;
  status: "ok" | "user_not_found" | "not_member" | "invalid_points";
  uid?: string;
  displayName?: string;
}

const BONUS_STATUS_LABEL: Record<ResolvedBonusRow["status"], string> = {
  ok: "OK",
  user_not_found: "Correo no encontrado",
  not_member: "No es miembro de esta sala",
  invalid_points: "Puntos inválidos",
};

interface NewMatchRow {
  id: string;
  jornada: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // datetime-local
}

// Contador de modulo en vez de crypto.randomUUID(): la pagina se pre-renderiza
// en el servidor y un id aleatorio provocaria mismatch de hidratacion.
let rowSeq = 0;

function emptyRow(carry?: Partial<NewMatchRow>): NewMatchRow {
  // El id va despues del spread para que `carry` nunca lo pise.
  return { jornada: "", homeTeam: "", awayTeam: "", kickoff: "", ...carry, id: `row-${rowSeq++}` };
}

export default function AdminResultsPage() {
  const { loading, resultsAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !resultsAdmin) router.replace("/rooms");
  }, [loading, resultsAdmin, router]);

  const [matches, setMatches] = useState<MatchWithId[] | null>(null);
  // Inicializador perezoso: si no, emptyRow() correria en cada render y el
  // contador de ids se desincronizaria entre el render del servidor y el cliente.
  const [rows, setRows] = useState<NewMatchRow[]>(() => [emptyRow()]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomWithId[] | null>(null);
  const [matchRoomId, setMatchRoomId] = useState("");
  const [bonusRoomId, setBonusRoomId] = useState("");
  const [bonusFile, setBonusFile] = useState<File | null>(null);
  const [bonusRows, setBonusRows] = useState<ResolvedBonusRow[] | null>(null);
  const [bonusApplied, setBonusApplied] = useState<number | null>(null);
  const [bonusBusy, setBonusBusy] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);

  const loadMatches = useCallback(async (roomId: string) => {
    if (!roomId) {
      setMatches([]);
      return;
    }
    const snap = await getDocs(
      query(collection(db, "matches"), where("roomId", "==", roomId), orderBy("kickoff", "desc")),
    );
    setMatches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchDoc) })));
  }, []);

  const loadRooms = useCallback(async () => {
    const snap = await getDocs(collection(db, "rooms"));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as RoomDoc) }));
    setRooms(list);
    setMatchRoomId((prev) => prev || list[0]?.id || "");
    setBonusRoomId((prev) => prev || list[0]?.id || "");
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    void loadMatches(matchRoomId);
  }, [loadMatches, matchRoomId]);

  function updateRow(id: string, patch: Partial<NewMatchRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  }

  function addRow() {
    // Un lote suele ser la misma jornada y el mismo fin de semana: heredar
    // ambos campos de la ultima fila ahorra bastante tecleo.
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, emptyRow({ jornada: last?.jornada ?? "", kickoff: last?.kickoff ?? "" })];
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!matchRoomId) return;
    setCreateError(null);

    // Validacion de equipos en cliente: el backend acepta cualquier nombre para
    // no romper partidos historicos, asi que la lista estricta se aplica aqui.
    const invalid: string[] = [];
    for (const [i, row] of rows.entries()) {
      const home = canonicalTeam(row.homeTeam);
      const away = canonicalTeam(row.awayTeam);
      if (!home || !away) invalid.push(`Partido ${i + 1}: equipo fuera de la lista`);
      else if (home === away) invalid.push(`Partido ${i + 1}: local y visitante no pueden ser el mismo`);
    }
    if (invalid.length > 0) {
      setCreateError(invalid.join(" · "));
      return;
    }

    setCreating(true);
    try {
      const payload = {
        roomId: matchRoomId,
        matches: rows.map((row) => ({
          jornada: Number(row.jornada),
          homeTeam: canonicalTeam(row.homeTeam) ?? row.homeTeam.trim(),
          awayTeam: canonicalTeam(row.awayTeam) ?? row.awayTeam.trim(),
          kickoff: new Date(row.kickoff).toISOString(),
        })),
      };
      await authFetchJson("/api/matches", { method: "POST", body: JSON.stringify(payload) });
      setRows([emptyRow()]);
      await loadMatches(matchRoomId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudieron crear los partidos.");
    } finally {
      setCreating(false);
    }
  }

  async function runBonusPoints(mode: "preview" | "apply") {
    if (!bonusFile || !bonusRoomId) return;
    setBonusError(null);
    setBonusBusy(true);
    try {
      const form = new FormData();
      form.append("roomId", bonusRoomId);
      form.append("mode", mode);
      form.append("file", bonusFile);
      const result = await authFetchJson<{ rows: ResolvedBonusRow[]; applied?: number }>(
        "/api/admin/bonus-points",
        { method: "POST", body: form },
      );
      setBonusRows(result.rows);
      if (mode === "apply") setBonusApplied(result.applied ?? 0);
    } catch (err) {
      setBonusError(err instanceof Error ? err.message : "No se pudo procesar el archivo.");
    } finally {
      setBonusBusy(false);
    }
  }

  function handleBonusPreview(e: React.FormEvent) {
    e.preventDefault();
    setBonusApplied(null);
    void runBonusPoints("preview");
  }

  function handleBonusApply() {
    const okCount = bonusRows?.filter((r) => r.status === "ok").length ?? 0;
    const totalPoints = bonusRows?.filter((r) => r.status === "ok").reduce((sum, r) => sum + r.points, 0) ?? 0;
    if (!window.confirm(`¿Aplicar ${totalPoints} puntos en total a ${okCount} persona(s)?`)) return;
    void runBonusPoints("apply");
  }

  if (loading || !resultsAdmin) {
    return <p className="text-sm text-text-muted">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text">Admin de resultados</h1>
        <p className="text-sm text-text-muted">Crear partidos, editarlos y cargar resultados oficiales.</p>
      </div>

      <Card>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 p-4 sm:p-5">
          <h2 className="font-heading font-semibold text-text">Crear partidos en lote</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="matchRoom" className="text-sm font-medium text-text">
              Sala
            </label>
            <select
              id="matchRoom"
              value={matchRoomId}
              onChange={(e) => setMatchRoomId(e.target.value)}
              className="transition-base min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
            >
              {rooms === null && <option value="">Cargando salas…</option>}
              {rooms?.length === 0 && <option value="">No hay salas todavía</option>}
              {rooms?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {rows.map((row, i) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted">Partido {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  aria-label={`Eliminar partido ${i + 1}`}
                  title={rows.length === 1 ? "Debe quedar al menos una fila" : "Eliminar fila"}
                  className="text-error hover:bg-error-bg"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <TextField
                  label="Jornada"
                  type="number"
                  value={row.jornada}
                  onChange={(e) => updateRow(row.id, { jornada: e.target.value })}
                  required
                />
                <TeamCombobox
                  label="Local"
                  value={row.homeTeam}
                  exclude={row.awayTeam}
                  onChange={(homeTeam) => updateRow(row.id, { homeTeam })}
                  required
                />
                <TeamCombobox
                  label="Visitante"
                  value={row.awayTeam}
                  exclude={row.homeTeam}
                  onChange={(awayTeam) => updateRow(row.id, { awayTeam })}
                  required
                />
                <TextField
                  label="Fecha y hora"
                  type="datetime-local"
                  value={row.kickoff}
                  onChange={(e) => updateRow(row.id, { kickoff: e.target.value })}
                  required
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addRow}>
              + Agregar fila
            </Button>
            <Button type="submit" isLoading={creating} disabled={!matchRoomId}>
              Guardar partidos
            </Button>
          </div>
          {createError && <Alert variant="error">{createError}</Alert>}
        </form>
      </Card>

      <Card>
        <form onSubmit={handleBonusPreview} className="flex flex-col gap-4 p-4 sm:p-5">
          <div>
            <h2 className="font-heading font-semibold text-text">Agregar puntos de partidos antiguos</h2>
            <p className="text-sm text-text-muted">
              Sube un .xlsx con columnas <code>correo</code> y <code>puntos</code> para sumar puntos a
              usuarios de una sala (ajuste manual, no reemplaza el puntaje actual).
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="bonusRoom" className="text-sm font-medium text-text">
              Sala
            </label>
            <select
              id="bonusRoom"
              value={bonusRoomId}
              onChange={(e) => {
                setBonusRoomId(e.target.value);
                setBonusRows(null);
                setBonusApplied(null);
              }}
              className="transition-base min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
            >
              {rooms === null && <option value="">Cargando salas…</option>}
              {rooms?.length === 0 && <option value="">No hay salas todavía</option>}
              {rooms?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setBonusFile(e.target.files?.[0] ?? null);
              setBonusRows(null);
              setBonusApplied(null);
            }}
            className="text-sm text-text"
            required
          />

          <div className="flex gap-2">
            <Button type="submit" variant="outline" isLoading={bonusBusy} disabled={!bonusFile || !bonusRoomId}>
              Previsualizar
            </Button>
            {bonusRows && bonusRows.some((r) => r.status === "ok") && bonusApplied === null && (
              <Button type="button" isLoading={bonusBusy} onClick={handleBonusApply}>
                Aplicar puntos
              </Button>
            )}
          </div>

          {bonusError && <Alert variant="error">{bonusError}</Alert>}
          {bonusApplied !== null && (
            <Alert variant="success">
              Se aplicaron puntos a {bonusApplied} persona(s).
            </Alert>
          )}

          {bonusRows && (
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              {bonusRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text">
                    {row.displayName ?? row.email} <span className="text-text-muted">({row.points} pts)</span>
                  </span>
                  <Badge variant={row.status === "ok" ? "success" : "error"}>
                    {BONUS_STATUS_LABEL[row.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading font-semibold text-text">
          Partidos existentes {rooms?.find((r) => r.id === matchRoomId) && `— ${rooms.find((r) => r.id === matchRoomId)!.name}`}
        </h2>
        {matches === null && <p className="text-sm text-text-muted">Cargando…</p>}
        {matches?.length === 0 && (
          <p className="text-sm text-text-muted">Esta sala todavía no tiene partidos.</p>
        )}
        {matches?.map((match) => (
          <AdminMatchRow key={match.id} match={match} onChanged={() => loadMatches(matchRoomId)} />
        ))}
      </div>
    </div>
  );
}

function AdminMatchRow({ match, onChanged }: { match: MatchWithId; onChanged: () => Promise<void> }) {
  const status = getDisplayStatus(match);
  const [editing, setEditing] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editRow, setEditRow] = useState({
    jornada: String(match.jornada),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoff: dayjs(match.kickoff.toDate()).format("YYYY-MM-DDTHH:mm"),
  });
  const [resultRow, setResultRow] = useState({ homeScore: "", awayScore: "" });
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleRow, setRescheduleRow] = useState({ kickoff: "" });

  const needsAttention = match.status === "scheduled" && match.kickoff.toDate() < new Date();

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authFetchJson(`/api/matches/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "edit",
          jornada: Number(editRow.jornada),
          homeTeam: editRow.homeTeam.trim(),
          awayTeam: editRow.awayTeam.trim(),
          kickoff: new Date(editRow.kickoff).toISOString(),
        }),
      });
      setEditing(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar el partido.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("¿Cancelar este partido? Quedará excluido de la calificación.")) return;
    setError(null);
    setBusy(true);
    try {
      await authFetchJson(`/api/matches/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel" }),
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el partido.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePostpone() {
    if (
      !window.confirm(
        "¿Aplazar este partido? Se borrarán todos los pronósticos enviados y quedará pendiente de reprogramar.",
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authFetchJson(`/api/matches/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "postpone" }),
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplazar el partido.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authFetchJson(`/api/matches/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "reschedule",
          kickoff: new Date(rescheduleRow.kickoff).toISOString(),
        }),
      });
      setRescheduling(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reprogramar el partido.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResultSubmit(e: React.FormEvent) {
    e.preventDefault();
    const homeScore = Number(resultRow.homeScore);
    const awayScore = Number(resultRow.awayScore);
    if (
      !window.confirm(
        `¿Cargar el resultado ${match.homeTeam} ${homeScore} - ${awayScore} ${match.awayTeam}? No podrás modificarlo después.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authFetchJson(`/api/matches/${match.id}/result`, {
        method: "POST",
        body: JSON.stringify({ homeScore, awayScore }),
      });
      setLoadingResult(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el resultado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamCrest teamName={match.homeTeam} size="sm" />
          <TeamCrest teamName={match.awayTeam} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text">
              {match.homeTeam} vs {match.awayTeam}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              Jornada {match.jornada} · {dayjs(match.kickoff.toDate()).format("ddd D MMM, h:mm A")}
              <Badge variant={status === "postponed" ? "warning" : "neutral"}>{ADMIN_STATUS_LABEL[status]}</Badge>
              {needsAttention && (
                <Badge variant="error" icon={<AlertTriangle size={12} />}>
                  Necesita atención
                </Badge>
              )}
            </p>
          </div>
        </div>
        {status !== "finished" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)} disabled={busy}>
              Editar
            </Button>
            {status !== "cancelled" && (
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={busy}>
                Cancelar
              </Button>
            )}
            {status !== "cancelled" && status !== "postponed" && (
              <Button variant="outline" size="sm" onClick={() => setLoadingResult((v) => !v)} disabled={busy}>
                Cargar resultado
              </Button>
            )}
            {status !== "cancelled" && status !== "postponed" && (
              <Button variant="danger" size="sm" onClick={handlePostpone} disabled={busy}>
                Aplazar
              </Button>
            )}
            {status === "postponed" && (
              <Button variant="outline" size="sm" onClick={() => setRescheduling((v) => !v)} disabled={busy}>
                Reprogramar
              </Button>
            )}
          </div>
        )}
      </div>

      {status === "finished" && (
        <p className="mt-2 text-sm text-text-muted">
          Resultado oficial: {match.officialHomeScore} - {match.officialAwayScore}
        </p>
      )}

      {status === "postponed" && (
        <p className="mt-2 text-sm text-text-muted">
          Aplazado — sin fecha confirmada. Pronósticos anteriores borrados.
        </p>
      )}

      {rescheduling && (
        <form onSubmit={handleRescheduleSubmit} className="mt-3 flex items-end gap-2">
          <TextField
            label="Nueva fecha y hora"
            type="datetime-local"
            value={rescheduleRow.kickoff}
            onChange={(e) => setRescheduleRow({ kickoff: e.target.value })}
            required
          />
          <Button type="submit" isLoading={busy}>
            Confirmar nueva fecha
          </Button>
        </form>
      )}

      {editing && (
        <form onSubmit={handleEditSubmit} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TextField
            label="Jornada"
            type="number"
            value={editRow.jornada}
            onChange={(e) => setEditRow((r) => ({ ...r, jornada: e.target.value }))}
          />
          <TeamCombobox
            label="Local"
            value={editRow.homeTeam}
            exclude={editRow.awayTeam}
            onChange={(homeTeam) => setEditRow((r) => ({ ...r, homeTeam }))}
          />
          <TeamCombobox
            label="Visitante"
            value={editRow.awayTeam}
            exclude={editRow.homeTeam}
            onChange={(awayTeam) => setEditRow((r) => ({ ...r, awayTeam }))}
          />
          <TextField
            label="Fecha y hora"
            type="datetime-local"
            value={editRow.kickoff}
            onChange={(e) => setEditRow((r) => ({ ...r, kickoff: e.target.value }))}
          />
          <Button type="submit" isLoading={busy} className="col-span-2 sm:col-span-4">
            Guardar cambios
          </Button>
        </form>
      )}

      {loadingResult && (
        <form onSubmit={handleResultSubmit} className="mt-3 flex items-end gap-2">
          <TextField
            label="Goles local"
            type="number"
            min={0}
            max={20}
            value={resultRow.homeScore}
            onChange={(e) => setResultRow((r) => ({ ...r, homeScore: e.target.value }))}
            required
          />
          <TextField
            label="Goles visitante"
            type="number"
            min={0}
            max={20}
            value={resultRow.awayScore}
            onChange={(e) => setResultRow((r) => ({ ...r, awayScore: e.target.value }))}
            required
          />
          <Button type="submit" isLoading={busy}>
            Confirmar resultado
          </Button>
        </form>
      )}

      {error && <Alert variant="error" className="mt-2">{error}</Alert>}

      <div className="mt-3">
        <AuditFeed targetType="match" targetId={match.id} />
      </div>
    </Card>
  );
}
