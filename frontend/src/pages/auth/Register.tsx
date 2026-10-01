import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell.js";
import { Button, Input, Label } from "@/components/ui/primitives.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.js";

export default function RegisterPage(): JSX.Element {
  const { signUp, configured } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    institution: "",
    studyArea: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        institution: form.institution.trim() || undefined,
        studyArea: form.studyArea.trim() || undefined,
      });

      if (needsEmailConfirmation) {
        toast({
          title: "Conta criada",
          description: "Confirma o teu email para ativar a conta.",
          variant: "success",
        });
        navigate("/verify-email", { replace: true });
      } else {
        toast({ title: "Conta criada com sucesso", variant: "success" });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Criar conta"
      subtitle="O perfil é criado automaticamente e os teus dados ficam privados."
      footer={
        <>
          Já tens conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo *</Label>
          <Input id="name" required value={form.name} onChange={update("name")} placeholder="João Silva" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" required value={form.email} onChange={update("email")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Palavra-passe *</Label>
            <Input id="password" type="password" required minLength={8} value={form.password} onChange={update("password")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar *</Label>
            <Input id="confirm" type="password" required value={form.confirm} onChange={update("confirm")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="institution">Instituição (opcional)</Label>
            <Input id="institution" value={form.institution} onChange={update("institution")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="study-area">Área de estudo (opcional)</Label>
            <Input id="study-area" value={form.studyArea} onChange={update("studyArea")} />
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading || !configured}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
