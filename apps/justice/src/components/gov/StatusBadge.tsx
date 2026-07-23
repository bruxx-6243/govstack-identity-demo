import { cn } from "@/lib/utils";
import type { CasierStatus } from "@/domain/casier";

const map: Record<string, string> = {
  Validée: "bg-cg-green-soft text-cg-green-dark border-cg-green/30",
  "En instruction": "bg-yellow-50 text-yellow-800 border-yellow-300",
  Soumise: "bg-secondary text-muted-foreground border-border",
  Rejetée: "bg-red-50 text-cg-red border-cg-red/30",
};

export function StatusBadge({ status }: { status: CasierStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        map[status] || "bg-secondary text-foreground border-border",
      )}
    >
      {status}
    </span>
  );
}
