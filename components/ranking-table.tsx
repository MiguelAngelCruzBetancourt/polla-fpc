import type { RoomMemberDoc } from "@/lib/types";

export function RankingTable({ members }: { members: RoomMemberDoc[] }) {
  const rest = members.slice(3);
  if (rest.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {rest.map((member, i) => (
        <div
          key={member.uid}
          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2"
        >
          <span className="text-sm text-slate-500">#{i + 4}</span>
          <span className="flex-1 px-3 font-medium text-slate-900">{member.displayName}</span>
          <span className="text-sm text-slate-600">{member.totalPoints} pts</span>
        </div>
      ))}
    </div>
  );
}
