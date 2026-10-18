import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().finite().min(0).max(999999999999.99).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.001, "Use até dois centavos");

export const contractSchema = z.object({
  id: z.string().uuid().optional(),
  sale_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  seller_id: z.string().uuid(),
  starts_on: date,
  monthly_value: money.nullable(),
  due_day: z.number().int().min(1).max(28).nullable(),
  status: z.enum(["ativo", "suspenso", "cancelado"]),
  notes: z.string().trim().max(2000),
}).refine((v) => (v.monthly_value ?? 0) > 0 ? v.due_day !== null : v.due_day === null, "Contrato recorrente precisa do dia de vencimento; contrato não recorrente não tem vencimento");
export type ContractInput = z.infer<typeof contractSchema>;

export const installmentPaySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pendente", "pago", "cancelado"]),
  paid_on: date.nullable(),
  amount_received: money.nullable(),
}).refine((v) => v.status === "pago" ? Boolean(v.paid_on) && v.amount_received !== null : true, "Informe a data e o valor recebido");

export type ContractRow = {
  id: string; sale_id: string; lead_id: string; seller_id: string;
  starts_on: string; monthly_value: number | null; due_day: number | null;
  status: string; notes: string;
};
export type InstallmentRow = {
  id: string; contract_id: string; ref_month: string; amount_due: number;
  due_date: string; status: string; paid_on: string | null; amount_received: number | null;
};

export const isRecurring = (c: Pick<ContractRow, "monthly_value">) => (c.monthly_value ?? 0) > 0;

/** Mensalidade vencida: pendente com vencimento anterior a hoje (sem alterar o registro). */
export const isOverdue = (i: Pick<InstallmentRow, "status" | "due_date">, today: string) =>
  i.status === "pendente" && i.due_date < today;

/** Próximo vencimento de um contrato recorrente ativo, a partir de hoje. */
export function nextDueDate(c: Pick<ContractRow, "monthly_value" | "due_day" | "status">, today: string): string | null {
  if (c.status !== "ativo" || !isRecurring(c) || !c.due_day) return null;
  const [y = 0, m = 1] = today.split("-").map(Number);
  const day = String(c.due_day).padStart(2, "0");
  const thisMonth = `${y}-${String(m).padStart(2, "0")}-${day}`;
  if (thisMonth >= today) return thisMonth;
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, "0")}-${day}`;
}

/** Competências mensais (primeiro dia do mês) de starts_on até until, inclusive. */
export function installmentMonths(starts_on: string, until: string): string[] {
  const months: string[] = [];
  const [sy = 0, sm = 1] = starts_on.split("-").map(Number);
  const [ey = 0, em = 1] = until.split("-").map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}-01`);
    if (m === 12) { y += 1; m = 1; } else { m += 1; }
  }
  return months;
}
