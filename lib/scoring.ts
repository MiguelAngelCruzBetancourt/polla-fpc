interface Marcador {
  homeScore: number;
  awayScore: number;
}

export function calcularPuntos(pronostico: Marcador, resultado: Marcador): number {
  const { homeScore: hP, awayScore: aP } = pronostico;
  const { homeScore: hR, awayScore: aR } = resultado;

  // 5 puntos: marcador exacto
  if (hP === hR && aP === aR) return 5;

  const ganadorReal = hR > aR ? "local" : aR > hR ? "visita" : "empate";
  const ganadorPronosticado = hP > aP ? "local" : aP > hP ? "visita" : "empate";

  // 3 puntos: acierta el resultado (ganador o empate), sin marcador exacto
  if (ganadorReal === ganadorPronosticado) return 3;

  // 1 punto: acierta los goles de al menos uno de los dos equipos
  if (hP === hR || aP === aR) return 1;

  return 0;
}
