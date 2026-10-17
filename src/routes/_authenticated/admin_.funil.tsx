import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CalendarDays, Columns3, MessageCircle, Pencil, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brand } from "@/components/agency/dashboard";
import { LeadDetails, type Lead } from "@/components/agency/lead-details";
import { listLeads, updateLeadFunnel } from "@/lib/leads.functions";
import { FUNNEL_STAGES, STAGE_LABEL, leadStage, leadWhatsApp, type FunnelStage, type FunnelUpdate } from "@/lib/funnel";

export const Route = createFileRoute("/_authenticated/admin_/funil")({
  head: () => ({ meta: [
    { title: "Funil de Vendas | LAUX AGÊNCIA" },
    { name: "description", content: "Funil comercial privado da LAUX AGÊNCIA, do primeiro contato ao fechamento." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "Funil de Vendas | LAUX AGÊNCIA" },
    { property: "og:description", content: "Acompanhe as oportunidades comerciais da LAUX AGÊNCIA." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: FunnelPage,
});
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function FunnelPage() {
  const fetchLeads = useServerFn(listLeads);
  const update = useServerFn(updateLeadFunnel);
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["leads"], queryFn: () => fetchLeads(), refetchOnMount: "always" });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [edit, setEdit] = useState<{ lead: Lead; stage: "fechado" | "perdido" } | null>(null);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const term = search.trim().toLowerCase();
  const rows = data.filter((l) => !term || `${l.name} ${l.company} ${l.phone}`.toLowerCase().includes(term));
  async function save(changes: FunnelUpdate) {
    if (saving) return;
    setSaving(true); setSaveError("");
    try {
      const saved = await update({ data: changes });
      qc.setQueryData<Lead[]>(["leads"], (old) => old?.map((l) => l.id === saved.id ? saved : l));
      setEdit(null);
      await qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) { setSaveError(err instanceof Error ? err.message : "Não foi possível salvar a etapa."); }
    finally { setSaving(false); }
  }
  function change(lead: Lead, stage: FunnelStage) {
    if (stage === "fechado" || stage === "perdido") {
      setEdit({ lead, stage }); setSaveError("");
      setValue(lead.contract_value === null ? "" : String(lead.contract_value));
      setNotes((stage === "fechado" ? lead.closing_notes : lead.loss_reason) ?? "");
    } else { void save({ id: lead.id, stage }); }
  }
  return <main className="admin-shell">
    <div className="admin-container funnel-container">
      <header className="admin-header">
        <Brand /><div><h1><Columns3 size={22} className="inline text-primary" /> Funil de Vendas</h1></div>
        <Button variant="ghost" asChild><Link to="/admin"><ArrowLeft /> Formulários</Link></Button>
        <Button variant="ghost" asChild><Link to="/admin/agendamentos"><CalendarDays /> Agendamentos</Link></Button>
      </header>
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, empresa ou WhatsApp" aria-label="Buscar cliente, empresa ou WhatsApp" /></label>
        <span className="text-sm text-muted-foreground">{data.length} {data.length === 1 ? "lead" : "leads"}</span>
      </div>
      {saveError && !edit && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      {saving && <p role="status" className="text-sm text-muted-foreground">Salvando etapa...</p>}
      {isLoading ? <p className="admin-empty">Carregando funil...</p> : error ? <div className="admin-empty"><p role="alert">Não foi possível carregar os leads.</p><Button variant="outline" onClick={() => void qc.invalidateQueries({ queryKey: ["leads"] })}>Tentar novamente</Button></div> :
        <div className="funnel-board" aria-label="Funil de vendas">
          {FUNNEL_STAGES.map((stage) => {
            const leads = rows.filter((l) => leadStage(l.funnel_stage) === stage);
            return <section key={stage} className={`funnel-column funnel-${stage}`} aria-label={STAGE_LABEL[stage]}>
              <header><h2>{STAGE_LABEL[stage]}</h2><span>{leads.length}</span></header>
              <div className="funnel-list">
                {leads.length === 0 && <p className="funnel-empty">Nenhum lead</p>}
                {leads.map((lead) => <article key={lead.id} className="funnel-card">
                  <Button variant="ghost" className="funnel-card-title" onClick={() => setSelected(lead)} aria-label={`Ver respostas de ${lead.name}`}><strong>{lead.name}</strong>{lead.company && <span>{lead.company}</span>}</Button>
                  <a className="funnel-phone" href={leadWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer">{lead.phone}</a>
                  <Select value={leadStage(lead.funnel_stage)} disabled={saving} onValueChange={(s) => change(lead, leadStage(s))}>
                    <SelectTrigger aria-label={`Etapa de ${lead.name}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{FUNNEL_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  {stage === "fechado" && lead.contract_value !== null && <p className="funnel-value">{money.format(lead.contract_value)}</p>}
                  {stage === "fechado" && lead.closing_notes && <p className="funnel-note">{lead.closing_notes}</p>}
                  {stage === "perdido" && lead.loss_reason && <p className="funnel-note">{lead.loss_reason}</p>}
                  <div className="funnel-actions">
                    <Button variant="ghost" size="sm" asChild><a href={leadWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a></Button>
                    {(stage === "fechado" || stage === "perdido") && <Button variant="ghost" size="icon" disabled={saving} title="Editar dados" aria-label={`Editar dados de ${lead.name}`} onClick={() => change(lead, stage)}><Pencil size={15} /></Button>}
                  </div>
                </article>)}
              </div>
            </section>;
          })}
        </div>}
    </div>
    <LeadDetails lead={selected} onClose={() => setSelected(null)} />
    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open && !saving) setEdit(null); }}>
      <DialogContent className="admin-dialog"><DialogTitle>{edit?.stage === "fechado" ? "Fechar venda" : "Registrar perda"}</DialogTitle><DialogDescription>{edit?.lead.name} · {edit?.lead.company}</DialogDescription>
        <form className="ag-form" onSubmit={(e) => { e.preventDefault(); if (edit) void save({ id: edit.lead.id, stage: edit.stage, ...(edit.stage === "fechado" ? { contractValue: value === "" ? null : Number(value), closingNotes: notes } : { lossReason: notes }) }); }}>
          {edit?.stage === "fechado" && <label>Valor do contrato (R$, opcional)<input className="ag-input" type="number" min="0" max="999999999999.99" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} disabled={saving} /></label>}
          <label>{edit?.stage === "fechado" ? "Observações (opcional)" : "Motivo da perda (opcional)"}<textarea className="ag-input" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} /></label>
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <div className="ag-buttons"><Button type="button" variant="ghost" disabled={saving} onClick={() => setEdit(null)}>Cancelar</Button><Button type="submit" variant="premium" disabled={saving}><Save /> {saving ? "Salvando..." : "Salvar etapa"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </main>;
}