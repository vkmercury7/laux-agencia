import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { funnelUpdateSchema, funnelChanges } from "@/lib/funnel";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().min(1).max(120),
  segment: z.string().trim().min(1).max(60),
  hasSite: z.string().trim().min(1).max(40),
  usesInstagram: z.string().trim().min(1).max(40),
  advertises: z.string().trim().min(1).max(60),
  goals: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  phone: z.string().trim().regex(/^\(\d{2}\) 9\d{4}-\d{4}$/),
  location: z.string().trim().min(2).max(120),
  budget: z.string().trim().min(1).max(60),
  consent: z.literal(true),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Public endpoint: validates, blocks duplicates/spam and stores the diagnosis lead. */
export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await supabaseAdmin
      .from("leads")
      .select("id, created_at")
      .eq("phone", data.phone)
      .gte("created_at", hourAgo);
    if (recentError) throw new Error("Não foi possível registrar agora. Tente novamente.");
    const duplicate = recent?.[0];
    if (duplicate) {
      return { ok: true as const, duplicate: true as const, id: duplicate.id };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("leads")
      .insert({
        name: data.name,
        company: data.company,
        segment: data.segment,
        has_site: data.hasSite,
        uses_instagram: data.usesInstagram,
        advertises: data.advertises,
        goals: data.goals,
        phone: data.phone,
        location: data.location,
        budget: data.budget,
        consent: data.consent,
      })
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível registrar agora. Tente novamente.");
    return { ok: true as const, duplicate: false as const, id: inserted.id };
  });

/** Shared consultation; ownership-based writes remain enforced by RLS. */
export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("crm_can_consult");
    if (roleError || !isAdmin) throw new Error("Forbidden");

    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await context.supabase.from("leads").select("*")
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw new Error("Não foi possível carregar os formulários.");
      rows.push(...(data ?? []));
      if ((data ?? []).length < 500) return rows;
    }
  });

export const updateLeadFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => funnelUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc("can_view_leads", { _user_id: context.userId });
    if (roleError || !allowed) throw new Error("Acesso não autorizado.");
    const { data: lead, error } = await context.supabase.from("leads")
      .update(funnelChanges(data)).eq("id", data.id).select("*").single();
    if (error || !lead) throw new Error("Não foi possível salvar a etapa. Tente novamente.");
    return lead;
  });

/** Admin-only: assigns (or clears) the team member responsible for a lead. */
export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), assignedTo: z.string().uuid().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("crm_is_admin");
    if (roleError || !isAdmin) throw new Error("Somente administradores podem atribuir responsáveis.");
    const { data: lead, error } = await context.supabase.from("leads")
      .update({ assigned_to: data.assignedTo }).eq("id", data.id).select("*").single();
    if (error || !lead) throw new Error("Não foi possível salvar o responsável. Tente novamente.");
    return lead;
  });

const followupSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  note: z.string().trim().max(300),
  done: z.boolean(),
});

/** Team: saves the follow-up of a lead (ownership enforced in the database). */
export const saveFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => followupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc("can_view_leads", { _user_id: context.userId });
    if (roleError || !allowed) throw new Error("Acesso não autorizado.");
    const { data: lead, error } = await context.supabase.from("leads")
      .update({ followup_date: data.date, followup_time: data.time, followup_note: data.note, followup_done: data.done })
      .eq("id", data.id).select("*").single();
    if (error || !lead) throw new Error("Não foi possível salvar o retorno. Tente novamente.");
    return lead;
  });
