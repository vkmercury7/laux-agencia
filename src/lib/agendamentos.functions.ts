import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const STATUS = ["agendada", "confirmada", "realizada", "nao_compareceu", "cancelada"] as const;
export const CONFLICT_MSG = "Este responsável já possui uma reunião agendada nesse horário.";

type Ctx = { supabase: any; userId: string };

async function requireTeam(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("can_view_leads", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Forbidden");
}

/** Converts a São Paulo local date + time (UTC-3, no DST) into an ISO instant. */
function spToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

function mapDbError(error: any): never {
  if (error?.code === "23P01") throw new Error(CONFLICT_MSG);
  console.error("agendamentos error", error);
  throw new Error("Não foi possível salvar o agendamento. Tente novamente.");
}

async function responsavelEmail(ctx: Ctx, id: string) {
  const { data: ok } = await ctx.supabase.rpc("can_view_leads", { _user_id: id });
  if (!ok) throw new Error("Responsável sem acesso autorizado ao painel.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(id);
  if (!data?.user?.email) throw new Error("Responsável não encontrado.");
  return data.user.email;
}

/** Team members with panel access, eligible as meeting owners. */
export const listResponsaveis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeam(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id");
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const out: { id: string; email: string }[] = [];
    for (const id of ids) {
      const { data: ok } = await supabaseAdmin.rpc("can_view_leads", { _user_id: id });
      if (!ok) continue;
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data?.user?.email) out.push({ id, email: data.user.email });
    }
    return out.sort((a, b) => a.email.localeCompare(b.email));
  });

export const listAgendamentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeam(context);
    const { data, error } = await context.supabase
      .from("agendamentos")
      .select("*")
      .order("data_hora_inicio", { ascending: true })
      .limit(2000);
    if (error) throw new Error("Não foi possível carregar os agendamentos.");
    return data as Array<{
      id: string; lead_id: string | null; nome_cliente: string; empresa: string | null; whatsapp: string;
      segmento: string | null; servico: string | null; data_hora_inicio: string; duracao_minutos: number;
      responsavel_id: string; responsavel_email: string; modalidade: string; link_reuniao: string | null;
      origem: string | null; observacoes: string | null; status: (typeof STATUS)[number];
      historico: Array<{ em: string; acao: string; de?: string; para?: string }>; created_at: string;
    }>;
  });

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

const baseSchema = z.object({
  lead_id: z.string().uuid().optional().nullable(),
  nome_cliente: z.string().trim().min(2).max(120),
  empresa: opt(120),
  whatsapp: z.string().trim().regex(/^\(\d{2}\) 9?\d{4}-\d{4}$/),
  segmento: opt(80),
  servico: opt(80),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^\d{2}:\d{2}$/),
  duracao_minutos: z.number().int().min(5).max(600),
  responsavel_id: z.string().uuid(),
  modalidade: z.string().trim().min(1).max(40),
  link_reuniao: opt(500),
  origem: opt(40),
  observacoes: opt(2000),
});

export const saveAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => baseSchema.extend({ id: z.string().uuid().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const email = await responsavelEmail(context, data.responsavel_id);
    const inicio = spToIso(data.data, data.hora);
    const fim = new Date(new Date(inicio).getTime() + data.duracao_minutos * 60000).toISOString();
    const row = {
      nome_cliente: data.nome_cliente, empresa: data.empresa, whatsapp: data.whatsapp, segmento: data.segmento,
      servico: data.servico, data_hora_inicio: inicio, data_hora_fim: fim, duracao_minutos: data.duracao_minutos,
      responsavel_id: data.responsavel_id, responsavel_email: email, modalidade: data.modalidade,
      link_reuniao: data.link_reuniao, origem: data.origem, observacoes: data.observacoes,
    };
    if (!data.id) {
      const { data: ins, error } = await context.supabase
        .from("agendamentos")
        .insert({ ...row, lead_id: data.lead_id ?? null, created_by: context.userId, status: "agendada",
          historico: [{ em: new Date().toISOString(), acao: "criado" }] })
        .select("id").single();
      if (error) mapDbError(error);
      return { id: ins.id as string };
    }
    const { data: cur } = await context.supabase.from("agendamentos").select("data_hora_inicio, historico").eq("id", data.id).single();
    if (!cur) throw new Error("Agendamento não encontrado.");
    const historico = [...(cur.historico ?? [])];
    if (new Date(cur.data_hora_inicio).getTime() !== new Date(inicio).getTime())
      historico.push({ em: new Date().toISOString(), acao: "remarcado", de: cur.data_hora_inicio, para: inicio });
    else historico.push({ em: new Date().toISOString(), acao: "editado" });
    const { error } = await context.supabase.from("agendamentos").update({ ...row, historico }).eq("id", data.id);
    if (error) mapDbError(error);
    return { id: data.id };
  });

export const setAgendamentoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(STATUS) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const { data: cur } = await context.supabase.from("agendamentos").select("status, historico").eq("id", data.id).single();
    if (!cur) throw new Error("Agendamento não encontrado.");
    const historico = [...(cur.historico ?? []), { em: new Date().toISOString(), acao: "status", de: cur.status, para: data.status }];
    const { error } = await context.supabase.from("agendamentos").update({ status: data.status, historico }).eq("id", data.id);
    if (error) mapDbError(error);
    return { ok: true };
  });
