import { useEffect, useState } from "react";
import { KeyRound, Loader2, Moon, Save, Sun } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui/primitives.js";
import { IntegrationNotice } from "@/components/common/states.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.js";

/** Configurações (§8): perfil, palavra-passe, tema e estado das integrações. */
export default function SettingsPage(): JSX.Element {
  const { profile, updateProfile, updatePassword, configured, setupMessage } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [studyArea, setStudyArea] = useState("");
  const [password, setPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    setName(profile?.name ?? "");
    setInstitution(profile?.institution ?? "");
    setStudyArea(profile?.study_area ?? "");
  }, [profile]);

  const saveProfile = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        institution: institution.trim() || null,
        studyArea: studyArea.trim() || null,
      });
      toast({ title: "Perfil atualizado", variant: "success" });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : undefined, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: "A palavra-passe deve ter pelo menos 8 caracteres.", variant: "warning" });
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      setPassword("");
      toast({ title: "Palavra-passe atualizada", variant: "success" });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : undefined, variant: "error" });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleTheme = (): void => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("acadbot-theme", next ? "dark" : "light");
    } catch {
      /* armazenamento indisponível */
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Perfil, segurança e preferências da aplicação." />

      {!configured ? (
        <IntegrationNotice title="Autenticação não configurada" description={setupMessage} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Nome *</Label>
                <Input id="s-name" required value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-inst">Instituição</Label>
                <Input id="s-inst" value={institution} onChange={(event) => setInstitution(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-area">Área de estudo</Label>
                <Input id="s-area" value={studyArea} onChange={(event) => setStudyArea(event.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar perfil
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Palavra-passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-1.5">
              <Label htmlFor="s-pass">Nova palavra-passe</Label>
              <Input
                id="s-pass"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Atualizar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência e conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Tema da interface</p>
            <p className="text-xs text-muted-foreground">Alterna entre modo claro e escuro.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{profile?.role === "admin" ? "Administrador" : "Plano gratuito"}</Badge>
            <Button variant="outline" onClick={toggleTheme}>
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {dark ? "Modo claro" : "Modo escuro"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
