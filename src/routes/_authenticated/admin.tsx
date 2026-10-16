import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpDown, Users, Eye, Inbox, LogOut, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brand } from "@/components/agency/dashboard";
import { listLeads } from "@/lib/leads.functions";
import { getMyAccess } from "@/lib/team.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [desc, setDesc] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);

  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const { data, isLoading, error } = useQuery({ queryKey: ["leads"], queryFn: () => fetchLeads() });

  const leads = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = (data ?? []).filter(
      (l) => !term || l.name.toLowerCase().includes(term) || l.company.toLowerCase().includes(term),
    );
    return [...rows].sort((a, b) =>
      desc ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at),
    );
  }, [data, search, desc]);

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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const waLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, "")}`;

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <header className="admin-header">
          <Brand />
          <div>
            <h1>Formulários recebidos</h1>
            <p>Diagnósticos enviados pelos visitantes do site.</p>
          </div>
          {access?.isSuper && (
            <Button variant="ghost" asChild>
              <Link to="/admin/equipe"><Users /> Equipe</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={signOut}>
            <LogOut /> Sair
          </Button>
        </header>

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
                    <th>Enviado em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.name}</td>
                      <td>{lead.company}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.segment}</td>
                      <td>{dateTime.format(new Date(lead.created_at))}</td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(lead)}>
                          <Eye size={15} /> Ver respostas
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="admin-dialog">
          <DialogTitle>Respostas de {selected?.name}</DialogTitle>
          <DialogDescription>
            Enviado em {selected ? dateTime.format(new Date(selected.created_at)) : ""}
          </DialogDescription>
          {selected && (
            <dl className="admin-answers">
              {[
                ["Nome", selected.name],
                ["Empresa", selected.company],
                ["Segmento", selected.segment],
                ["Possui site", selected.has_site],
                ["Utiliza Instagram", selected.uses_instagram],
                ["Já anuncia", selected.advertises],
                ["Objetivos", selected.goals.join(", ")],
                ["WhatsApp", selected.phone],
                ["Localização", selected.location],
                ["Orçamento para anúncios", selected.budget],
                ["Autorizou contato", selected.consent ? "Sim" : "Não"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {selected && (
            <Button variant="premium" asChild>
              <a href={waLink(selected.phone)} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Conversar no WhatsApp
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
