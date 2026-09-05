import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

// Colección propia: notificationDevices/{uid}/tokens/{tokenId}
function tokensCollection(uid: string) {
  return adminDb().collection("notificationDevices").doc(uid).collection("tokens");
}

export async function registerDevice(uid: string, fcmToken: string): Promise<{ tokenId: string }> {
  const existing = await tokensCollection(uid).where("token", "==", fcmToken).limit(1).get();
  if (!existing.empty) {
    return { tokenId: existing.docs[0]!.id };
  }

  const ref = await tokensCollection(uid).add({
    token: fcmToken,
    registeredAt: Timestamp.now(),
  });
  return { tokenId: ref.id };
}

export async function removeDevice(uid: string, tokenId: string): Promise<void> {
  await tokensCollection(uid).doc(tokenId).delete();
}

export async function listTokensForUid(uid: string): Promise<string[]> {
  const snap = await tokensCollection(uid).get();
  return snap.docs.map((doc) => doc.data().token as string);
}
