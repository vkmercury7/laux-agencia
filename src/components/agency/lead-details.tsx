import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { listLeads } from "@/lib/leads.functions";
import { leadWhatsApp } from "@/lib/funnel";

export type Lead = Awaited<ReturnType<typeof listLeads>>[number];
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
export function LeadDetails({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
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
        <Button variant="premium" asChild><a href={leadWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Conversar no WhatsApp</a></Button>
      </>}
    </DialogContent>
  </Dialog>;
}