import { describe, expect, it } from "vitest";
import { installmentMonths, isOverdue, nextDueDate } from "@/lib/contracts";

describe("nextDueDate", () => {
  it("usa o dia do mês atual quando ainda não passou", () => {
    expect(nextDueDate({ monthly_value: 390, due_day: 10, status: "ativo" }, "2026-10-05")).toBe("2026-10-10");
  });
  it("vai para o mês seguinte quando o dia já passou", () => {
    expect(nextDueDate({ monthly_value: 390, due_day: 10, status: "ativo" }, "2026-10-18")).toBe("2026-11-10");
  });
  it("vira o ano corretamente", () => {
    expect(nextDueDate({ monthly_value: 390, due_day: 5, status: "ativo" }, "2026-12-20")).toBe("2027-01-05");
  });
  it("não recorrente ou inativo não tem vencimento", () => {
    expect(nextDueDate({ monthly_value: null, due_day: null, status: "ativo" }, "2026-10-18")).toBeNull();
    expect(nextDueDate({ monthly_value: 390, due_day: 10, status: "cancelado" }, "2026-10-18")).toBeNull();
  });
});

describe("isOverdue", () => {
  it("pendente com vencimento passado está vencida", () => {
    expect(isOverdue({ status: "pendente", due_date: "2026-10-10" }, "2026-10-18")).toBe(true);
    expect(isOverdue({ status: "pendente", due_date: "2026-10-20" }, "2026-10-18")).toBe(false);
    expect(isOverdue({ status: "pago", due_date: "2026-10-10" }, "2026-10-18")).toBe(false);
  });
});

describe("installmentMonths", () => {
  it("lista competências do início até o limite, inclusive", () => {
    expect(installmentMonths("2026-08-15", "2026-10-18")).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });
  it("cruza o ano", () => {
    expect(installmentMonths("2026-11-01", "2027-01-31")).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });
  it("não gera nada depois do limite", () => {
    expect(installmentMonths("2026-10-10", "2026-09-30")).toEqual([]);
  });
});
