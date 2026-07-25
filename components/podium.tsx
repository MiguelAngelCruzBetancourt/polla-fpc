import type { RoomMemberDoc } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Podium({ members }: { members: RoomMemberDoc[] }) {
  const top3 = members.slice(0, 3);

  return (
    <div className="flex justify-center gap-4">
      {top3.map((member, i) => (
        <div key={member.uid} className="flex flex-col items-center gap-1">
          <span className="text-3xl">{MEDALS[i]}</span>
          <span className="text-sm font-medium text-slate-900">{member.displayName}</span>
          <span className="text-xs text-slate-500">{member.totalPoints} pts</span>
        </div>
      ))}
    </div>
  );
}
