"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { HistoryTable, type HistoryRow } from "@/components/history-table";
import { SkeletonCard } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase-client";
import type { MatchDoc, PredictionDoc } from "@/lib/types";

export default function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
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
          return { prediction, match: matchSnap.data() as MatchDoc };
        })
        .filter((row): row is HistoryRow => row !== null);

      setRows(historyRows);
    })();
  }, [user]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text">Mi historial</h1>
        <p className="text-sm text-text-muted">Tus pronósticos en todas las salas donde participas.</p>
      </div>

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
