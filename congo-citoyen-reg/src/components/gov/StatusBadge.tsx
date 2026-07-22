import { cn } from "@/lib/utils";
import type { EnrollmentStatus, DocumentStatus } from "@/domain/enrollment";

const map: Record<string, string> = {
  "Validé": "bg-cg-green-soft text-cg-green-dark border-cg-green/30",
  "En attente de validation": "bg-yellow-50 text-yellow-800 border-yellow-300",
  "Brouillon": "bg-secondary text-muted-foreground border-border",
  "Rejeté": "bg-red-50 text-cg-red border-cg-red/30",
  "Non fourni": "bg-secondary text-muted-foreground border-border",
  "Téléversé": "bg-blue-50 text-blue-700 border-blue-200",
  "Vérifié": "bg-cg-green-soft text-cg-green-dark border-cg-green/30",
};

export function StatusBadge({ status }: { status: EnrollmentStatus | DocumentStatus }) {
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
