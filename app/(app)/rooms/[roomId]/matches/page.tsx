"use client";

import { collection, getDocs, orderBy, query, Timestamp, where } from "firebase/firestore";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MatchCard, type RevealedPrediction } from "@/components/match-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { getColombiaTodayRangeUtc } from "@/lib/colombia-date";
import { db } from "@/lib/firebase-client";
import { getDisplayStatus } from "@/lib/match-status";
import type { MatchDoc, PredictionDoc } from "@/lib/types";

type MatchWithId = MatchDoc & { id: string };
type PredictionWithId = PredictionDoc & { id: string };

export default function RoomMatchesPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();

  const [members, setMembers] = useState<Record<string, string> | null>(null);
  const [matches, setMatches] = useState<MatchWithId[] | null>(null);
  const [myPredictions, setMyPredictions] = useState<Record<string, PredictionWithId>>({});
  const [revealedByMatch, setRevealedByMatch] = useState<Record<string, RevealedPrediction[]>>({});

  const load = useCallback(async () => {
    if (!user) return;

    const memberSnap = await getDocs(collection(db, "rooms", roomId, "members"));
    const memberMap: Record<string, string> = {};
    memberSnap.docs.forEach((d) => {
      memberMap[d.id] = (d.data() as { displayName: string }).displayName;
    });
    setMembers(memberMap);

    const { start, end } = getColombiaTodayRangeUtc();
    const matchesSnap = await getDocs(
      query(
        collection(db, "matches"),
        where("roomId", "==", roomId),
        where("kickoff", ">=", Timestamp.fromDate(start)),
        where("kickoff", "<", Timestamp.fromDate(end)),
        orderBy("kickoff", "asc"),
      ),
    );
    const matchList = matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchDoc) }));
    setMatches(matchList);

    const myPredictionsSnap = await getDocs(
      query(collection(db, "predictions"), where("uid", "==", user.uid)),
    );
    const mine: Record<string, PredictionWithId> = {};
    myPredictionsSnap.docs.forEach((d) => {
      const data = d.data() as PredictionDoc;
      mine[data.matchId] = { id: d.id, ...data };
    });
    setMyPredictions(mine);

    const revealed: Record<string, RevealedPrediction[]> = {};
    for (const match of matchList) {
      const status = getDisplayStatus(match);
      if (status !== "revealed" && status !== "finished") continue;

      const predsSnap = await getDocs(
        query(collection(db, "predictions"), where("matchId", "==", match.id)),
      );
      revealed[match.id] = predsSnap.docs
        .map((d) => d.data() as PredictionDoc)
        .filter((p) => p.uid in memberMap)
        .map((p) => ({
          uid: p.uid,
          displayName: memberMap[p.uid],
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          points: p.points,
        }));
    }
    setRevealedByMatch(revealed);
  }, [roomId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || matches === null || members === null) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Image src="/assets/illustrations/empty-matches.svg" alt="" width={120} height={120} />
        <p className="text-sm text-text-muted">No hay partidos programados para hoy.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          myPrediction={myPredictions[match.id] ?? null}
          revealedPredictions={revealedByMatch[match.id] ?? null}
          currentUid={user.uid}
          onPredictionSubmitted={() => void load()}
        />
      ))}
    </div>
  );
}
