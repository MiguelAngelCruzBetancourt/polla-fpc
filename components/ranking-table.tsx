import type { RoomMemberDoc } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";

export function RankingTable({
  members,
  currentUid,
}: {
  members: RoomMemberDoc[];
  currentUid?: string;
}) {
  const rest = members.slice(3);
  if (rest.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border">
      {rest.map((member, i) => {
        const isMe = member.uid === currentUid;
        return (
          <div
            key={member.uid}
            className={`transition-base flex items-center gap-3 px-4 py-2.5 ${
              isMe ? "bg-accent-subtle" : i % 2 === 0 ? "bg-surface" : "bg-surface-alt"
            }`}
          >
            <span className="w-6 text-sm text-text-muted">#{i + 4}</span>
            <Avatar name={member.displayName} size="sm" />
            <span className="flex-1 truncate font-medium text-text">{member.displayName}</span>
            <span className="text-sm text-text-muted">{member.totalPoints} pts</span>
          </div>
        );
      })}
    </div>
  );
}
