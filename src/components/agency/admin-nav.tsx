import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { CalendarDays, Columns3, Inbox, LogOut, Users, ChartNoAxesCombined, ShoppingBag, ContactRound } from "lucide-react";
import { getMyAccess } from "@/lib/team.functions";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: ChartNoAxesCombined, exact: false },
  { to: "/admin/vendas", label: "Vendas", icon: ShoppingBag, exact: false },
  { to: "/admin", label: "Formulários", icon: Inbox, exact: true },
  { to: "/admin/clientes", label: "Clientes", icon: ContactRound, exact: false },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays, exact: false },
  { to: "/admin/funil", label: "Funil de Vendas", icon: Columns3, exact: false },
] as const;

export function AdminBrand() {
  return (
    <Link to="/admin" className="brand admin-brand" aria-label="LAUX AGÊNCIA — painel">
      <span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand-word">LAUX<span className="brand-sub">AGÊNCIA</span></span>
    </Link>
  );
}

export function AdminNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <nav className="admin-nav" aria-label="Navegação do painel">
      {NAV.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          className="admin-nav-btn"
          activeProps={{ className: "admin-nav-btn active" }}
          activeOptions={{ exact }}
        >
          <Icon size={16} /> {label}
        </Link>
      ))}
      {access?.isSuper && (
        <Link
          to="/admin/equipe"
          className="admin-nav-btn"
          activeProps={{ className: "admin-nav-btn active" }}
        >
          <Users size={16} /> Equipe
        </Link>
      )}
      <span className="admin-nav-sep" aria-hidden="true" />
      <button type="button" className="admin-nav-btn admin-nav-exit" onClick={signOut}>
        <LogOut size={16} /> Sair
      </button>
    </nav>
  );
}

export function AdminHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="admin-header">
      <AdminBrand />
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <AdminNav />
      {children}
    </header>
  );
}
