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

/** Admin-only list of stored leads. */
export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("can_view_leads", {
      _user_id: context.userId,
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error("Não foi possível carregar os formulários.");
    return data;
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
