import Image from "next/image";
import { getTeamCrestSrc } from "@/lib/team-crests";
import { Avatar, SIZE_BOX, SIZE_PX, type AvatarSize } from "@/components/ui/avatar";

export function TeamCrest({
  teamName,
  size = "md",
  className = "",
}: {
  teamName: string;
  size?: AvatarSize;
  className?: string;
}) {
  const src = getTeamCrestSrc(teamName);
  if (!src) return <Avatar name={teamName} size={size} className={className} />;

  const px = SIZE_PX[size];
  return (
    <Image
      src={src}
      // El nombre del equipo siempre esta al lado como texto; anunciarlo tambien
      // desde la imagen lo duplicaria en el lector de pantalla. Mismo criterio
      // que Avatar, que es aria-hidden.
      alt=""
      aria-hidden="true"
      width={px}
      height={px}
      // Sin `unoptimized`, Next emite /_next/image?url=... y el escudo deja de
      // servirse desde el precache del service worker (que si lo descarga).
      // Para un SVG el optimizador no aporta nada: no rasteriza, lo pasa igual.
      unoptimized
      loading="lazy"
      // Caja cuadrada fija + object-contain: escudos de proporciones distintas
      // ocupan lo mismo sin deformarse.
      className={`shrink-0 object-contain ${SIZE_BOX[size]} ${className}`}
    />
  );
}
