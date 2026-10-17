import { z } from "zod";

export const FUNNEL_STAGES = ["novo_lead", "em_contato", "reuniao_marcada", "proposta_enviada", "fechado", "perdido"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export const STAGE_LABEL: Record<FunnelStage, string> = {
  novo_lead: "Novo lead", em_contato: "Em contato", reuniao_marcada: "Reunião marcada",
  proposta_enviada: "Proposta enviada", fechado: "Fechado", perdido: "Perdido",
};
export function leadStage(stage: string | null | undefined): FunnelStage {
  return FUNNEL_STAGES.find((value) => value === stage) ?? "novo_lead";
}
export const funnelUpdateSchema = z.object({
  id: z.string().uuid(), stage: z.enum(FUNNEL_STAGES),
  contractValue: z.number().finite().min(0).max(999999999999.99).nullable().optional(),
  closingNotes: z.string().trim().max(2000).nullable().optional(),
  lossReason: z.string().trim().max(2000).nullable().optional(),
});
export type FunnelUpdate = z.infer<typeof funnelUpdateSchema>;
export function funnelChanges(data: FunnelUpdate) {
  return {
    funnel_stage: data.stage,
    ...(data.stage === "fechado" && data.contractValue !== undefined ? { contract_value: data.contractValue } : {}),
    ...(data.stage === "fechado" && data.closingNotes !== undefined ? { closing_notes: data.closingNotes || null } : {}),
    ...(data.stage === "perdido" && data.lossReason !== undefined ? { loss_reason: data.lossReason || null } : {}),
  };
}
export const leadWhatsApp = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, "")}`;