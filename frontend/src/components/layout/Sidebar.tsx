import { NavLink } from "react-router-dom";
import {
  BookMarked,
  FileText,
  History,
  LayoutDashboard,
  Library,
  Quote,
  Search,
  Settings,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { cn, initialsOf } from "@/lib/utils.js";
import { useAuth } from "@/hooks/useAuth.js";
import { Badge } from "@/components/ui/primitives.js";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Search;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Meus Projetos", icon: BookMarked },
  { to: "/research/new", label: "Nova Pesquisa", icon: Search },
  { to: "/validate", label: "Validar Referência", icon: ShieldCheck },
  { to: "/library", label: "Biblioteca", icon: Library },
  { to: "/matrix", label: "Matriz de Literatura", icon: Table2 },
  { to: "/citations", label: "Citações", icon: Quote },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/settings", label: "Configurações", icon: Settings },
  { to: "/admin", label: "Administração", icon: FileText, adminOnly: true },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex h-full flex-col gap-6 border-r bg-card px-3 py-5">
      <NavLink to="/dashboard" className="flex items-center gap-2 px-2" onClick={onNavigate}>
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          AR
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold">AcadBot Research</span>
          <span className="text-[11px] text-muted-foreground">Pesquisa académica verificável</span>
        </span>
      </NavLink>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rounded-lg border bg-secondary/40 p-3">
        <p className="text-xs font-medium">
          {profile?.name ?? user?.email ?? "Sessão ativa"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user?.email ?? "—"}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {initialsOf(profile?.name, user?.email)}
          </span>
          {isAdmin ? <Badge variant="default">Administrador</Badge> : <Badge variant="outline">Plano gratuito</Badge>}
        </div>
      </div>
    </div>
  );
}
