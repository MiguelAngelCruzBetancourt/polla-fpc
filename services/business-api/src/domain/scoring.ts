interface Marcador {
  homeScore: number;
  awayScore: number;
}

// Copia fiel de lib/scoring.ts del monolito.
export function calcularPuntos(pronostico: Marcador, resultado: Marcador): number {
  const { homeScore: hP, awayScore: aP } = pronostico;
  const { homeScore: hR, awayScore: aR } = resultado;

  if (hP === hR && aP === aR) return 5;

  const ganadorReal = hR > aR ? "local" : aR > hR ? "visita" : "empate";
  const ganadorPronosticado = hP > aP ? "local" : aP > hP ? "visita" : "empate";

  if (ganadorReal === ganadorPronosticado) return 3;

  if (hP === hR || aP === aR) return 1;

  return 0;
}
