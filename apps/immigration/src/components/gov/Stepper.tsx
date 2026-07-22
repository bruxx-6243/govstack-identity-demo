import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  title: string;
  subtitle?: string;
}

interface Props {
  steps: Step[];
  current: number;
  onStepClick?: (id: number) => void;
}

export function Stepper({ steps, current, onStepClick }: Props) {
  const percent = Math.round(((current - 1) / (steps.length - 1)) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Progression
          </div>
          <div className="text-lg font-semibold text-foreground">
            Étape {current} sur {steps.length}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-cg-green">{percent}%</div>
          <div className="text-xs text-muted-foreground">complété</div>
        </div>
      </div>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-cg-green transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {steps.map((s) => {
          const done = s.id < current;
          const active = s.id === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onStepClick?.(s.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-2 rounded-md border p-3 text-left transition-colors",
                  active && "border-cg-green bg-cg-green-soft",
                  done && "border-cg-green/40 bg-card hover:bg-secondary/40",
                  !active && !done && "border-border bg-card hover:bg-secondary/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                    active && "bg-cg-green text-primary-foreground",
                    done && "bg-cg-green/15 text-cg-green",
                    !active && !done && "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <div className="text-xs font-medium leading-tight text-foreground">{s.title}</div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
