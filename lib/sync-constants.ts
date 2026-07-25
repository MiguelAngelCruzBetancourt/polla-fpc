// Sin otras dependencias a propósito: lo importan tanto lib/schedule-sync.ts (servidor,
// usa firebase-admin) como components/audit-feed.tsx (cliente) — si este archivo
// arrastrara firebase-admin, rompería el bundle del cliente.
export const SYSTEM_ACTOR_UID = "system:schedule-sync";
