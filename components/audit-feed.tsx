"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { SYSTEM_ACTOR_UID } from "@/lib/sync-constants";
import type { AuditAction, AuditLogDoc } from "@/lib/types";

const ACTION_LABEL: Record<AuditAction, string> = {
  match_created: "creó el partido",
  match_edited: "editó el partido",
  match_cancelled: "canceló el partido",
  result_loaded: "cargó el resultado oficial",
  member_kicked: "expulsó a un miembro",
  room_code_regenerated: "regeneró el código de la sala",
  historical_data_imported: "importó datos históricos",
};

interface FeedEntry extends AuditLogDoc {
  id: string;
  performedByName: string;
}

export function AuditFeed({
  targetType,
  targetId,
}: {
  targetType: "room" | "match";
  targetId: string;
}) {
  const [entries, setEntries] = useState<FeedEntry[] | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(
        query(
          collection(db, "auditLog"),
          where("targetType", "==", targetType),
          where("targetId", "==", targetId),
          orderBy("performedAt", "desc"),
        ),
      );

      const rawEntries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditLogDoc) }));
      const uniqueUids = [...new Set(rawEntries.map((e) => e.performedBy))];
      const nameByUid = new Map<string, string>();
      await Promise.all(
        uniqueUids.map(async (uid) => {
          if (uid === SYSTEM_ACTOR_UID) {
            nameByUid.set(uid, "Sincronización automática");
            return;
          }
          const userSnap = await getDoc(doc(db, "users", uid));
          nameByUid.set(uid, userSnap.exists() ? userSnap.data().displayName : "alguien");
        }),
      );

      setEntries(
        rawEntries.map((e) => ({ ...e, performedByName: nameByUid.get(e.performedBy) ?? "alguien" })),
      );
    })();
  }, [targetType, targetId]);

  if (entries === null) return <p className="text-xs text-slate-400">Cargando actividad…</p>;
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
      {entries.map((entry) => (
        <p key={entry.id} className="text-xs text-slate-500">
          {entry.performedByName} {ACTION_LABEL[entry.action]} el{" "}
          {dayjs(entry.performedAt.toDate()).format("D MMM YYYY, h:mm A")}
        </p>
      ))}
    </div>
  );
}
