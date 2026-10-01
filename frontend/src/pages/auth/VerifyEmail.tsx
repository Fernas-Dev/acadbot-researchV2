import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell.js";
import { Button } from "@/components/ui/primitives.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.js";

export default function VerifyEmailPage(): JSX.Element {
  const { configured, session, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const checkedOnce = useRef(false);

  // Quando a sessão fica ativa (email confirmado), seguimos para o dashboard.
  useEffect(() => {
    if (session && !checkedOnce.current) {
      checkedOnce.current = true;
      void refreshProfile();
      toast({ title: "Email confirmado", description: "Bem-vindo(a) ao AcadBot Research.", variant: "success" });
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate, refreshProfile, toast]);

  const resend = async (): Promise<void> => {
    setResending(true);
    try {
      toast({ title: "Link reenviado", description: "Se o email ainda não chegou, verifica a pasta de spam.", variant: "info" });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Confirma o teu email"
      subtitle="Enviámos um link de confirmação para o teu endereço de email."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-4 text-sm">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Assim que confirmares o email, a tua sessão será iniciada automaticamente nesta página.
        </p>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={resend} disabled={resending || !configured}>
            <RefreshCw className={resending ? "size-4 animate-spin" : "size-4"} />
            Reenviar email de confirmação
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/login">Já confirmei — ir para o login</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
