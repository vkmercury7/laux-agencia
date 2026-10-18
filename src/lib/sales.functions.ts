import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { paymentSchema, saleSchema } from './sales';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
type Context = {supabase:SupabaseClient<Database>;userId:string};
async function access(ctx:Context) {
 const [{data:allowed,error},{data:admin,error:roleError}] = await Promise.all([ctx.supabase.rpc('crm_can_consult'),ctx.supabase.rpc('crm_is_admin')]);
 if(error || roleError || !allowed) throw new Error('Acesso não autorizado.');
 return Boolean(admin);
}
async function allRows<T>(fetchPage:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>) {
 const rows:T[]=[];
 for(let offset=0;;offset+=500){ const {data,error}=await fetchPage(offset,offset+499); if(error) throw new Error('Não foi possível carregar os dados comerciais.'); rows.push(...(data??[])); if((data??[]).length<500) return rows; }
}
export const getSalesData = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const isAdmin=await access(context);
 const {data:canSell}=await context.supabase.rpc('crm_can_sell',{uid:context.userId});
 const [sales,payments,leads,meetings,contracts,installments] = await Promise.all([
  allRows((a,b)=>context.supabase.from('sales').select('*').order('id').range(a,b)),
 isAdmin ? allRows((a,b)=>context.supabase.from('sale_payments').select('*').order('id').range(a,b)) : [],
 allRows((a,b)=>context.supabase.from('leads').select('id,name,company,phone,created_at').order('id').range(a,b)),
 allRows((a,b)=>context.supabase.from('agendamentos').select('id,lead_id,data_hora_inicio,status,responsavel_id,nome_cliente').order('id').range(a,b)),
 allRows((a,b)=>context.supabase.from('contracts').select('*').order('id').range(a,b)),
 isAdmin ? allRows((a,b)=>context.supabase.from('contract_installments').select('*').order('id').range(a,b)) : [],
 ]);
 const sellers:{id:string;email:string}[]=[];
 if(isAdmin){
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:roles,error}=await supabaseAdmin.from('user_roles').select('user_id');
  if(error) throw new Error('Não foi possível carregar os vendedores.');
  for(const id of new Set((roles??[]).map(r=>r.user_id))){ const {data:ok}=await context.supabase.rpc('crm_can_sell',{uid:id}); if(!ok)continue; const {data}=await supabaseAdmin.auth.admin.getUserById(id); if(data.user?.email)sellers.push({id,email:data.user.email}); }
 } else { const {data}=await context.supabase.auth.getUser(); if(data.user?.email)sellers.push({id:context.userId,email:data.user.email}); }
 return {sales,payments,leads,meetings,contracts,installments,sellers,isAdmin,canSell:Boolean(canSell),userId:context.userId};
});
export const registerSale = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({sale:saleSchema,payment:paymentSchema}).parse(v)).handler(async({data,context})=>{
 const admin=await access(context); const {data:canSell}=await context.supabase.rpc('crm_can_sell',{uid:context.userId}); if(!canSell || (!admin && data.sale.seller_id!==context.userId))throw new Error('Acesso não autorizado.');
 const {data:id,error}=await context.supabase.rpc('crm_register_sale',{payload:{...data.sale,payment_amount:data.payment.amount,payment_status:data.payment.status,received_on:data.payment.received_on,payment_method:data.payment.method}});
 if(error)throw new Error('Não foi possível registrar a venda. Confira o cliente, vendedor e valores.'); return {id};
});
export const editSale = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>saleSchema.parse(v)).handler(async({data,context})=>{
 await access(context); const {id,...row}=data; const {data:saved,error}=await context.supabase.from('sales').update(row).eq('id',id).select('id').single(); if(error || !saved)throw new Error('Não foi possível editar a venda.'); return saved;
});
export const cancelSale = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
 if(!await access(context))throw new Error('Somente administradores podem cancelar vendas.'); const {data:saved,error}=await context.supabase.from('sales').update({status:'cancelada',contract_status:'encerrado'}).eq('id',data.id).select('id').single(); if(error || !saved)throw new Error('Não foi possível cancelar.'); return saved;
});
export const savePayment = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid().optional(),sale_id:z.string().uuid(),payment:paymentSchema}).parse(v)).handler(async({data,context})=>{
 if(!await access(context))throw new Error('Somente administradores podem registrar pagamentos.'); const row={...data.payment,sale_id:data.sale_id};
 const result=data.id ? await context.supabase.from('sale_payments').update(row).eq('id',data.id).select('id').single() : await context.supabase.from('sale_payments').insert(row).select('id').single();
 if(result.error || !result.data)throw new Error('Não foi possível salvar o pagamento. Recebimentos já registrados só podem ser corrigidos por administradores.'); return result.data;
});