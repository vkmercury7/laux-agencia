import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { assignLead, saveFollowup, type listLeads } from "@/lib/leads.functions";
import { listResponsaveis } from "@/lib/agendamentos.functions";
import { getMyAccess } from "@/lib/team.functions";
import { leadWhatsApp } from "@/lib/funnel";

export type Lead = Awaited<ReturnType<typeof listLeads>>[number];
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Follow-up badge state: atrasado (overdue), hoje (today) or futuro (future). */
export function followupState(lead: Lead): "atrasado" | "hoje" | "futuro" | null {
  if (!lead.followup_date || lead.followup_done) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  if (lead.followup_date < today) return "atrasado";
  if (lead.followup_date === today) return "hoje";
  return "futuro";
}

export function LeadDetails({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const assign = useServerFn(assignLead);
  const save = useServerFn(saveFollowup);
  const fetchResponsaveis = useServerFn(listResponsaveis);
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess(), staleTime: 60_000 });
  const { data: responsaveis } = useQuery({ queryKey: ["responsaveis"], queryFn: () => fetchResponsaveis(), staleTime: 60_000 });

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDate(lead?.followup_date ?? "");
    setTime(lead?.followup_time ?? "");
    setNote(lead?.followup_note ?? "");
    setDone(lead?.followup_done ?? false);
    setError("");
  }, [lead]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const onAssign = async (assignedTo: string) => {
    if (!lead) return;
    setError("");
    try {
      await assign({ data: { id: lead.id, assignedTo: assignedTo || null } });
      await refresh();
    } catch { setError("Não foi possível salvar o responsável."); }
  };

  const onSaveFollowup = async () => {
    if (!lead) return;
    setSaving(true);
    setError("");
    try {
      await save({ data: { id: lead.id, date: date || null, time: time || null, note, done } });
      await refresh();
    } catch { setError("Não foi possível salvar o retorno."); }
    finally { setSaving(false); }
  };

  return <Dialog open={Boolean(lead)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="admin-dialog">
      <DialogTitle>Respostas de {lead?.name}</DialogTitle>
      <DialogDescription>Enviado em {lead ? dateTime.format(new Date(lead.created_at)) : ""}</DialogDescription>
      {lead && <>
        <dl className="admin-answers">
          {[
            ["Nome", lead.name], ["Empresa", lead.company], ["Segmento", lead.segment],
            ["Possui site", lead.has_site], ["Utiliza Instagram", lead.uses_instagram], ["Já anuncia", lead.advertises],
            ["Objetivos", lead.goals.join(", ")], ["WhatsApp", lead.phone], ["Localização", lead.location],
            ["Orçamento para anúncios", lead.budget], ["Autorizou contato", lead.consent ? "Sim" : "Não"],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>

        <div className="lead-team">
          <label className="lead-field">Responsável
            <select
              value={lead.assigned_to ?? ""}
              disabled={!access?.isAdmin}
              onChange={(e) => onAssign(e.target.value)}
              aria-label="Responsável pelo lead"
            >
              <option value="">Sem responsável</option>
              {(responsaveis ?? []).map((r) => <option key={r.id} value={r.id}>{r.email}</option>)}
            </select>
          </label>

          <fieldset className="lead-followup">
            <legend><CalendarClock size={15} /> Próximo retorno</legend>
            <div className="lead-followup-grid">
              <label className="lead-field">Data
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="lead-field">Horário
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            </div>
            <label className="lead-field">Observação
              <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: retornar após reunião interna" />
            </label>
            <label className="lead-followup-done">
              <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Retorno concluído
            </label>
            <Button variant="secondary" size="sm" onClick={onSaveFollowup} disabled={saving}>
              {saving ? "Salvando..." : "Salvar retorno"}
            </Button>
          </fieldset>
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>

        <Button variant="premium" asChild><a href={leadWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Conversar no WhatsApp</a></Button>
      </>}
    </DialogContent>
  </Dialog>;
}
