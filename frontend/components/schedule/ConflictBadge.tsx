// RF-15: Badge de indicador de conflicto en la grilla
import type { Conflict } from "@/types/schedule";

interface ConflictBadgeProps {
  conflict: Conflict;
}

export default function ConflictBadge({ conflict }: ConflictBadgeProps) {
  return (
    <span
      role="alert"
      className="inline-flex items-center gap-1 rounded-full bg-ship-red/10 px-2 py-0.5 text-xs font-medium text-ship-red"
      title={conflict.details}
    >
      ⚠ {conflict.message}
    </span>
  );
}
