import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell.js";
import { Button, Input, Label } from "@/components/ui/primitives.js";
import { useAuth } from "@/hooks/useAuth.js";

export default function ForgotPasswordPage(): JSX.Element {
  const { resetPassword, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar palavra-passe"
      subtitle="Enviaremos um link de redefinição para o teu email."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" />
          Voltar ao login
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 rounded-md border border-success/40 bg-success/5 p-3 text-sm text-success">
            <MailCheck className="size-4 shrink-0" aria-hidden />
            Email enviado. Verifica a caixa de entrada e a pasta de spam.
          </p>
          <Button variant="outline" asChild className="w-full">
            <Link to="/login">Voltar ao login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading || !configured}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar link de recuperação
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
