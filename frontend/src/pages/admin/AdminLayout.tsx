import { NavLink, Outlet } from "react-router-dom";
import { Activity, Database, FileText, Gauge, Server, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { cn } from "@/lib/utils.js";

const ADMIN_NAV = [
  { to: "/admin", label: "Visão geral", icon: Gauge, end: true },
  { to: "/admin/users", label: "Utilizadores", icon: Users },
  { to: "/admin/research", label: "Pesquisas", icon: FileText },
  { to: "/admin/validation", label: "Validações", icon: Database },
  { to: "/admin/providers", label: "Providers", icon: Server },
  { to: "/admin/usage", label: "Uso", icon: Activity },
  { to: "/admin/logs", label: "Logs", icon: Settings2 },
];

/** Layout da área administrativa (§42). */
export function AdminLayout(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administração"
        description="Utilizadores, pesquisas, validações, providers, uso e logs do sistema."
      />

      <nav className="flex flex-wrap gap-1 border-b pb-2" aria-label="Navegação administrativa">
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
              )
            }
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
