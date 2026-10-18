import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpDown, Eye, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadDetails, followupState } from "@/components/agency/lead-details";
import { AdminHeader } from "@/components/agency/admin-nav";
import { listLeads } from "@/lib/leads.functions";
import { listResponsaveis } from "@/lib/agendamentos.functions";
import { getMyAccess } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/admin_/formularios")({
  head: () => ({
    meta: [
      { title: "Painel de formulários | LAUX AGÊNCIA" },
      { name: "description", content: "Painel privado com os formulários de diagnóstico recebidos pelo site da LAUX AGÊNCIA." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel de formulários | LAUX AGÊNCIA" },
      { property: "og:description", content: "Acompanhe os formulários recebidos pelo site da LAUX AGÊNCIA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Lead = Awaited<ReturnType<typeof listLeads>>[number];

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function AdminPage() {
  const fetchLeads = useServerFn(listLeads);
  const fetchResponsaveis = useServerFn(listResponsaveis);
  const fetchAccess = useServerFn(getMyAccess);
  const [search, setSearch] = useState("");
  const [desc, setDesc] = useState(true);
  const [filter, setFilter] = useState<"todos" | "meus" | "retornos">("todos");
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["leads"], queryFn: () => fetchLeads() });
  const { data: responsaveis } = useQuery({ queryKey: ["responsaveis"], queryFn: () => fetchResponsaveis(), staleTime: 60_000 });
  const { data: access } = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess(), staleTime: 60_000 });
  const emailOf = useMemo(() => new Map((responsaveis ?? []).map((r) => [r.id, r.email])), [responsaveis]);

  const leads = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = (data ?? []).filter((l) => {
      if (term && !l.name.toLowerCase().includes(term) && !l.company.toLowerCase().includes(term)) return false;
      if (filter === "meus" && l.assigned_to !== access?.userId) return false;
      if (filter === "retornos" && !(l.followup_date && !l.followup_done)) return false;
      return true;
    });
    return [...rows].sort((a, b) =>
      desc ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at),
    );
  }, [data, search, desc, filter, access]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const at = (l: Lead) => new Date(l.created_at).getTime();
    return {
      total: rows.length,
      today: rows.filter((l) => at(l) >= startOfDay).length,
      week: rows.filter((l) => at(l) >= weekAgo).length,
      month: rows.filter((l) => at(l) >= startOfMonth).length,
    };
  }, [data]);


  return (
    <main className="admin-shell">
      <div className="admin-container">
        <AdminHeader title="Formulários recebidos" subtitle="Diagnósticos enviados pelos visitantes do site." />

        <div className="admin-stats">
          {[
            ["Total", stats.total],
            ["Hoje", stats.today],
            ["Últimos 7 dias", stats.week],
            ["Mês atual", stats.month],
          ].map(([label, value]) => (
            <div key={label as string} className="admin-card admin-stat">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="admin-card admin-table-card">
          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou empresa"
                aria-label="Buscar por nome ou empresa"
              />
            </label>
            <div className="admin-filters" role="group" aria-label="Filtrar formulários">
              {([["todos", "Todos"], ["meus", "Meus leads"], ["retornos", "Retornos pendentes"]] as const).map(([key, label]) => (
                <Button key={key} variant={filter === key ? "secondary" : "ghost"} size="sm" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</Button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setDesc((v) => !v)}>
              <ArrowUpDown size={16} /> {desc ? "Mais recentes" : "Mais antigos"}
            </Button>
          </div>

          {isLoading && <p className="admin-empty">Carregando formulários...</p>}
          {error && (
            <p role="alert" className="admin-empty text-destructive">
              Não foi possível carregar os formulários.
            </p>
          )}
          {!isLoading && !error && leads.length === 0 && (
            <p className="admin-empty">
              <Inbox size={18} /> Nenhum formulário recebido ainda.
            </p>
          )}

          {leads.length > 0 && (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Empresa</th>
                    <th>WhatsApp</th>
                    <th>Segmento</th>
                    <th>Responsável</th>
                    <th>Retorno</th>
                    <th>Enviado em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const state = followupState(lead);
                    return (
                    <tr key={lead.id}>
                      <td>{lead.name}</td>
                      <td>{lead.company}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.segment}</td>
                      <td>{lead.assigned_to ? emailOf.get(lead.assigned_to) ?? "—" : <span className="lead-unassigned">Sem responsável</span>}</td>
                      <td>{state && <span className={`followup-badge followup-${state}`}>{state === "atrasado" ? "Retorno atrasado" : state === "hoje" ? "Retorno hoje" : "Retorno futuro"}</span>}</td>
                      <td>{dateTime.format(new Date(lead.created_at))}</td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(lead)}>
                          <Eye size={15} /> Ver respostas
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LeadDetails lead={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
