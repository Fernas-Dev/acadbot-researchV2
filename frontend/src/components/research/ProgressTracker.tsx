import { Check, Circle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/primitives.js";
import { cn } from "@/lib/utils.js";
import type { ProgressStep } from "@/types";

/**
 * Progresso da pesquisa assíncrona (§33).
 * Mostra cada etapa: análise, queries, providers, deduplicação, relevância.
 */
export function ProgressTracker({
  steps,
  percent,
  warnings,
}: {
  steps: ProgressStep[];
  percent: number;
  warnings?: string[];
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso da pesquisa</span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} />
      </div>

      <ul className="space-y-2" aria-live="polite">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            {step.state === "done" ? (
              <Check className="size-4 text-success" aria-hidden />
            ) : step.state === "active" ? (
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            ) : step.state === "failed" ? (
              <XCircle className="size-4 text-destructive" aria-hidden />
            ) : (
              <Circle className="size-3.5 text-muted-foreground/50" aria-hidden />
            )}
            <span
              className={cn(
                step.state === "pending" ? "text-muted-foreground" : "text-foreground",
                step.state === "failed" && "text-destructive",
              )}
            >
              {step.label}
            </span>
            {step.detail ? <span className="text-xs text-muted-foreground">({step.detail})</span> : null}
          </li>
        ))}
      </ul>

      {warnings && warnings.length > 0 ? (
        <div className="space-y-1 rounded-md border border-warning/40 bg-warning/5 p-3">
          {warnings.map((warning) => (
            <p key={warning} className="text-xs text-muted-foreground">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
