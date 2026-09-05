import * as XLSX from "xlsx";

export interface BonusRow {
  email: string;
  points: number;
}

// Adaptado de lib/bonus-points.ts del monolito: aquí el archivo llega como
// Buffer de Node (multer), no como ArrayBuffer de un File del navegador.
export function parseBonusPointsFile(buffer: Buffer): BonusRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rawRows.length === 0) {
    throw new Error("El archivo no tiene filas.");
  }

  const columns = new Set(Object.keys(rawRows[0]!));
  if (!columns.has("correo") || !columns.has("puntos")) {
    throw new Error('El archivo debe tener las columnas "correo" y "puntos".');
  }

  return rawRows
    .map((row) => ({
      email: String(row.correo ?? "").trim(),
      points: Number(row.puntos),
    }))
    .filter((row) => row.email !== "");
}
