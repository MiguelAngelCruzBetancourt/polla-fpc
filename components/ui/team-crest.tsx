import Image from "next/image";
import { getTeamCrestSrc } from "@/lib/team-crests";
import { Avatar } from "@/components/ui/avatar";

export function TeamCrest({
  teamName,
  size = "md",
}: {
  teamName: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = getTeamCrestSrc(teamName);
  if (!src) return <Avatar name={teamName} size={size} />;

  const px = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  return (
    <Image
      src={src}
      alt={teamName}
      width={px}
      height={px}
      className="shrink-0 rounded-full object-contain"
    />
  );
}
