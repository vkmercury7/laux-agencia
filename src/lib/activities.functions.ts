import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { ACTIVITY_LABELS } from './activities';
export const listActivities = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ type: z.string().refine(v => v === 'all' || v in ACTIVITY_LABELS), page: z.number().int().min(0).max(100000) }).parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from('crm_activities').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (data.type !== 'all') query = query.eq('type', data.type);
    const { data: rows, count, error } = await query.range(data.page * 40, data.page * 40 + 39);
    if (error) throw new Error('Não foi possível carregar as atividades.');
    return { rows: rows ?? [], count: count ?? 0 };
  });
export const getNotifications = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed, error: accessError } = await context.supabase.rpc('crm_is_notification_admin');
  if (accessError) throw new Error('Não foi possível carregar as notificações.');
  if (!allowed) return { allowed: false, rows: [], count: 0 };
  const { data, count, error } = await context.supabase.from('crm_activities').select('*', { count: 'exact' }).eq('type', 'lead_created').is('read_at', null).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30);
  if (error) throw new Error('Não foi possível carregar as notificações.');
  return { allowed: true, rows: data ?? [], count: count ?? 0 };
});
export const markNotificationsRead = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('crm_mark_notifications_read', { ids: data.ids });
    if (error) throw new Error('Não foi possível marcar como lida.');
    return { ok: true };
  });
export const openNotificationLead = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc('crm_is_notification_admin');
    if (!allowed) throw new Error('Acesso não autorizado.');
    const { data: event, error: eventError } = await context.supabase.from('crm_activities').select('lead_id').eq('id', data.id).eq('type', 'lead_created').single();
    if (eventError || !event?.lead_id) throw new Error('Formulário não encontrado.');
    const { data: lead, error } = await context.supabase.from('leads').select('*').eq('id', event.lead_id).single();
    if (error || !lead) throw new Error('Formulário não encontrado.');
    return lead;
  });