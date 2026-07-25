"use client";

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditFeed } from "@/components/audit-feed";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authFetchJson } from "@/lib/api-client";
import { db } from "@/lib/firebase-client";
import { getDisplayStatus } from "@/lib/match-status";
import type { MatchDoc } from "@/lib/types";

type MatchWithId = MatchDoc & { id: string };

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

  const loadMatches = useCallback(async () => {
    const snap = await getDocs(query(collection(db, "matches"), orderBy("kickoff", "desc")));
    setMatches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchDoc) })));
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

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

  if (loading || !resultsAdmin) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin de resultados</h1>
        <p className="text-sm text-slate-500">Crear partidos, editarlos y cargar resultados oficiales.</p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
        <h2 className="font-medium text-slate-900">Crear partidos en lote</h2>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-3 sm:grid-cols-4">
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
          <Button type="button" variant="secondary" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
            + Agregar fila
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? "Guardando…" : "Guardar partidos"}
          </Button>
        </div>
        {createError && <p className="text-sm text-red-600">{createError}</p>}
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="font-medium text-slate-900">Partidos existentes</h2>
        {matches === null && <p className="text-sm text-slate-500">Cargando…</p>}
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
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {match.homeTeam} vs {match.awayTeam}
          </p>
          <p className="text-xs text-slate-500">
            Jornada {match.jornada} · {dayjs(match.kickoff.toDate()).format("ddd D MMM, h:mm A")} · {status}
          </p>
        </div>
        {status !== "finished" && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing((v) => !v)} disabled={busy}>
              Editar
            </Button>
            {status !== "cancelled" && (
              <Button variant="danger" onClick={handleCancel} disabled={busy}>
                Cancelar
              </Button>
            )}
            {status !== "cancelled" && (
              <Button variant="secondary" onClick={() => setLoadingResult((v) => !v)} disabled={busy}>
                Cargar resultado
              </Button>
            )}
          </div>
        )}
      </div>

      {status === "finished" && (
        <p className="mt-2 text-sm text-slate-600">
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
          <Button type="submit" disabled={busy} className="col-span-2 sm:col-span-4">
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
          <Button type="submit" disabled={busy}>
            Confirmar resultado
          </Button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3">
        <AuditFeed targetType="match" targetId={match.id} />
      </div>
    </div>
  );
}
