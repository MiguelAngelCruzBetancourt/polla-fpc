import { NextResponse } from "next/server";
import { MatchServiceError } from "./errors";

/**
 * Reemplaza al manejador de errores central que tenían los servidores Express:
 * traduce MatchServiceError al status que trae y cualquier otro error a un 500
 * genérico, dejando el detalle solo en los logs.
 */
export function serviceErrorResponse(err: unknown): NextResponse {
  if (err instanceof MatchServiceError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "No autenticado." }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "No tienes permiso de admin de resultados." }, { status: 403 });
}
