import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { campaignSchema,resultSchema } from './traffic';
export const getTrafficData=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data:allowed,error:accessError}=await context.supabase.rpc('crm_has_any_role',{uid:context.userId,roles:['super_admin','admin','traffic_manager']});
 if(accessError||!allowed)throw new Error('Acesso restrito à gestão de tráfego.');
 const {data:admin}=await context.supabase.rpc('crm_is_admin');
 const [clients,campaigns,results,activities]=await Promise.all([
 context.supabase.rpc('traffic_client_info'), context.supabase.from('traffic_campaigns').select('*').order('updated_at',{ascending:false}), context.supabase.from('traffic_results').select('*').order('starts_on',{ascending:false}), context.supabase.from('crm_activities').select('*').eq('type','traffic_operation').order('created_at',{ascending:false}).limit(200),
 ]);
 if(clients.error||campaigns.error||results.error||activities.error)throw new Error('Não foi possível carregar a gestão de tráfego.');
 const managers:{id:string;email:string}[]=[];
 if(admin){const {supabaseAdmin}=await import('@/integrations/supabase/client.server'); const {data:roles,error}=await supabaseAdmin.from('user_roles').select('user_id').in('role',['traffic_manager','admin','super_admin']); if(error)throw new Error('Não foi possível carregar gestores.'); for(const id of new Set((roles??[]).map(r=>r.user_id))){const {data}=await supabaseAdmin.auth.admin.getUserById(id);if(data.user?.email)managers.push({id,email:data.user.email});}}
 return {clients:clients.data??[],campaigns:campaigns.data??[],results:results.data??[],activities:activities.data??[],managers,isAdmin:Boolean(admin)};
});
export const assignTrafficManager=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({lead_id:z.string().uuid(),manager_id:z.string().uuid().nullable()}).parse(v)).handler(async({data,context})=>{
 const {data:admin}=await context.supabase.rpc('crm_is_admin');if(!admin)throw new Error('Somente administradores podem atribuir gestores.');
 if(data.manager_id){const {data:ok}=await context.supabase.rpc('crm_has_any_role',{uid:data.manager_id,roles:['traffic_manager','admin','super_admin']});if(!ok)throw new Error('Gestor sem cargo autorizado.');}
 const {error}=await context.supabase.from('traffic_clients').upsert({...data,updated_at:new Date().toISOString()});if(error)throw new Error('Não foi possível atribuir o gestor.');return {ok:true};
});
export const saveTrafficCampaign=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>campaignSchema.parse(v)).handler(async({data,context})=>{
 const {id,...row}=data;
 const result=id?await context.supabase.from('traffic_campaigns').update({...row,updated_at:new Date().toISOString()}).eq('id',id).select('id').single():await context.supabase.from('traffic_campaigns').insert(row).select('id').single();
 if(result.error||!result.data)throw new Error('Não foi possível salvar a campanha. Confira o cliente e sua atribuição.');return result.data;
});
export const saveTrafficResult=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>resultSchema.parse(v)).handler(async({data,context})=>{
 const {error}=await context.supabase.from('traffic_results').insert(data);if(error)throw new Error(error.code==='23P01'?'Já existem resultados dessa campanha nesse período. Não sobreponha datas.':'Não foi possível salvar os resultados.');return {ok:true};
});
export const addTrafficNote=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({lid:z.string().uuid(),description:z.string().trim().min(1).max(2000)}).parse(v)).handler(async({data,context})=>{const {error}=await context.supabase.rpc('traffic_add_note',data);if(error)throw new Error('Não foi possível registrar a atividade.');return {ok:true};});