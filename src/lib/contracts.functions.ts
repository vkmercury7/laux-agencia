import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { contractSchema, installmentPaySchema, installmentMonths, isRecurring } from "./contracts";
import { todaySP } from "./sales";

async function access(ctx: { supabase: any; userId: string }) {
  const [{ data: allowed, error }, { data: admin, error: roleError }] = await Promise.all([
    ctx.supabase.rpc("crm_can_consult"),
    ctx.supabase.rpc("crm_is_admin"),
  ]);
  if (error || roleError || !allowed) throw new Error("Acesso não autorizado.");
  return Boolean(admin);
}

async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await fetchPage(offset, offset + 499);
    if (error) throw new Error("Não foi possível carregar os contratos.");
    rows.push(...(data ?? []));
    if ((data ?? []).length < 500) return rows;
  }
}

/** Shared contracts; payment installments are fetched only for administrators. */
export const getContractsData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const isAdmin = await access(context);
  const [contracts, installments, sales, leads] = await Promise.all([
    allRows((a, b) => context.supabase.from("contracts").select("*").order("id").range(a, b)),
    isAdmin ? allRows((a, b) => context.supabase.from("contract_installments").select("*").order("id").range(a, b)) : [],
    allRows((a, b) => context.supabase.from("sales").select("id,lead_id,seller_id,seller_email,service,monthly_value,starts_on,status").order("id").range(a, b)),
    allRows((a, b) => context.supabase.from("leads").select("id,name,company").order("id").range(a, b)),
  ]);
  return { contracts, installments, sales, leads, isAdmin, userId: context.userId };
});

/** Admin: cria ou edita um contrato vinculado a uma venda existente. */
export const saveContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => contractSchema.parse(v))
  .handler(async ({ data, context }) => {
    if (!(await access(context))) throw new Error("Somente administradores podem gerenciar contratos.");
    const { id, ...row } = data;
    const result = id
      ? await context.supabase.from("contracts").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id).select("id").single()
      : await context.supabase.from("contracts").insert(row).select("id").single();
    if (result.error || !result.data) {
      if ((result.error as { code?: string } | null)?.code === "23505") throw new Error("Essa venda já possui um contrato.");
      throw new Error("Não foi possível salvar o contrato. Confira a venda vinculada.");
    }
    return result.data;
  });

/** Admin: gera as competências devidas até o mês atual, sem duplicar (idempotente). */
export const generateInstallments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ contractId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    if (!(await access(context))) throw new Error("Somente administradores podem gerar mensalidades.");
    const { data: contract, error } = await context.supabase.from("contracts").select("*").eq("id", data.contractId).single();
    if (error || !contract) throw new Error("Contrato não encontrado.");
    if (!isRecurring(contract) || !contract.due_day) return { created: 0 };
    const until = contract.status === "cancelado" ? contract.updated_at.slice(0, 10) : todaySP();
    const months = installmentMonths(contract.starts_on, until);
    const rows = months.map((ref) => ({
      contract_id: contract.id,
      ref_month: ref,
      amount_due: contract.monthly_value as number,
      due_date: `${ref.slice(0, 8)}${String(contract.due_day).padStart(2, "0")}`,
    }));
    const { data: inserted, error: insError } = await context.supabase
      .from("contract_installments").upsert(rows, { onConflict: "contract_id,ref_month", ignoreDuplicates: true }).select("id");
    if (insError) throw new Error("Não foi possível gerar as mensalidades.");
    return { created: inserted?.length ?? 0 };
  });

/** Admin: marca mensalidade como paga (data e valor recebido) ou altera a situação. */
export const updateInstallment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => installmentPaySchema.parse(v))
  .handler(async ({ data, context }) => {
    if (!(await access(context))) throw new Error("Somente administradores podem registrar pagamentos de mensalidades.");
    const { id, ...row } = data;
    const { data: saved, error } = await context.supabase.from("contract_installments").update(row).eq("id", id).select("id").single();
    if (error || !saved) throw new Error("Não foi possível salvar a mensalidade.");
    return saved;
  });
