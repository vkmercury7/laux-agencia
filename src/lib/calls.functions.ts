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
    try {
      const { data: isAdmin, error: adminError } = await context.supabase.rpc("crm_is_admin");
      if (adminError) throw new Error("PERFORMANCE_PERMISSION_CHECK_FAILED");
      if (!isAdmin) throw new Error("PERFORMANCE_FORBIDDEN");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const from = `${data.from}T00:00:00-03:00`;
      const to = `${data.to}T23:59:59.999-03:00`;

      const [membersResult, rolesResult, callsResult, meetingsResult, salesResult, trafficResult] = await Promise.all([
        supabaseAdmin.from("team_members").select("email, user_id, role, status, full_name").neq("status", "revoked"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("lead_calls").select("user_id, user_email, proximo_contato").gte("created_at", from).lte("created_at", to),
        supabaseAdmin.from("agendamentos").select("responsavel_id").gte("data_hora_inicio", from).lte("data_hora_inicio", to).neq("status", "cancelada"),
        supabaseAdmin.from("sales").select("seller_id, initial_value").gte("closed_on", data.from).lte("closed_on", data.to).eq("status", "valida"),
        supabaseAdmin.from("traffic_clients").select("manager_id"),
      ]);

      const failedQueries = [
        { name: "funcionários", error: membersResult.error },
        { name: "cargos", error: rolesResult.error },
        { name: "ligações", error: callsResult.error },
        { name: "reuniões", error: meetingsResult.error },
        { name: "vendas", error: salesResult.error },
        { name: "tráfego", error: trafficResult.error },
      ].filter((item) => item.error);

      if (failedQueries.length) {
        throw new Error(`PERFORMANCE_QUERY_FAILED:${failedQueries.map(({ name }) => name).join(",")}`);
      }

      const members = membersResult.data ?? [];
      const roles = rolesResult.data ?? [];
      const calls = callsResult.data ?? [];
      const meetings = meetingsResult.data ?? [];
      const sales = salesResult.data ?? [];
      const traffic = trafficResult.data ?? [];

      const roleByUser = new Map<string, string>();
      for (const role of roles) {
        if (!roleByUser.has(role.user_id)) roleByUser.set(role.user_id, role.role);
      }

      type PerformanceAccumulator = {
        email: string;
        fullName: string | null;
        role: string;
        calls: number;
        pending: number;
        meetings: number;
        sales: number;
        sold: number;
        trafficClients: number;
      };

      const activeMembers = members.filter((member) => member.status !== "revoked" && Boolean(member.user_id));
      const memberByUser = new Map(activeMembers.map((member) => [member.user_id as string, member]));
      const byUser = new Map<string, PerformanceAccumulator>();

      for (const member of activeMembers) {
        if (!member.user_id) continue;
        byUser.set(member.user_id, {
          email: member.email ?? "",
          fullName: member.full_name,
          role: roleByUser.get(member.user_id) ?? member.role ?? "",
          calls: 0,
          pending: 0,
          meetings: 0,
          sales: 0,
          sold: 0,
          trafficClients: 0,
        });
      }

      // Administrators with a real role but no team_members row (e.g. principal admin).
      for (const role of roles) {
        if (memberByUser.has(role.user_id) || (role.role !== "admin" && role.role !== "super_admin")) continue;
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
        const email = authUser?.user?.email;
        if (!email) continue;
        memberByUser.set(role.user_id, { email, user_id: role.user_id, role: role.role, status: "active", full_name: (authUser?.user?.user_metadata?.["full_name"] as string | undefined) ?? null } as (typeof activeMembers)[number]);
        byUser.set(role.user_id, { email, fullName: (authUser?.user?.user_metadata?.["full_name"] as string | undefined) ?? null, role: roleByUser.get(role.user_id) ?? role.role, calls: 0, pending: 0, meetings: 0, sales: 0, sold: 0, trafficClients: 0 });
      }



      const ensure = (uid: string) => {
        if (!memberByUser.has(uid)) return undefined;
        return byUser.get(uid);
      };

      const now = new Date().toISOString();
      for (const call of calls) {
        const row = ensure(call.user_id);
        if (!row) continue;
        if (!row.email && call.user_email) row.email = call.user_email;
        row.calls += 1;
        if (call.proximo_contato && call.proximo_contato >= now) row.pending += 1;
      }

      for (const meeting of meetings) {
        if (!meeting.responsavel_id) continue;
        const row = ensure(meeting.responsavel_id);
        if (row) row.meetings += 1;
      }

      for (const sale of sales) {
        const row = ensure(sale.seller_id);
        if (!row) continue;
        row.sales += 1;
        row.sold += Number(sale.initial_value) || 0;
      }

      for (const trafficClient of traffic) {
        if (!trafficClient.manager_id) continue;
        const row = ensure(trafficClient.manager_id);
        if (row) row.trafficClients += 1;
      }

      const rows = [...byUser.entries()]
        .filter(([, row]) => row.email)
        .map(([userId, row]) => ({ userId, ...row }))
        .sort((a, b) => a.email.localeCompare(b.email));

      const hasPeriodActivity = calls.length > 0 || meetings.length > 0 || sales.length > 0;
      const state = rows.length === 0 ? "no_members" : hasPeriodActivity ? "ok" : "no_activity";

      return {
        state,
        rows,
        totals: {
          calls: rows.reduce((sum, row) => sum + row.calls, 0),
          meetings: rows.reduce((sum, row) => sum + row.meetings, 0),
          sales: rows.reduce((sum, row) => sum + row.sales, 0),
          sold: rows.reduce((sum, row) => sum + row.sold, 0),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PERFORMANCE_")) throw error;
      throw new Error("PERFORMANCE_BACKEND_UNAVAILABLE");
    }
  });
