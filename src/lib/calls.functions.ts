import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CALL_RESULTS = {
  nao_atendeu: "Não atendeu",
  atendeu: "Atendeu",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  retornar: "Retornar",
} as const;

const callSchema = z.object({
  leadId: z.string().uuid(),
  resultado: z.enum(["nao_atendeu", "atendeu", "interessado", "sem_interesse", "retornar"]),
  observacao: z.string().trim().max(500).default(""),
  proximoContato: z.string().nullable().default(null),
});

export const registerCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => callSchema.parse(i))
  .handler(async ({ data, context }) => {
    const email = String(context.claims?.email ?? "");
    const { error } = await context.supabase.from("lead_calls").insert({
      lead_id: data.leadId,
      user_id: context.userId,
      user_email: email,
      resultado: data.resultado,
      observacao: data.observacao,
      proximo_contato: data.proximoContato,
    });
    if (error) throw new Error("Não foi possível registrar a ligação.");
    return { ok: true };
  });

export const listLeadCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ leadId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_calls")
      .select("id, resultado, observacao, proximo_contato, created_at, user_email")
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Não foi possível carregar as ligações.");
    return rows ?? [];
  });

const perfSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Admin-only consolidated team performance. */
export const getTeamPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => perfSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("crm_is_admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = `${data.from}T00:00:00-03:00`;
    const to = `${data.to}T23:59:59.999-03:00`;

    const [members, roles, calls, meetings, sales, traffic] = await Promise.all([
      supabaseAdmin.from("team_members").select("email, user_id, role").neq("status", "revoked"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("lead_calls").select("user_id, proximo_contato").gte("created_at", from).lte("created_at", to),
      supabaseAdmin.from("agendamentos").select("responsavel_id").gte("data_hora_inicio", from).lte("data_hora_inicio", to).neq("status", "cancelada"),
      supabaseAdmin.from("sales").select("seller_id, initial_value").gte("closed_on", data.from).lte("closed_on", data.to).eq("status", "valida"),
      supabaseAdmin.from("traffic_clients").select("manager_id"),
    ]);

    const roleByUser = new Map<string, string>();
    for (const r of roles.data ?? []) if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);

    const byUser = new Map<string, { email: string; role: string; calls: number; pending: number; meetings: number; sales: number; sold: number; trafficClients: number }>();
    const ensure = (uid: string) => {
      if (!byUser.has(uid)) {
        const member = (members.data ?? []).find((m) => m.user_id === uid);
        byUser.set(uid, { email: member?.email ?? "", role: roleByUser.get(uid) ?? "", calls: 0, pending: 0, meetings: 0, sales: 0, sold: 0, trafficClients: 0 });
      }
      return byUser.get(uid)!;
    };

    const now = new Date().toISOString();
    for (const c of calls.data ?? []) {
      const row = ensure(c.user_id);
      row.calls += 1;
      if (c.proximo_contato && c.proximo_contato >= now) row.pending += 1;
    }
    for (const m of meetings.data ?? []) ensure(m.responsavel_id).meetings += 1;
    for (const s of sales.data ?? []) {
      const row = ensure(s.seller_id);
      row.sales += 1;
      row.sold += Number(s.initial_value) || 0;
    }
    for (const t of traffic.data ?? []) if (t.manager_id) ensure(t.manager_id).trafficClients += 1;

    const rows = [...byUser.entries()]
      .filter(([, r]) => r.email)
      .map(([userId, r]) => ({ userId, ...r }))
      .sort((a, b) => a.email.localeCompare(b.email));

    return {
      rows,
      totals: {
        calls: rows.reduce((s, r) => s + r.calls, 0),
        meetings: rows.reduce((s, r) => s + r.meetings, 0),
        sales: rows.reduce((s, r) => s + r.sales, 0),
        sold: rows.reduce((s, r) => s + r.sold, 0),
      },
    };
  });
