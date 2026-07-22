import { Link } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import congoLogo from "@/assets/congo.svg";

interface Props {
  juridiction?: string;
  agent?: string;
}

export function GovHeader({
  juridiction = "Tribunal de grande instance de Brazzaville",
  agent = "Agent #0021",
}: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-border bg-card print:static">
      <div className="flag-stripe" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={congoLogo} alt="République du Congo" className="h-12 w-12" />
          <div className="leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              République du Congo — Ministère de la Justice
            </div>
            <div className="text-base font-medium text-foreground uppercase">Casier Judiciaire</div>
          </div>
        </Link>

        <div className="hidden items-center gap-3 rounded-md border border-border bg-secondary/40 px-4 py-2 md:flex">
          <div className="text-right leading-tight">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Juridiction
            </div>
            <div className="text-sm font-medium text-foreground">{juridiction}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cg-green text-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Agent
              </div>
              <div className="text-sm font-medium text-foreground">{agent}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
