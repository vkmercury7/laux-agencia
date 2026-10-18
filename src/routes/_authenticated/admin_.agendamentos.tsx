import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Eye, MessageCircle, Pencil, Plus, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminHeader } from "@/components/agency/admin-nav";
import { getMyAccess } from "@/lib/team.functions";
import { listLeads } from "@/lib/leads.functions";
import {
  listAgendamentos, listResponsaveis, saveAgendamento, setAgendamentoStatus, STATUS,
} from "@/lib/agendamentos.functions";

export const Route = createFileRoute("/_authenticated/admin_/agendamentos")({
  head: () => ({
    meta: [
      { title: "Agendamentos | LAUX AGÊNCIA" },
      { name: "description", content: "Agenda privada de reuniões comerciais da LAUX AGÊNCIA." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Agendamentos | LAUX AGÊNCIA" },
      { property: "og:description", content: "Cadastre e acompanhe reuniões comerciais da LAUX AGÊNCIA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendamentosPage,
});

type Ag = Awaited<ReturnType<typeof listAgendamentos>>[number];
type Status = (typeof STATUS)[number];

const TZ = "America/Sao_Paulo";
const STATUS_LABEL: Record<Status, string> = {
  agendada: "Agendada", confirmada: "Confirmada", realizada: "Realizada", nao_compareceu: "Não compareceu", cancelada: "Cancelada",
};
const SERVICOS = ["Gestão de tráfego pago", "Criação de site", "Gestão de tráfego + site", "Automação com IA", "Outro"];
const MODALIDADES = ["Ligação telefônica", "WhatsApp", "Google Meet", "Outra"];
const ORIGENS = ["Landing page", "WhatsApp", "Indicação", "Prospecção", "Outro"];

const fmtDate = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short" });
const fmtTime = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const spDay = (iso: string | Date) => isoDay.format(new Date(iso));
const spTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function waLink(a: Ag) {
  const msg = `Olá, ${a.nome_cliente}! Tudo bem? Aqui é da LAUX AGÊNCIA. Estou entrando em contato sobre nossa reunião agendada para ${fmtDate.format(new Date(a.data_hora_inicio))} às ${fmtTime.format(new Date(a.data_hora_inicio))}.`;
  return `https://wa.me/55${a.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

const empty = {
  lead_id: null as string | null, nome_cliente: "", empresa: "", whatsapp: "", segmento: "", servico: "",
  data: "", hora: "", duracao_minutos: 30, responsavel_id: "", modalidade: "WhatsApp", link_reuniao: "",
  origem: "", observacoes: "",
};
type Form = typeof empty & { id?: string };

function AgendamentosPage() {
  const qc = useQueryClient();
  const fetchAg = useServerFn(listAgendamentos);
  const fetchResp = useServerFn(listResponsaveis);
  const fetchLeads = useServerFn(listLeads);
  const save = useServerFn(saveAgendamento);
  const setStatus = useServerFn(setAgendamentoStatus);
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess() });
  const canCreate = Boolean(access?.isAdmin || access?.roles.some(r => ["seller", "collaborator", "sdr"].includes(r)));
  const canEdit = (a: Ag) => Boolean(access?.isAdmin || (canCreate && leads?.some(l => l.id === a.lead_id && l.assigned_to === access?.userId)));

  const { data, isLoading, error } = useQuery({ queryKey: ["agendamentos"], queryFn: () => fetchAg() });
  const { data: resp } = useQuery({ queryKey: ["responsaveis"], queryFn: () => fetchResp() });
  const { data: leads } = useQuery({ queryKey: ["leads"], queryFn: () => fetchLeads() });

  const [search, setSearch] = useState("");
  const [fDate, setFDate] = useState("");
  const [fResp, setFResp] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [detail, setDetail] = useState<Ag | null>(null);
  const [leadView, setLeadView] = useState<string | null>(null);

  const now = Date.now();
  const today = spDay(new Date());
  const rows = data ?? [];
  const stats = {
    hoje: rows.filter((a) => a.status !== "cancelada" && spDay(a.data_hora_inicio) === today).length,
    proximas: rows.filter((a) => ["agendada", "confirmada"].includes(a.status) && new Date(a.data_hora_inicio).getTime() > now).length,
    realizadas: rows.filter((a) => a.status === "realizada").length,
    canceladas: rows.filter((a) => a.status === "cancelada").length,
  };

  const list = useMemo(() => {
    const t = search.trim().toLowerCase();
    const f = rows.filter((a) =>
      (!t || a.nome_cliente.toLowerCase().includes(t) || (a.empresa ?? "").toLowerCase().includes(t)) &&
      (!fDate || spDay(a.data_hora_inicio) === fDate) &&
      (!fResp || a.responsavel_id === fResp) &&
      (!fStatus || a.status === fStatus));
    const up = f.filter((a) => new Date(a.data_hora_inicio).getTime() >= now);
    const past = f.filter((a) => new Date(a.data_hora_inicio).getTime() < now).reverse();
    return [...up, ...past];
  }, [rows, search, fDate, fResp, fStatus, now]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["agendamentos"] });

  function openNew() { setForm({ ...empty }); setFormError(""); setLeadSearch(""); }
  function openEdit(a: Ag) {
    setDetail(null); setFormError("");
    setForm({
      id: a.id, lead_id: a.lead_id, nome_cliente: a.nome_cliente, empresa: a.empresa ?? "", whatsapp: a.whatsapp,
      segmento: a.segmento ?? "", servico: a.servico ?? "", data: spDay(a.data_hora_inicio), hora: spTime(a.data_hora_inicio),
      duracao_minutos: a.duracao_minutos, responsavel_id: a.responsavel_id, modalidade: a.modalidade,
      link_reuniao: a.link_reuniao ?? "", origem: a.origem ?? "", observacoes: a.observacoes ?? "",
    });
  }
  function pickLead(id: string) {
    const l = leads?.find((x) => x.id === id);
    if (!l || !form) return;
    setForm({ ...form, lead_id: l.id, nome_cliente: l.name, empresa: l.company, whatsapp: l.phone, segmento: l.segment,
      servico: form.servico || "", origem: form.origem || "Landing page",
      observacoes: form.observacoes || (l.goals.length ? `Objetivos do diagnóstico: ${l.goals.join(", ")}` : "") });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    if (!form.nome_cliente.trim() || !form.data || !form.hora || !form.responsavel_id || !/^\(\d{2}\) 9?\d{4}-\d{4}$/.test(form.whatsapp)) {
      setFormError("Preencha nome, WhatsApp válido, data, horário e responsável."); return;
    }
    setSaving(true); setFormError("");
    try {
      await save({ data: { ...form, duracao_minutos: Number(form.duracao_minutos) } });
      setForm(null); await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["leads"] })]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSaving(false); }
  }

  async function changeStatus(a: Ag, status: Status) {
    if (status === "cancelada" && !confirm("Cancelar esta reunião? Ela continuará no histórico.")) return;
    try {
      await setStatus({ data: { id: a.id, status } });
      await refresh();
      setDetail((d) => (d && d.id === a.id ? { ...d, status } : d));
    } catch (err) { alert(err instanceof Error ? err.message : "Não foi possível alterar o status."); }
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    form && setForm({ ...form, [k]: k === "whatsapp" ? maskPhone(e.target.value) : e.target.value });

  const filteredLeads = (leads ?? []).filter((l) => {
    const t = leadSearch.trim().toLowerCase();
    return !t || l.name.toLowerCase().includes(t) || l.company.toLowerCase().includes(t);
  }).slice(0, 50);
  const lead = leads?.find((l) => l.id === leadView);

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <AdminHeader title={<><CalendarDays size={22} className="inline text-primary" /> Agendamentos</>} subtitle="Reuniões comerciais da equipe (horário de Brasília).">
          <Button variant="premium" disabled={!canCreate} onClick={openNew}><Plus /> Novo agendamento</Button>
        </AdminHeader>

        <div className="admin-stats">
          {([["Reuniões de hoje", stats.hoje], ["Próximas reuniões", stats.proximas], ["Realizadas", stats.realizadas], ["Canceladas", stats.canceladas]] as const).map(([l, v]) => (
            <div key={l} className="admin-card admin-stat"><span>{l}</span><strong>{isLoading ? "–" : v}</strong></div>
          ))}
        </div>

        <div className="admin-card admin-table-card">
          <div className="admin-toolbar ag-filters">
            <label className="admin-search">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente ou empresa" aria-label="Buscar cliente ou empresa" />
            </label>
            <input type="date" className="ag-input" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="Filtrar por data" />
            <select className="ag-input" value={fResp} onChange={(e) => setFResp(e.target.value)} aria-label="Filtrar por responsável">
              <option value="">Todos os responsáveis</option>
              {resp?.map((r) => <option key={r.id} value={r.id}>{r.email}</option>)}
            </select>
            <select className="ag-input" value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filtrar por status">
              <option value="">Todos os status</option>
              {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          {isLoading && <p className="admin-empty">Carregando agendamentos...</p>}
          {error && <p role="alert" className="admin-empty text-destructive">Não foi possível carregar os agendamentos.</p>}
          {!isLoading && !error && list.length === 0 && <p className="admin-empty"><CalendarDays size={18} /> Nenhum agendamento encontrado.</p>}

          {list.length > 0 && (
            <div className="admin-table-scroll">
              <table className="admin-table ag-table">
                <thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Empresa</th><th>Responsável</th><th>Serviço</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Data">{fmtDate.format(new Date(a.data_hora_inicio))}</td>
                      <td data-label="Horário">{fmtTime.format(new Date(a.data_hora_inicio))}</td>
                      <td data-label="Cliente">{a.nome_cliente}</td>
                      <td data-label="Empresa">{a.empresa ?? "—"}</td>
                      <td data-label="Responsável">{a.responsavel_email}</td>
                      <td data-label="Serviço">{a.servico ?? "—"}</td>
                      <td data-label="Status"><span className={`ag-badge ag-${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                      <td className="ag-actions">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(a)} aria-label="Ver detalhes"><Eye size={15} /></Button>
                        <Button variant="ghost" size="sm" disabled={!canEdit(a)} onClick={() => openEdit(a)} aria-label="Editar ou remarcar"><Pencil size={15} /></Button>
                        <Button variant="ghost" size="sm" asChild><a href={waLink(a)} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp"><MessageCircle size={15} /></a></Button>
                        {a.status !== "cancelada" && <Button variant="ghost" size="sm" disabled={!canEdit(a)} onClick={() => changeStatus(a, "cancelada")} aria-label="Cancelar"><XCircle size={15} /></Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="admin-dialog ag-dialog">
          <DialogTitle>{form?.id ? "Editar / remarcar reunião" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>Campos com * são obrigatórios. Horário de Brasília.</DialogDescription>
          {form && (
            <form onSubmit={submit} className="ag-form">
              {!form.id && (
                <fieldset>
                  <legend>Lead existente (opcional)</legend>
                  <input className="ag-input" placeholder="Buscar lead por nome ou empresa" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                  <select className="ag-input" value={form.lead_id ?? ""} onChange={(e) => e.target.value ? pickLead(e.target.value) : setForm({ ...form, lead_id: null })}>
                    <option value="">Cadastro manual (sem lead)</option>
                    {filteredLeads.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.company}</option>)}
                  </select>
                </fieldset>
              )}
              <fieldset>
                <legend>Dados do cliente</legend>
                <label>Nome completo *<input className="ag-input" required maxLength={120} value={form.nome_cliente} onChange={set("nome_cliente")} /></label>
                <label>Empresa<input className="ag-input" maxLength={120} value={form.empresa} onChange={set("empresa")} /></label>
                <label>WhatsApp *<input className="ag-input" required inputMode="tel" placeholder="(22) 99999-9999" value={form.whatsapp} onChange={set("whatsapp")} /></label>
                <label>Segmento<input className="ag-input" maxLength={80} value={form.segmento} onChange={set("segmento")} /></label>
                <label>Serviço de interesse<select className="ag-input" value={form.servico} onChange={set("servico")}><option value="">—</option>{SERVICOS.map((s) => <option key={s}>{s}</option>)}</select></label>
              </fieldset>
              <fieldset>
                <legend>Dados da reunião</legend>
                <label>Data *<input type="date" className="ag-input" required value={form.data} onChange={set("data")} /></label>
                <label>Horário *<input type="time" className="ag-input" required value={form.hora} onChange={set("hora")} /></label>
                <label>Duração (min)<input type="number" min={5} max={600} step={5} className="ag-input" value={form.duracao_minutos} onChange={set("duracao_minutos")} /></label>
                <label>Responsável *<select className="ag-input" required value={form.responsavel_id} onChange={set("responsavel_id")}><option value="">Selecione</option>{resp?.map((r) => <option key={r.id} value={r.id}>{r.email}</option>)}</select></label>
                <label>Modalidade<select className="ag-input" value={form.modalidade} onChange={set("modalidade")}>{MODALIDADES.map((m) => <option key={m}>{m}</option>)}</select></label>
                <label>Link da reunião<input type="url" className="ag-input" maxLength={500} value={form.link_reuniao} onChange={set("link_reuniao")} /></label>
              </fieldset>
              <fieldset>
                <legend>Informações adicionais</legend>
                <label>Origem do lead<select className="ag-input" value={form.origem} onChange={set("origem")}><option value="">—</option>{ORIGENS.map((o) => <option key={o}>{o}</option>)}</select></label>
                <label className="ag-full">Observações internas<textarea className="ag-input" rows={3} maxLength={2000} value={form.observacoes} onChange={set("observacoes")} /></label>
              </fieldset>
              {formError && <p role="alert" className="text-destructive">{formError}</p>}
              <div className="ag-buttons">
                <Button type="button" variant="ghost" disabled={saving} onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit" variant="premium" disabled={saving}>{saving ? "Salvando..." : "Salvar agendamento"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="admin-dialog">
          <DialogTitle>Reunião com {detail?.nome_cliente}</DialogTitle>
          <DialogDescription>{detail ? `${fmtDate.format(new Date(detail.data_hora_inicio))} às ${fmtTime.format(new Date(detail.data_hora_inicio))} · ${detail.duracao_minutos} min` : ""}</DialogDescription>
          {detail && (
            <>
              <dl className="admin-answers">
                {[["Cliente", detail.nome_cliente], ["Empresa", detail.empresa], ["WhatsApp", detail.whatsapp], ["Segmento", detail.segmento],
                  ["Serviço", detail.servico], ["Responsável", detail.responsavel_email], ["Modalidade", detail.modalidade],
                  ["Link", detail.link_reuniao], ["Origem", detail.origem], ["Observações", detail.observacoes]].map(([l, v]) => (
                  <div key={l as string}><dt>{l}</dt><dd>{v || "—"}</dd></div>
                ))}
                <div><dt>Status</dt><dd>
                  <select className="ag-input" value={detail.status} disabled={!canEdit(detail)} onChange={(e) => changeStatus(detail, e.target.value as Status)} aria-label="Alterar status">
                    {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </dd></div>
                {detail.historico.length > 0 && <div><dt>Histórico</dt><dd>{detail.historico.map((h, i) => (
                  <div key={i}>{fmtDate.format(new Date(h.em))} {fmtTime.format(new Date(h.em))} — {h.acao === "remarcado" && h.de && h.para
                    ? `remarcado de ${fmtDate.format(new Date(h.de))} ${fmtTime.format(new Date(h.de))} para ${fmtDate.format(new Date(h.para))} ${fmtTime.format(new Date(h.para))}`
                    : h.acao === "status" ? `status: ${STATUS_LABEL[h.de as Status] ?? h.de} → ${STATUS_LABEL[h.para as Status] ?? h.para}` : h.acao}</div>
                ))}</dd></div>}
              </dl>
              <div className="ag-buttons">
                <Button variant="ghost" disabled={!canEdit(detail)} onClick={() => openEdit(detail)}><Pencil /> Editar reunião</Button>
                {detail.lead_id && <Button variant="ghost" onClick={() => setLeadView(detail.lead_id)}><Eye /> Ver diagnóstico</Button>}
                <Button variant="premium" asChild><a href={waLink(detail)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Conversar no WhatsApp</a></Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(leadView)} onOpenChange={(o) => !o && setLeadView(null)}>
        <DialogContent className="admin-dialog">
          <DialogTitle>Diagnóstico de {lead?.name ?? "lead"}</DialogTitle>
          <DialogDescription>Respostas originais enviadas pelo site.</DialogDescription>
          {lead ? (
            <dl className="admin-answers">
              {[["Empresa", lead.company], ["Segmento", lead.segment], ["Possui site", lead.has_site], ["Utiliza Instagram", lead.uses_instagram],
                ["Já anuncia", lead.advertises], ["Objetivos", lead.goals.join(", ")], ["WhatsApp", lead.phone], ["Localização", lead.location],
                ["Orçamento para anúncios", lead.budget]].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
            </dl>
          ) : <p>Diagnóstico não disponível.</p>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
