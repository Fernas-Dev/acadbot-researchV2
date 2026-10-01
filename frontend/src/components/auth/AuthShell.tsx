import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/primitives.js";
import { IntegrationNotice } from "@/components/common/states.js";
import { useAuth } from "@/hooks/useAuth.js";

/** Moldura comum das páginas de autenticação. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element {
  const { configured, setupMessage } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          AR
        </span>
        <span className="text-base font-semibold">AcadBot Research</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {!configured ? (
            <IntegrationNotice
              title="Autenticação não configurada"
              description={setupMessage}
              variant="warning"
            />
          ) : null}

          {children}
        </CardContent>
      </Card>

      {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3" aria-hidden />
        Os teus dados são privados. O sistema nunca inventa referências.
        <FlaskConical className="size-3" aria-hidden />
      </p>
    </div>
  );
}
