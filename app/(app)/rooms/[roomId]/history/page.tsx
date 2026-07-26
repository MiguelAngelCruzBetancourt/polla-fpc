"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { HistoryTable, type HistoryRow } from "@/components/history-table";
import { SkeletonCard } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase-client";
import type { MatchDoc, PredictionDoc } from "@/lib/types";

export default function RoomHistoryPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    setRows(null);
    (async () => {
      const predictionsSnap = await getDocs(
        query(
          collection(db, "predictions"),
          where("uid", "==", user.uid),
          orderBy("submittedAt", "desc"),
        ),
      );

      const predictions = predictionsSnap.docs.map((d) => d.data() as PredictionDoc);
      const matches = await Promise.all(
        predictions.map((p) => getDoc(doc(db, "matches", p.matchId))),
      );

      const historyRows: HistoryRow[] = predictions
        .map((prediction, i) => {
          const matchSnap = matches[i]!;
          if (!matchSnap.exists()) return null;
          const match = matchSnap.data() as MatchDoc;
          if (match.roomId !== roomId) return null;
          return { prediction, match };
        })
        .filter((row): row is HistoryRow => row !== null);

      setRows(historyRows);
    })();
  }, [user, roomId]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">Tus pronósticos en esta sala.</p>

      {rows === null ? (
        <div className="flex flex-col gap-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <HistoryTable rows={rows} />
      )}
    </div>
  );
}
