import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw, ServerCrash } from "lucide-react";
import { Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { cn } from "@/lib/utils.js";

/* ------------------------------ Estados vazios (§48) ------------------------------ */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: typeof Inbox;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Erros amigáveis (§47) ------------------------------ */

export function ErrorState({
  title = "Não foi possível carregar a informação",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-destructive">
        <ServerCrash className="size-4" aria-hidden />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {description ??
          "Ocorreu um problema ao comunicar com o servidor. Tenta novamente — se persistir, verifica a configuração do ambiente."}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

/* --------------------------- Estados de carregamento (§49) --------------------------- */

export function LoadingBlock({ label = "A carregar…", className }: { label?: string; className?: string }): JSX.Element {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)} role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatCardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </CardContent>
    </Card>
  );
}

/* --------------------------- Avisos de integração (§58) --------------------------- */

export function IntegrationNotice({
  title,
  description,
  variant = "warning",
}: {
  title: string;
  description: string;
  variant?: "warning" | "info";
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        variant === "warning" ? "border-warning/40 bg-warning/5" : "border-border bg-secondary/40",
      )}
    >
      <AlertTriangle
        className={cn("mt-0.5 size-4 shrink-0", variant === "warning" ? "text-warning" : "text-muted-foreground")}
        aria-hidden
      />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
