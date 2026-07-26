import { Medal, Trophy } from "lucide-react";
import type { RoomMemberDoc } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";

const RANK_STYLE = [
  { icon: Trophy, fg: "text-podium-1", bg: "bg-podium-1-bg", order: "sm:order-2", height: "sm:h-32" },
  { icon: Medal, fg: "text-podium-2", bg: "bg-podium-2-bg", order: "sm:order-1", height: "sm:h-24" },
  { icon: Medal, fg: "text-podium-3", bg: "bg-podium-3-bg", order: "sm:order-3", height: "sm:h-20" },
];

export function Podium({ members }: { members: RoomMemberDoc[] }) {
  const top3 = members.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-center">
      {top3.map((member, i) => {
        const style = RANK_STYLE[i]!;
        const Icon = style.icon;
        return (
          <div
            key={member.uid}
            className={`animate-in flex flex-1 flex-col items-center justify-end gap-2 rounded-xl border border-border ${style.bg} p-4 ${style.order} ${style.height}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Icon className={style.fg} size={24} aria-hidden="true" />
            <Avatar name={member.displayName} size="lg" />
            <span className="text-center text-sm font-semibold text-text">{member.displayName}</span>
            <span className="text-xs text-text-muted">{member.totalPoints} pts</span>
          </div>
        );
      })}
    </div>
  );
}
