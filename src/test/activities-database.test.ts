import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
describe.skipIf(!url || !key)('Atomic CRM activity rules', () => {
  const db = createClient(url || 'http://localhost', key || 'unused', { auth: { persistSession: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key?.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization'); if (key) h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
  let leadId = '', owner = '', contractId = '', meetingId = '', installmentId = '';
  const saleId = crypto.randomUUID();
  const session = JSON.parse(process.env['LOVABLE_BROWSER_SUPABASE_SESSION_JSON'] || 'null');
  const user = session ? createClient(url || 'http://localhost', key || 'unused', { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` } } }) : null;
  const events = async (type: string) => { const { data, error } = await db.from('crm_activities').select('*').eq('lead_id', leadId).eq('type', type); if (error) throw error; return data ?? []; };
  beforeAll(async () => {
    const { data: roles } = await db.from('user_roles').select('user_id').eq('role', 'super_admin').limit(1);
    owner = roles?.[0]?.user_id ?? '';
    const { data, error } = await db.from('leads').insert({ name: 'Activity automated verification', company: 'Temporary verification', segment: 'Serviços', has_site: 'Não', uses_instagram: 'Não', advertises: 'Nunca', goals: ['Teste'], phone: '(22) 99999-0181', location: 'Teste', budget: 'Teste', consent: true }).select('id').single();
    if (error) throw error; leadId = data.id;
  });
  afterAll(async () => {
    if (contractId) { await db.from('contract_installments').delete().eq('contract_id', contractId); await db.from('contracts').delete().eq('id', contractId); }
    if (meetingId) await db.from('agendamentos').delete().eq('id', meetingId);
    await db.from('sale_payments').delete().eq('sale_id', saleId); await db.from('sales').delete().eq('id', saleId);
    if (leadId) { await db.from('crm_activities').delete().eq('lead_id', leadId); await db.from('leads').delete().eq('id', leadId); }
  });
  it('new form creates exactly one unread activity and unrelated updates do not duplicate it', async () => {
    await db.from('leads').update({ followup_note: 'Test' }).eq('id', leadId);
    const rows = await events('lead_created'); expect(rows).toHaveLength(1); expect(rows[0]?.read_at).toBeNull(); expect(rows[0]?.actor_id).toBeNull();
  });
  it('lead assignment logs only a changed responsible user', async () => {
    expect((await db.from('leads').update({ assigned_to: owner }).eq('id', leadId)).error).toBeNull();
    await db.from('leads').update({ assigned_to: owner }).eq('id', leadId);
    expect(await events('lead_assigned')).toHaveLength(1);
  });
  it('meeting create, reschedule and cancellation each record one real transition', async () => {
    const { data, error } = await db.from('agendamentos').insert({ lead_id: leadId, nome_cliente: 'Activity automated verification', whatsapp: '(22) 99999-0181', data_hora_inicio: '2099-01-21T12:00:00Z', responsavel_id: owner, responsavel_email: 'verification', data_hora_fim: '2099-01-21T12:30:00Z' }).select('id').single();
    expect(error).toBeNull(); if (!data) throw new Error('Meeting missing'); meetingId = data.id;
    expect((await db.from('agendamentos').update({ data_hora_inicio: '2099-01-21T13:00:00Z' }).eq('id', meetingId)).error).toBeNull();
    expect((await db.from('agendamentos').update({ status: 'cancelada' }).eq('id', meetingId)).error).toBeNull();
    await db.from('agendamentos').update({ status: 'cancelada' }).eq('id', meetingId);
    for (const type of ['meeting_created', 'meeting_rescheduled', 'meeting_cancelled']) expect(await events(type)).toHaveLength(1);
  });
  it('sale creates one activity and failed duplicate insert does not create success', async () => {
    const row = { id: saleId, lead_id: leadId, seller_id: owner, service: 'Teste', closed_on: '2026-10-18', initial_value: 490, monthly_value: 390, contract_type: 'recorrente', starts_on: '2026-10-18' };
    expect((await db.from('sales').insert(row)).error).toBeNull(); expect((await db.from('sales').insert(row)).error).not.toBeNull();
    expect(await events('sale_created')).toHaveLength(1);
  });
  it('contract creation, payment and cancellation log once per transition', async () => {
    const { data, error } = await db.from('contracts').insert({ sale_id: saleId, lead_id: leadId, seller_id: owner, starts_on: '2026-10-18', monthly_value: 390, due_day: 20 }).select('id').single();
    expect(error).toBeNull(); if (!data) throw new Error('Contract missing'); contractId = data.id;
    const { data: installment, error: insertError } = await db.from('contract_installments').insert({ contract_id: contractId, ref_month: '2026-10-01', due_date: '2026-10-20', amount_due: 390 }).select('id').single();
    expect(insertError).toBeNull(); if (!installment) throw new Error('Installment missing'); installmentId = installment.id;
    expect((await db.from('contract_installments').update({ status: 'pago', paid_on: '2026-10-18', amount_received: 390 }).eq('id', installmentId)).error).toBeNull();
    await db.from('contract_installments').update({ amount_received: 390 }).eq('id', installmentId);
    await db.from('contracts').update({ status: 'cancelado' }).eq('id', contractId); await db.from('contracts').update({ status: 'cancelado' }).eq('id', contractId);
    for (const type of ['contract_created', 'installment_paid', 'contract_cancelled']) expect(await events(type)).toHaveLength(1);
  });
  it.skipIf(!user)('authenticated clients cannot forge events or mutate their author', async () => {
    if (!user) return;
    expect((await user.from('crm_activities').insert({ type: 'sale_created', entity_id: saleId, actor_id: owner, description: 'Forged' })).error).not.toBeNull();
    const [event] = await events('lead_created'); if (!event) throw new Error('Activity missing');
    await user.from('crm_activities').update({ actor_id: owner }).eq('id', event.id);
    expect((await events('lead_created'))[0]?.actor_id).toBeNull();
  });
  it.skipIf(!user)('principal administrator read state persists and repeated reads are idempotent', async () => {
    if (!user) return;
    const [event] = await events('lead_created'); if (!event) throw new Error('Activity missing');
    expect((await user.rpc('crm_is_notification_admin')).data).toBe(true);
    expect((await user.rpc('crm_mark_notifications_read', { ids: [event.id] })).error).toBeNull();
    const [read] = await events('lead_created'); expect(read?.read_at).not.toBeNull();
    await user.rpc('crm_mark_notifications_read', { ids: [event.id] });
    expect((await events('lead_created'))[0]?.read_at).toBe(read?.read_at);
  });
});