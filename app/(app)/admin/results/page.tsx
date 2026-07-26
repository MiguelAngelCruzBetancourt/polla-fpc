"use client";

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditFeed } from "@/components/audit-feed";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { authFetchJson } from "@/lib/api-client";
import { db } from "@/lib/firebase-client";
import { getDisplayStatus } from "@/lib/match-status";
import type { MatchDoc, RoomDoc } from "@/lib/types";

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
  jornada: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // datetime-local
}

function emptyRow(): NewMatchRow {
  return { jornada: "", homeTeam: "", awayTeam: "", kickoff: "" };
}

export default function AdminResultsPage() {
  const { loading, resultsAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !resultsAdmin) router.replace("/rooms");
  }, [loading, resultsAdmin, router]);

  const [matches, setMatches] = useState<MatchWithId[] | null>(null);
  const [rows, setRows] = useState<NewMatchRow[]>([emptyRow()]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomWithId[] | null>(null);
  const [bonusRoomId, setBonusRoomId] = useState("");
  const [bonusFile, setBonusFile] = useState<File | null>(null);
  const [bonusRows, setBonusRows] = useState<ResolvedBonusRow[] | null>(null);
  const [bonusApplied, setBonusApplied] = useState<number | null>(null);
  const [bonusBusy, setBonusBusy] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const snap = await getDocs(query(collection(db, "matches"), orderBy("kickoff", "desc")));
    setMatches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchDoc) })));
  }, []);

  const loadRooms = useCallback(async () => {
    const snap = await getDocs(collection(db, "rooms"));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as RoomDoc) }));
    setRooms(list);
    setBonusRoomId((prev) => prev || list[0]?.id || "");
  }, []);

  useEffect(() => {
    void loadMatches();
    void loadRooms();
  }, [loadMatches, loadRooms]);

  function updateRow(index: number, patch: Partial<NewMatchRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const payload = {
        matches: rows.map((row) => ({
          jornada: Number(row.jornada),
          homeTeam: row.homeTeam.trim(),
          awayTeam: row.awayTeam.trim(),
          kickoff: new Date(row.kickoff).toISOString(),
        })),
      };
      await authFetchJson("/api/matches", { method: "POST", body: JSON.stringify(payload) });
      setRows([emptyRow()]);
      await loadMatches();
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
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:grid-cols-4">
              <TextField
                label="Jornada"
                type="number"
                value={row.jornada}
                onChange={(e) => updateRow(i, { jornada: e.target.value })}
                required
              />
              <TextField
                label="Local"
                value={row.homeTeam}
                onChange={(e) => updateRow(i, { homeTeam: e.target.value })}
                required
              />
              <TextField
                label="Visitante"
                value={row.awayTeam}
                onChange={(e) => updateRow(i, { awayTeam: e.target.value })}
                required
              />
              <TextField
                label="Fecha y hora"
                type="datetime-local"
                value={row.kickoff}
                onChange={(e) => updateRow(i, { kickoff: e.target.value })}
                required
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
              + Agregar fila
            </Button>
            <Button type="submit" isLoading={creating}>
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
        <h2 className="font-heading font-semibold text-text">Partidos existentes</h2>
        {matches === null && <p className="text-sm text-text-muted">Cargando…</p>}
        {matches?.map((match) => (
          <AdminMatchRow key={match.id} match={match} onChanged={loadMatches} />
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
        <div>
          <p className="font-medium text-text">
            {match.homeTeam} vs {match.awayTeam}
          </p>
          <p className="flex items-center gap-2 text-xs text-text-muted">
            Jornada {match.jornada} · {dayjs(match.kickoff.toDate()).format("ddd D MMM, h:mm A")}
            <Badge variant="neutral">{status}</Badge>
          </p>
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
            {status !== "cancelled" && (
              <Button variant="outline" size="sm" onClick={() => setLoadingResult((v) => !v)} disabled={busy}>
                Cargar resultado
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

      {editing && (
        <form onSubmit={handleEditSubmit} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TextField
            label="Jornada"
            type="number"
            value={editRow.jornada}
            onChange={(e) => setEditRow((r) => ({ ...r, jornada: e.target.value }))}
          />
          <TextField
            label="Local"
            value={editRow.homeTeam}
            onChange={(e) => setEditRow((r) => ({ ...r, homeTeam: e.target.value }))}
          />
          <TextField
            label="Visitante"
            value={editRow.awayTeam}
            onChange={(e) => setEditRow((r) => ({ ...r, awayTeam: e.target.value }))}
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
