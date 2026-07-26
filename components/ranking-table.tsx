import { Medal, Trophy } from "lucide-react";
import type { RoomMemberDoc } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const PODIUM_STYLE = [
  { icon: Trophy, fg: "text-podium-1", bg: "bg-podium-1-bg", border: "border-podium-1", avatarSize: "lg" as const },
  { icon: Medal, fg: "text-podium-2", bg: "bg-podium-2-bg", border: "border-podium-2", avatarSize: "md" as const },
  { icon: Medal, fg: "text-podium-3", bg: "bg-podium-3-bg", border: "border-podium-3", avatarSize: "md" as const },
];

export function RankingTable({
  members,
  currentUid,
}: {
  members: RoomMemberDoc[];
  currentUid?: string;
}) {
  return (
    <ol className="flex flex-col overflow-hidden rounded-xl border border-border">
      {members.map((member, i) => {
        const isMe = member.uid === currentUid;
        const podium = PODIUM_STYLE[i];
        const delay = Math.min(i, 10) * 40;

        return (
          <li
            key={member.uid}
            aria-label={`Puesto ${i + 1}`}
            aria-current={isMe ? "true" : undefined}
            style={{ animationDelay: `${delay}ms` }}
            className={`animate-in transition-base flex items-center gap-3 px-4 py-2.5 ${
              podium
                ? `${podium.bg} border-l-2 ${podium.border}`
                : i % 2 === 0
                  ? "bg-surface"
                  : "bg-surface-alt"
            } ${isMe ? "ring-1 ring-inset ring-accent" : ""}`}
          >
            {podium ? (
              <podium.icon className={`shrink-0 ${podium.fg}`} size={18} aria-hidden="true" />
            ) : (
              <span className="w-[18px] shrink-0 text-center text-sm text-text-muted">{i + 1}</span>
            )}
            <Avatar name={member.displayName} size={podium?.avatarSize ?? "sm"} />
            <span className={`flex-1 truncate text-text ${podium ? "font-semibold" : "font-medium"}`}>
              {member.displayName}
            </span>
            {isMe && <Badge variant="neutral">Tú</Badge>}
            <span className={podium ? "font-semibold text-text" : "text-sm text-text-muted"}>
              {member.totalPoints} pts
            </span>
          </li>
        );
      })}
    </ol>
  );
}
