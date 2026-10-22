import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assignableRoleSchema } from './team-roles';

type Ctx = { supabase: any; userId: string };

async function requireSuper(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("crm_is_admin");
  if (error || !data) throw new Error("Acesso restrito ao administrador principal.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const redirectTo = () => `${getRequestHeader("origin") ?? ""}/reset-password`;

async function audit(admin: any, actor: string, action: string, email: string, details: object = {}) {
  await admin.from("team_audit").insert({ actor_id: actor, action, target_email: email, details });
}

/** Which areas the signed-in user may open (checked on the server). */
export const getMyAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: canViewLeads }, { data: isSuper }] = await Promise.all([
      context.supabase.rpc("can_view_leads", { _user_id: context.userId }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    const { data: isAdmin } = await context.supabase.rpc("crm_is_admin");
    const { data: rows, error } = await context.supabase.from('user_roles').select('role').eq('user_id',context.userId);
    if(error)throw new Error('Não foi possível verificar o acesso.');
    return { canViewLeads: Boolean(canViewLeads), isSuper: Boolean(isSuper), isAdmin: Boolean(isAdmin), userId: context.userId, roles:(rows??[]).map(r=>r.role) };
  });

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireSuper(context);
    const { data, error } = await admin.from("team_members").select("*").order("invited_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar a equipe.");
    for (const m of data ?? []) {
      if (m.status === "pending" && m.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(m.user_id);
        if (u?.user?.last_sign_in_at) {
          m.status = "active";
          await admin.from("team_members").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", m.id);
        }
      }
    }
    const rows = (data ?? []).map((m: any) => ({
      id: m.id as string, email: m.email as string, role: m.role as string,
      status: m.status as string, invited_at: m.invited_at as string, full_name: m.full_name as string | null,
    }));
    // Administrators with a real role but no team_members row (principal admin), shown read-only.
    const known = new Set((data ?? []).map((m: any) => m.user_id).filter(Boolean));
    const { data: adminRoles } = await admin.from("user_roles").select("user_id, role").in("role", ["admin", "super_admin"]);
    for (const r of adminRoles ?? []) {
      if (known.has(r.user_id)) continue;
      known.add(r.user_id);
      const { data: u } = await admin.auth.admin.getUserById(r.user_id);
      if (!u?.user?.email) continue;
      rows.unshift({ id: `auth:${r.user_id}`, email: u.user.email, role: "super_admin", status: "active",
        invited_at: u.user.created_at, full_name: (u.user.user_metadata?.["full_name"] as string | undefined) ?? null });
    }
    return rows;
  });

const roleSchema = assignableRoleSchema;

export const updateMemberName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^(auth:)?[0-9a-f-]{36}$/i), fullName: z.string().trim().min(1, 'Informe o nome completo.').max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: permissionError } = await context.supabase.rpc('crm_is_admin');
    if (permissionError || !isAdmin) throw new Error('Acesso restrito aos administradores.');
    if (data.id.startsWith('auth:')) {
      const uid = data.id.slice(5);
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: r } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', uid).in('role', ['admin', 'super_admin']).limit(1);
      if (!r?.length) throw new Error('Não foi possível salvar o nome.');
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const { error: e } = await supabaseAdmin.auth.admin.updateUserById(uid, { user_metadata: { ...(u?.user?.user_metadata ?? {}), full_name: data.fullName } });
      if (e) throw new Error('Não foi possível salvar o nome.');
      return { ok: true };
    }
    const { error } = await context.supabase.rpc('crm_update_team_member_name', { member_id: data.id, new_name: data.fullName });
    if (error) throw new Error('Não foi possível salvar o nome.');
    return { ok: true };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(255), role: roleSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireSuper(context);
    const { data: existing } = await admin.from("team_members").select("id, status").eq("email", data.email).maybeSingle();
    if (existing && existing.status !== "revoked") throw new Error("Este e-mail já é membro ou tem convite pendente.");

    const { data: inv, error } = await admin.auth.admin.inviteUserByEmail(data.email, { redirectTo: redirectTo() });
    if (error || !inv?.user) {
      console.error("invite failed", error);
      throw new Error(
        error?.message?.toLowerCase().includes("already")
          ? "Já existe uma conta com este e-mail. O convite não foi enviado."
          : "O e-mail de convite não pôde ser enviado. Nenhum convite foi registrado.",
      );
    }
    const row = { email: data.email, user_id: inv.user.id, role: data.role, status: "pending", invited_by: context.userId, invited_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (existing) await admin.from("team_members").update(row).eq("id", existing.id);
    else await admin.from("team_members").insert(row);
    await admin.from("user_roles").insert({ user_id: inv.user.id, role: data.role });
    await audit(admin, context.userId, "invite", data.email, { role: data.role });
    return { ok: true };
  });

async function getMember(admin: any, id: string, self: string) {
  const { data: m } = await admin.from("team_members").select("*").eq("id", id).maybeSingle();
  if (!m) throw new Error("Membro não encontrado.");
  if (m.user_id === self || m.role === "super_admin") throw new Error("O administrador principal não pode ser alterado aqui.");
  return m;
}

export const revokeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireSuper(context);
    const m = await getMember(admin, data.id, context.userId);
    if (m.user_id) await admin.from("user_roles").delete().eq("user_id", m.user_id).neq("role", "super_admin");
    await admin.from("team_members").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", m.id);
    await audit(admin, context.userId, m.status === "pending" ? "revoke_invite" : "remove_member", m.email);
    return { ok: true };
  });

export const changeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), role: roleSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireSuper(context);
    const m = await getMember(admin, data.id, context.userId);
    if (m.status === "revoked") throw new Error("Membro revogado. Envie um novo convite.");
    const {error}=await context.supabase.rpc('crm_change_team_role',{member_id:m.id,new_role:data.role});
    if(error)throw new Error('Não foi possível alterar o cargo.');
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireSuper(context);
    const m = await getMember(admin, data.id, context.userId);
    if (m.status !== "pending") throw new Error("Só convites pendentes podem ser reenviados.");
    const { error } = await admin.auth.admin.inviteUserByEmail(m.email, { redirectTo: redirectTo() });
    if (error) {
      console.error("resend failed", error);
      throw new Error("O convite não pôde ser reenviado agora. Tente novamente mais tarde.");
    }
    await audit(admin, context.userId, "resend_invite", m.email);
    return { ok: true };
  });
