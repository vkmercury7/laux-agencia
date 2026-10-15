import { describe, expect, it } from "vitest";
import { agencyConfig, simulateInvestment, whatsappUrl, maskPhone, isValidPhone, buildLeadMessage, buildDiagnosticMessage } from "../lib/agency-config";

describe("LAUX commercial rules", () => {
  it("charges R$390 recurring management", () => { expect(simulateInvestment(300, 2.5, false)?.management).toBe(390); });
  it("charges R$100 for the site only in the first month", () => { expect(simulateInvestment(300, 2.5, true)?.website).toBe(100); expect(simulateInvestment(300, 2.5, false)?.website).toBe(0); });
  it("adds separate media to the R$490 first month plan", () => { expect(simulateInvestment(300, 2.5, true)?.total).toBe(790); });
  it("adds separate media to the R$390 subsequent month plan", () => { expect(simulateInvestment(300, 2.5, false)?.total).toBe(690); });
  it("estimates clicks from media divided by hypothetical CPC", () => { expect(simulateInvestment(1000, 2.5, true)?.clicks).toBe(400); });
  it("uses R$2.50 as initial hypothetical CPC", () => { expect(agencyConfig.initialCpc).toBe(2.5); });
  it("uses media bounds R$300–R$3000 with R$100 steps", () => { expect([agencyConfig.mediaMin, agencyConfig.mediaMax, agencyConfig.mediaStep]).toEqual([300, 3000, 100]); });
  it("rejects zero CPC", () => { expect(simulateInvestment(300, 0, true)).toBeNull(); });
});

describe("Official WhatsApp destination", () => {
  it("targets the official number 5522999267900", () => {
    expect(agencyConfig.whatsappNumber).toBe("5522999267900");
  });
  it("encodes the message with encodeURIComponent", () => {
    const url = whatsappUrl("Olá! Quero começar");
    expect(url).toMatch(/^https:\/\/wa\.me\/5522999267900\?text=/);
    expect(url).toContain(encodeURIComponent("Olá! Quero começar"));
  });
});

describe("Brazilian phone mask", () => {
  it("formats digits progressively as (22) 99926-7900", () => {
    expect(maskPhone("2")).toBe("(2");
    expect(maskPhone("22")).toBe("(22");
    expect(maskPhone("229992")).toBe("(22) 9992");
    expect(maskPhone("2299926790")).toBe("(22) 9992-6790");
    expect(maskPhone("22999267900")).toBe("(22) 99926-7900");
  });
  it("ignores extra digits beyond the mobile length", () => {
    expect(maskPhone("229992679001234")).toBe("(22) 99926-7900");
  });
  it("validates only complete mobile numbers with DDD", () => {
    expect(isValidPhone("(22) 99926-7900")).toBe(true);
    expect(isValidPhone("(22) 9992-6790")).toBe(false);
    expect(isValidPhone("22999267900")).toBe(false);
  });
});

describe("Lead message template", () => {
  const lead = { name: "Maria", company: "Padaria Central", phone: "(22) 99926-7900", segment: "Comércio", location: "Campos / RJ", hasSite: "Não", alreadyAdvertises: "Nunca investi", goal: "Conseguir mais clientes", budget: "R$ 500 a R$ 1.000", notes: "" };
  it("builds the full lead message with plan and origin", () => {
    const msg = buildLeadMessage(lead)!;
    expect(msg).toContain("*NOVO LEAD — LAUX AGÊNCIA*");
    expect(msg).toContain("*Nome:* Maria");
    expect(msg).toContain("*WhatsApp:* (22) 99926-7900");
    expect(msg).toContain("*Orçamento para anúncios:* R$ 500 a R$ 1.000");
    expect(msg).toContain("*Plano:* R$ 490 no primeiro mês e R$ 390/mês depois.");
    expect(msg).toContain("*Origem:* Site LAUX AGÊNCIA.");
  });
  it("returns null when required fields are missing", () => {
    expect(buildLeadMessage({ ...lead, name: "" })).toBeNull();
    expect(buildLeadMessage({ ...lead, budget: "" })).toBeNull();
  });
});

describe("Diagnosis message template", () => {
  const diag = { name: "João", company: "Clínica Vida", segment: "Saúde e bem-estar", hasSite: "Sim", usesInstagram: "Sim", advertises: "Nunca investi", goals: ["Conseguir mais clientes", "Melhorar a presença digital"], phone: "(22) 99926-7900", location: "Campos / RJ", budget: "Até R$ 500" };
  it("builds the diagnosis message with goals and location", () => {
    const msg = buildDiagnosticMessage(diag)!;
    expect(msg).toContain("*SOLICITAÇÃO DE DIAGNÓSTICO — LAUX AGÊNCIA*");
    expect(msg).toContain("*Objetivos:* Conseguir mais clientes, Melhorar a presença digital");
    expect(msg).toContain("*Localização:* Campos / RJ");
    expect(msg).toContain("*Origem:* Site LAUX AGÊNCIA.");
  });
  it("returns null without goals or contact", () => {
    expect(buildDiagnosticMessage({ ...diag, goals: [] })).toBeNull();
    expect(buildDiagnosticMessage({ ...diag, phone: "" })).toBeNull();
  });
});
