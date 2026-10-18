import { describe, expect, it } from "vitest";
import { followupState, type Lead } from "@/components/agency/lead-details";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const shift = (days: number) => {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
};
const lead = (patch: Partial<Lead>) => ({ followup_date: null, followup_done: false, ...patch }) as Lead;

describe("followupState", () => {
  it("sem data não mostra indicador", () => {
    expect(followupState(lead({}))).toBeNull();
  });
  it("retorno concluído não mostra indicador", () => {
    expect(followupState(lead({ followup_date: shift(-3), followup_done: true }))).toBeNull();
  });
  it("data passada é retorno atrasado", () => {
    expect(followupState(lead({ followup_date: shift(-1) }))).toBe("atrasado");
  });
  it("data de hoje é retorno hoje", () => {
    expect(followupState(lead({ followup_date: today }))).toBe("hoje");
  });
  it("data futura é retorno futuro", () => {
    expect(followupState(lead({ followup_date: shift(2) }))).toBe("futuro");
  });
});
