import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
initializeApp({ projectId: "pollabetplay" });
const uid = process.argv[2];
await getAuth().setCustomUserClaims(uid, { resultsAdmin: true });
console.log(`resultsAdmin=true asignado a ${uid}`);
