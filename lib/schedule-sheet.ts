import * as XLSX from "xlsx";
import { z } from "zod";

const COLOMBIA_UTC_OFFSET = "-05:00";

export interface SheetRow {
  jornada: number;
  homeTeam: string;
  awayTeam: string;
  kickoffIso: string;
  homeScore: number | null;
  awayScore: number | null;
}

const rawRowSchema = z.object({
  jornada: z.coerce.number().int().positive(),
  equipo_local: z.string().trim().min(1),
  equipo_visitante: z.string().trim().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe ser AAAA-MM-DD"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "hora debe ser HH:MM"),
  marcador_local: z.string(),
  marcador_visitante: z.string(),
});

function parseScore(raw: string, column: string, rowLabel: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0 || value > 20) {
    throw new Error(`Fila ${rowLabel}: ${column} inválido ("${raw}").`);
  }
  return value;
}

export function buildCsvUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchAndParseSchedule(csvUrl: string): Promise<SheetRow[]> {
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el Sheet (HTTP ${res.status}).`);
  }

  const rawText = await res.text();
  if (rawText.trim().startsWith("<")) {
    throw new Error("La respuesta no es CSV (¿el Sheet dejó de ser público por link?).");
  }

  // La URL de exportación de Google Sheets antepone un BOM UTF-8, que corrompe
  // el nombre de la primera columna si no se limpia antes de parsear.
  const csvText = rawText.replace(/^﻿/, "");

  // raw:true es necesario: sin esto, SheetJS auto-convierte celdas tipo fecha
  // ("2026-07-25") a números seriales de Excel, rompiendo el parseo de `fecha`.
  const workbook = XLSX.read(csvText, { type: "string", raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true, defval: "" });

  const rows: SheetRow[] = [];
  const seenPairs = new Set<string>();

  rawRows.forEach((rawRow, index) => {
    const rowLabel = String(index + 2); // +2: fila 1 es encabezado, index es 0-based

    const parsed = rawRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      throw new Error(`Fila ${rowLabel}: formato inválido — ${parsed.error.issues[0]?.message}`);
    }

    const pairKey = `${parsed.data.equipo_local}::${parsed.data.equipo_visitante}`;
    if (seenPairs.has(pairKey)) {
      throw new Error(`Fila ${rowLabel}: el par de equipos "${pairKey}" ya apareció antes en la hoja.`);
    }
    seenPairs.add(pairKey);

    rows.push({
      jornada: parsed.data.jornada,
      homeTeam: parsed.data.equipo_local,
      awayTeam: parsed.data.equipo_visitante,
      kickoffIso: `${parsed.data.fecha}T${parsed.data.hora}:00${COLOMBIA_UTC_OFFSET}`,
      homeScore: parseScore(parsed.data.marcador_local, "marcador_local", rowLabel),
      awayScore: parseScore(parsed.data.marcador_visitante, "marcador_visitante", rowLabel),
    });
  });

  return rows;
}
