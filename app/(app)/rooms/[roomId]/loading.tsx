import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Sin un `loading.tsx`, el prefetch de `<Link>` sobre rutas dinámicas no puede
 * precargar el segmento y cada cambio de pestaña bloquea hasta que llega el RSC.
 * Este boundary cubre las 5 pestañas de la sala (partidos, ranking, historial,
 * miembros, ajustes): el layout con el selector y las pestañas se mantiene
 * visible y solo el contenido muestra el esqueleto.
 */
export default function RoomSectionLoading() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
