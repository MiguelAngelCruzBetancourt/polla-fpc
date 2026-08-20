"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import dayjs from "dayjs";
import {
  Ban,
  CalendarClock,
  CalendarPlus,
  Gift,
  History,
  KeyRound,
  LogOut,
  PauseCircle,
  Pencil,
  Trophy,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import type { AuditAction, AuditLogDoc } from "@/lib/types";

const ACTION_LABEL: Record<AuditAction, string> = {
  match_created: "creó el partido",
  match_edited: "editó el partido",
  match_cancelled: "canceló el partido",
  match_postponed: "aplazó el partido",
  match_rescheduled: "reprogramó el partido",
  result_loaded: "cargó el resultado oficial",
  member_kicked: "expulsó a un miembro",
  member_left: "salió de la sala",
  room_code_regenerated: "regeneró el código de la sala",
  historical_data_imported: "importó datos históricos",
  bonus_points_added: "agregó puntos bonus",
};

const ACTION_ICON: Record<AuditAction, LucideIcon> = {
  match_created: CalendarPlus,
  match_edited: Pencil,
  match_cancelled: Ban,
  match_postponed: PauseCircle,
  match_rescheduled: CalendarClock,
  result_loaded: Trophy,
  member_kicked: UserMinus,
  member_left: LogOut,
  room_code_regenerated: KeyRound,
  historical_data_imported: History,
  bonus_points_added: Gift,
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
          const userSnap = await getDoc(doc(db, "users", uid));
          nameByUid.set(uid, userSnap.exists() ? userSnap.data().displayName : "alguien");
        }),
      );

      setEntries(
        rawEntries.map((e) => ({ ...e, performedByName: nameByUid.get(e.performedBy) ?? "alguien" })),
      );
    })();
  }, [targetType, targetId]);

  if (entries === null) return <p className="text-xs text-text-muted">Cargando actividad…</p>;
  if (entries.length === 0) return null;

  return (
    <details className="group border-t border-border pt-2">
      <summary className="cursor-pointer list-none text-xs font-medium text-text-muted hover:text-text">
        Actividad ({entries.length})
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {entries.map((entry) => {
          const Icon = ACTION_ICON[entry.action];
          return (
            <div key={entry.id} className="flex items-start gap-2 text-xs text-text-muted">
              <Icon size={14} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
              <span>
                {entry.performedByName} {ACTION_LABEL[entry.action]} el{" "}
                {dayjs(entry.performedAt.toDate()).format("D MMM YYYY, h:mm A")}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
