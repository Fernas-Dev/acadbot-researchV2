import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Plus, Sun, X } from "lucide-react";
import { Sidebar } from "./Sidebar.js";
import { Button } from "@/components/ui/primitives.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.js";
import { cn } from "@/lib/utils.js";

function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = (): void => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("acadbot-theme", next ? "dark" : "light");
    } catch {
      /* armazenamento indisponível — tema mantém-se na sessão */
    }
  };
  return { dark, toggle };
}

/**
 * Layout da aplicação (§46): sidebar fixa em desktop, drawer em mobile/tablet.
 */
export function AppLayout(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signOut, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    toast({ title: "Sessão terminada", variant: "info" });
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar fixa (desktop) */}
      <aside className="hidden w-66 shrink-0 lg:block" aria-label="Navegação principal">
        <div className="fixed inset-y-0 left-0 w-66">
          <Sidebar />
        </div>
      </aside>

      {/* Drawer (mobile/tablet) */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", drawerOpen ? "" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-black/50 transition-opacity", drawerOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 bg-card shadow-xl transition-transform",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
          role="dialog"
          aria-label="Menu de navegação"
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </Button>

          <Link to="/dashboard" className="text-sm font-semibold lg:hidden">
            AcadBot
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/research/new">
                <Plus className="size-3.5" />
                Nova pesquisa
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} title={profile?.email ?? undefined}>
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
