import * as XLSX from "xlsx";

const COLOMBIA_UTC_OFFSET = "-05:00";
const REQUIRED_COLUMNS = [
  "jornada",
  "equipo_local",
  "equipo_visitante",
  "fecha",
  "hora",
  "marcador_local",
  "marcador_visitante",
] as const;

export interface SheetRow {
  jornada: number;
  homeTeam: string;
  awayTeam: string;
  kickoffIso: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ParseResult {
  rows: SheetRow[];
  // Filas que no se pudieron usar todavía (sin fecha/hora, vacías, duplicadas, etc.)
  // — no son errores fatales, son estados normales de un fixture que se va llenando
  // progresivamente (ver conversación con el usuario: puede ir agregando jornadas).
  skipped: string[];
}

function cell(rawRow: Record<string, unknown>, key: string): string {
  return String(rawRow[key] ?? "").trim();
}

export function buildCsvUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchAndParseSchedule(csvUrl: string): Promise<ParseResult> {
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

  // Un encabezado con una columna faltante/renombrada es un problema estructural
  // real (afecta a TODAS las filas por igual) — eso sí aborta todo el parseo.
  const actualColumns = new Set(Object.keys(rawRows[0] ?? {}));
  for (const col of REQUIRED_COLUMNS) {
    if (!actualColumns.has(col)) {
      throw new Error(`Falta la columna "${col}" en el encabezado de la hoja.`);
    }
  }

  const rows: SheetRow[] = [];
  const skipped: string[] = [];
  const seenPairs = new Set<string>();

  rawRows.forEach((rawRow, index) => {
    const rowLabel = String(index + 2); // +2: fila 1 es encabezado, index es 0-based

    const homeTeam = cell(rawRow, "equipo_local");
    const awayTeam = cell(rawRow, "equipo_visitante");

    if (!homeTeam && !awayTeam) return; // fila completamente vacía (placeholder de jornada futura) — se ignora sin aviso

    if (!homeTeam || !awayTeam) {
      skipped.push(`Fila ${rowLabel}: falta equipo_local o equipo_visitante.`);
      return;
    }

    const label = `${homeTeam} vs ${awayTeam}`;
    const pairKey = `${homeTeam}::${awayTeam}`;
    if (seenPairs.has(pairKey)) {
      skipped.push(`${label} (fila ${rowLabel}): par de equipos repetido en la hoja, se ignora la fila duplicada.`);
      return;
    }

    const fecha = cell(rawRow, "fecha");
    const hora = cell(rawRow, "hora");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
      skipped.push(`${label}: todavía no tiene fecha/hora válida (AAAA-MM-DD / HH:MM) — se omite por ahora.`);
      return;
    }

    const jornada = Number(cell(rawRow, "jornada"));
    if (!Number.isInteger(jornada) || jornada <= 0) {
      skipped.push(`${label}: jornada inválida ("${cell(rawRow, "jornada")}") — se omite.`);
      return;
    }

    const homeScoreRaw = cell(rawRow, "marcador_local");
    const awayScoreRaw = cell(rawRow, "marcador_visitante");
    const homeScore = homeScoreRaw === "" ? null : Number(homeScoreRaw);
    const awayScore = awayScoreRaw === "" ? null : Number(awayScoreRaw);

    if (
      (homeScore !== null && (!Number.isInteger(homeScore) || homeScore < 0 || homeScore > 20)) ||
      (awayScore !== null && (!Number.isInteger(awayScore) || awayScore < 0 || awayScore > 20))
    ) {
      skipped.push(`${label}: marcador inválido ("${homeScoreRaw}"-"${awayScoreRaw}") — se omite.`);
      return;
    }

    seenPairs.add(pairKey);
    rows.push({
      jornada,
      homeTeam,
      awayTeam,
      kickoffIso: `${fecha}T${hora}:00${COLOMBIA_UTC_OFFSET}`,
      homeScore,
      awayScore,
    });
  });

  return { rows, skipped };
}
