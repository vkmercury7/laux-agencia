import { describe, it, expect } from "vitest";
import { leadStage, funnelChanges, funnelUpdateSchema, FUNNEL_STAGES, leadWhatsApp } from "../lib/funnel";
const id = "00000000-0000-4000-8000-000000000001";
describe("Sales funnel", () => {
  it("defaults undefined older leads to Novo lead", () => {
    expect(leadStage(null)).toBe("novo_lead");
    expect(leadStage(undefined)).toBe("novo_lead");
  });
  it("accepts exactly the six funnel stages", () => {
    expect(FUNNEL_STAGES).toEqual(["novo_lead", "em_contato", "reuniao_marcada", "proposta_enviada", "fechado", "perdido"]);
    expect(funnelUpdateSchema.safeParse({ id, stage: "cobranca" }).success).toBe(false);
  });
  it("allows closing without amount or notes", () => {
    expect(funnelChanges(funnelUpdateSchema.parse({ id, stage: "fechado" }))).toEqual({ funnel_stage: "fechado" });
  });
  it("saves an optional contract amount and closing notes", () => {
    expect(funnelChanges(funnelUpdateSchema.parse({ id, stage: "fechado", contractValue: 490, closingNotes: "Contrato inicial" })))
      .toEqual({ funnel_stage: "fechado", contract_value: 490, closing_notes: "Contrato inicial" });
  });
  it("allows loss with or without a reason", () => {
    expect(funnelChanges({ id, stage: "perdido" })).toEqual({ funnel_stage: "perdido" });
    expect(funnelChanges({ id, stage: "perdido", lossReason: "Sem orçamento" })).toEqual({ funnel_stage: "perdido", loss_reason: "Sem orçamento" });
  });
  it("moving a card only changes lead fields, never appointments", () => {
    expect(funnelChanges({ id, stage: "em_contato", contractValue: 490, lossReason: "Motivo" })).toEqual({ funnel_stage: "em_contato" });
  });
  it("rejects negative contract amounts", () => {
    expect(funnelUpdateSchema.safeParse({ id, stage: "fechado", contractValue: -1 }).success).toBe(false);
  });
  it("opens WhatsApp for the existing lead phone", () => {
    expect(leadWhatsApp("(22) 99926-7900")).toBe("https://wa.me/5522999267900");
  });
});