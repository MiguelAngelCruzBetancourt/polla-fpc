// Colombia no tiene horario de verano, así que un offset fijo UTC-5 es correcto y
// deliberado — no reemplazar por Intl/tz-database pensando que hace falta.
const COLOMBIA_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

export function getColombiaTodayRangeUtc(reference: Date = new Date()): { start: Date; end: Date } {
  const colombiaMs = reference.getTime() - COLOMBIA_UTC_OFFSET_MS;
  const colombiaDate = new Date(colombiaMs);
  const startOfDayColombiaMs =
    Date.UTC(colombiaDate.getUTCFullYear(), colombiaDate.getUTCMonth(), colombiaDate.getUTCDate()) +
    COLOMBIA_UTC_OFFSET_MS;

  return {
    start: new Date(startOfDayColombiaMs),
    end: new Date(startOfDayColombiaMs + 24 * 60 * 60 * 1000),
  };
}
