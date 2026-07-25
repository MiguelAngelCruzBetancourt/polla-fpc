/**
 * Asigna el custom claim `resultsAdmin: true` a un usuario existente.
 *
 * Contra producción (usa las credenciales reales de .env.local):
 *   npx tsx --env-file=.env.local scripts/set-results-admin.ts <uid-o-email>
 *
 * Contra el emulador, exporta antes:
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
 *   FIREBASE_ADMIN_PROJECT_ID=pollabetplay
 *   npx tsx scripts/set-results-admin.ts <uid-o-email>
 */
import { adminAuth } from "../lib/firebase-admin";

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Uso: npx tsx scripts/set-results-admin.ts <uid-o-email>");
    process.exit(1);
  }

  const auth = adminAuth();
  const user = identifier.includes("@")
    ? await auth.getUserByEmail(identifier)
    : await auth.getUser(identifier);

  await auth.setCustomUserClaims(user.uid, { resultsAdmin: true });

  console.log(`resultsAdmin=true asignado a ${user.email ?? user.uid} (uid: ${user.uid})`);
  console.log("El usuario debe cerrar sesión y volver a iniciarla para que el claim tome efecto en su idToken.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
