import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadDetails, type Lead } from "@/components/agency/lead-details";
import { AdminHeader } from "@/components/agency/admin-nav";
import { listLeads } from "@/lib/leads.functions";
import { listResponsaveis } from "@/lib/agendamentos.functions";
import { salesQuery } from "@/lib/sales-query";
import { clientSituation, SITUATION_FILTERS, SITUATION_LABEL, type ClientSituation } from "@/lib/clients";
import { STAGE_LABEL, leadStage } from "@/lib/funnel";
import { currency } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/admin_/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | LAUX AGÊNCIA" },
      { name: "description", content: "Contatos do CRM da LAUX AGÊNCIA com filtro por situação comercial." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Clientes | LAUX AGÊNCIA" },
      { property: "og:description", content: "Consulta centralizada dos contatos do CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientesPage,
});

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const todaySP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function ClientesPage() {
  const fetchLeads = useServerFn(listLeads);
  const fetchResponsaveis = useServerFn(listResponsaveis);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientSituation | "todos">("todos");
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["leads"], queryFn: () => fetchLeads() });
  const { data: commercial } = useQuery(salesQuery);
  const { data: responsaveis } = useQuery({ queryKey: ["responsaveis"], queryFn: () => fetchResponsaveis(), staleTime: 60_000 });

  const emailOf = useMemo(() => new Map((responsaveis ?? []).map((r) => [r.id, r.email])), [responsaveis]);
  const salesByLead = useMemo(() => {
    const map = new Map<string, NonNullable<typeof commercial>["sales"]>();
    for (const s of commercial?.sales ?? []) {
      const list = map.get(s.lead_id) ?? [];
      list.push(s);
      map.set(s.lead_id, list);
    }
    return map;
  }, [commercial]);
  const meetingsByLead = useMemo(() => {
    const map = new Map<string, NonNullable<typeof commercial>["meetings"]>();
    for (const m of commercial?.meetings ?? []) {
      if (!m.lead_id) continue;
      const list = map.get(m.lead_id) ?? [];
      list.push(m);
      map.set(m.lead_id, list);
    }
    return map;
  }, [commercial]);
  const contractsByLead = useMemo(() => {
    const map = new Map<string, NonNullable<typeof commercial>["contracts"]>();
    for (const c of commercial?.contracts ?? []) {
      const list = map.get(c.lead_id) ?? [];
      list.push(c);
      map.set(c.lead_id, list);
    }
    return map;
  }, [commercial]);

  const rows = useMemo(() => {
    const today = todaySP();
    return (data ?? []).map((lead) => ({
      lead,
      situation: clientSituation(lead.funnel_stage, salesByLead.get(lead.id) ?? [], today, contractsByLead.get(lead.id) ?? []),
    }));
  }, [data, salesByLead, contractsByLead]);

  const stats = useMemo(() => ({
    total: rows.length,
    formulario: rows.filter((r) => r.situation === "somente_formulario").length,
    propostas: rows.filter((r) => r.situation === "proposta_enviada").length,
    ativos: rows.filter((r) => r.situation === "cliente_ativo").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(({ lead, situation }) => {
      if (filter !== "todos" && situation !== filter) return false;
      if (term && !lead.name.toLowerCase().includes(term) && !lead.company.toLowerCase().includes(term) && !lead.phone.replace(/\D/g, "").includes(term.replace(/\D/g, ""))) return false;
      return true;
    });
  }, [rows, search, filter]);

  const selectedSales = selected ? salesByLead.get(selected.id) ?? [] : [];
  const selectedMeetings = selected ? meetingsByLead.get(selected.id) ?? [] : [];

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <AdminHeader title="Clientes" subtitle="Todos os contatos do CRM, filtrados por situação comercial." />

        <div className="admin-stats">
          {([
            ["Total de contatos", stats.total],
            ["Somente formulário", stats.formulario],
            ["Propostas enviadas", stats.propostas],
            ["Clientes ativos", stats.ativos],
          ] as const).map(([label, value]) => (
            <div key={label} className="admin-card admin-stat">
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
                placeholder="Buscar por nome, empresa ou WhatsApp"
                aria-label="Buscar por nome, empresa ou WhatsApp"
              />
            </label>
            <div className="admin-filters" role="group" aria-label="Filtrar por situação comercial">
              {SITUATION_FILTERS.map(({ key, label }) => (
                <Button key={key} variant={filter === key ? "secondary" : "ghost"} size="sm" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</Button>
              ))}
            </div>
          </div>

          {isLoading && <p className="admin-empty">Carregando contatos...</p>}
          {error && <p role="alert" className="admin-empty text-destructive">Não foi possível carregar os contatos.</p>}
          {!isLoading && !error && filtered.length === 0 && (
            <p className="admin-empty"><Inbox size={18} /> Nenhum contato encontrado.</p>
          )}

          {filtered.length > 0 && (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Empresa</th>
                    <th>WhatsApp</th>
                    <th>Responsável</th>
                    <th>Situação</th>
                    <th>Serviço de interesse</th>
                    <th>Cadastro</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ lead, situation }) => (
                    <tr key={lead.id}>
                      <td>{lead.name}</td>
                      <td>{lead.company}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.assigned_to ? emailOf.get(lead.assigned_to) ?? "—" : <span className="lead-unassigned">Sem responsável</span>}</td>
                      <td><span className={`client-badge client-${situation}`}>{SITUATION_LABEL[situation]}</span></td>
                      <td>{lead.goals.join(", ")}</td>
                      <td>{dateFmt.format(new Date(lead.created_at))}</td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(lead)}>
                          <Eye size={15} /> Ver cliente
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LeadDetails
        lead={selected}
        onClose={() => setSelected(null)}
        extra={selected && (
          <div className="client-extra">
            <p><strong>Etapa do funil:</strong> {STAGE_LABEL[leadStage(selected.funnel_stage)]}</p>
            <div>
              <strong>Agendamentos vinculados</strong>
              {selectedMeetings.length === 0 ? <p className="client-extra-empty">Nenhum agendamento.</p> : (
                <ul>{selectedMeetings.map((m) => <li key={m.id}>{dateTimeFmt.format(new Date(m.data_hora_inicio))} — {m.status}</li>)}</ul>
              )}
            </div>
            <div>
              <strong>Vendas vinculadas</strong>
              {selectedSales.length === 0 ? <p className="client-extra-empty">Nenhuma venda registrada.</p> : (
                <ul>{selectedSales.map((s) => <li key={s.id}>{s.service} — {currency(s.initial_value)} ({s.status === "valida" ? s.contract_status : "cancelada"})</li>)}</ul>
              )}
            </div>
            {selected.closing_notes && <p><strong>Observações de fechamento:</strong> {selected.closing_notes}</p>}
            {selected.loss_reason && <p><strong>Motivo da perda:</strong> {selected.loss_reason}</p>}
          </div>
        )}
      />
    </main>
  );
}
