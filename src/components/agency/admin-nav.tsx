import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { CalendarDays, Columns3, Inbox, LogOut, Users, ChartNoAxesCombined, ShoppingBag, ContactRound, FileText, Activity, Menu } from "lucide-react";
import { getMyAccess } from "@/lib/team.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Notifications } from "./notifications";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: ChartNoAxesCombined, group: "VISÃO GERAL" },
  { to: "/admin/atividades", label: "Atividades", icon: Activity, group: "VISÃO GERAL" },
  { to: "/admin/clientes", label: "Clientes", icon: ContactRound, group: "COMERCIAL" },
  { to: "/admin/formularios", label: "Formulários", icon: Inbox, group: "COMERCIAL" },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays, group: "COMERCIAL" },
  { to: "/admin/funil", label: "Funil de Vendas", icon: Columns3, group: "COMERCIAL" },
  { to: "/admin/vendas", label: "Vendas", icon: ShoppingBag, group: "COMERCIAL" },
  { to: "/admin/contratos", label: "Contratos", icon: FileText, group: "COMERCIAL" },
] as const;

export function AdminBrand() {
  return (
    <Link to="/admin/dashboard" search={{ period: 'month', from: '', to: '', seller: '' }} className="brand admin-brand" aria-label="LAUX AGÊNCIA — painel">
      <span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand-word">LAUX<span className="brand-sub">AGÊNCIA</span></span>
    </Link>
  );
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setExiting(true); setError("");
    try {
      await queryClient.cancelQueries();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      queryClient.clear();
      onNavigate?.();
      void navigate({ to: "/auth", replace: true });
    } catch { setError("Não foi possível sair. Tente novamente."); }
    finally { setExiting(false); }
  }

  return (
    <nav className="admin-nav" aria-label="Navegação do painel">
      {["VISÃO GERAL", "COMERCIAL"].map(group => <div className="admin-nav-group" key={group}>
        <h2>{group}</h2>
        {NAV.filter(item => item.group === group).map(({ to, label, icon: Icon }) => (
        <Button asChild variant="ghost" key={to} className="admin-nav-btn"><Link
          key={to}
          to={to}
          search={to === '/admin/dashboard' ? { period: 'month', from: '', to: '', seller: '' } : to === '/admin/vendas' ? { q: '' } : {}}
          className="admin-nav-btn"
          activeProps={{ className: "admin-nav-btn active" }}
          activeOptions={{ exact: true }}
          onClick={onNavigate}
        >
          <Icon size={16} /> {label}
        </Link></Button>
      ))}</div>)}
      <div className="admin-nav-group admin-nav-administration"><h2>ADMINISTRAÇÃO</h2>
      {access?.isSuper && (
        <Button asChild variant="ghost" className="admin-nav-btn"><Link
          to="/admin/equipe"
          className="admin-nav-btn"
          activeProps={{ className: "admin-nav-btn active" }}
          onClick={onNavigate}
        >
          <Users size={16} /> Equipe
        </Link></Button>
      )}
      <Button type="button" variant="ghost" className="admin-nav-btn admin-nav-exit" disabled={exiting} onClick={signOut}>
        <LogOut size={16} /> {exiting ? "Saindo..." : "Sair"}
      </Button>{error && <p role="alert" className="text-destructive text-sm">{error}</p>}</div>
    </nav>
  );
}

export function AdminHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: string; children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
    <aside className="admin-sidebar"><AdminBrand /><AdminNav /></aside>
    <header className="admin-header crm-header">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button className="admin-menu-toggle" variant="outline" size="icon" aria-label="Abrir menu" title="Menu"><Menu /></Button></SheetTrigger><SheetContent side="left" className="admin-mobile-sidebar" aria-describedby={undefined}><SheetTitle className="sr-only">Menu do CRM</SheetTitle><AdminBrand /><AdminNav onNavigate={() => setMenuOpen(false)} /></SheetContent></Sheet>
      <div className="admin-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <Notifications />
      {children}
    </header>
    </>
  );
}
