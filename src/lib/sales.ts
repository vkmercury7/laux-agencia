import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T12:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v; }, 'Data inválida');
const money = z.number().finite().min(0).max(999999999999.99).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.001, 'Use até dois centavos');
export const paymentSchema = z.object({ amount: money, status: z.enum(['pendente','pago','cancelado']), received_on: date.nullable(), method: z.string().trim().max(80) }).refine(v => v.status === 'pago' ? Boolean(v.received_on) : v.received_on === null, 'Informe a data do recebimento');
export const saleSchema = z.object({ id: z.string().uuid(), lead_id: z.string().uuid(), seller_id: z.string().uuid(), service: z.string().trim().min(1).max(120), closed_on: date, initial_value: money, monthly_value: money, contract_type: z.enum(['unico','recorrente']), starts_on: date, contract_status: z.enum(['ativo','encerrado']), notes: z.string().trim().max(2000) }).refine(v => v.contract_type === 'recorrente' || v.monthly_value === 0, 'Contrato único não tem mensalidade');
export type SaleInput = z.infer<typeof saleSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export const currency = (v: number) => v.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
export function parseMoney(value: string) { return Number(value.includes(',') ? value.replace(/\./g,'').replace(',','.') : value); }
export const todaySP = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export type MetricSale = { id:string; lead_id:string; seller_id:string; closed_on:string; initial_value:number; monthly_value:number; contract_type:string; starts_on:string; contract_status:string; status:string };
export type MetricPayment = { sale_id:string; amount:number; status:string; received_on:string|null };
export type MetricContract = { id:string; sale_id:string; seller_id:string; starts_on:string; monthly_value:number|null; status:string };
export type MetricInstallment = { contract_id:string; status:string; paid_on:string|null; amount_received:number|null };
export function salesMetrics(sales: MetricSale[], payments: MetricPayment[], leads: {id:string;created_at:string}[], meetings: {data_hora_inicio:string;status:string;responsavel_id:string}[], from:string,to:string,seller='', today=todaySP(), contracts: MetricContract[]=[], installments: MetricInstallment[]=[]) {
 const inRange = (d:string) => (!from || d>=from) && (!to || d<=to);
 const owned = sales.filter(s => !seller || s.seller_id===seller);
 const valid = owned.filter(s => s.status==='valida');
 const period = valid.filter(s => inRange(s.closed_on));
 const ids = new Set(owned.map(s=>s.id));
 const total = Math.round(period.reduce((n,s)=>n+s.initial_value*100,0))/100;
 const ownedContracts = contracts.filter(c => !seller || c.seller_id===seller);
 const contractIds = new Set(ownedContracts.map(c=>c.id));
 const receivedSales = payments.filter(p=>ids.has(p.sale_id) && p.status==='pago' && p.received_on && inRange(p.received_on)).reduce((n,p)=>n+p.amount*100,0);
 const receivedInstallments = installments.filter(i=>contractIds.has(i.contract_id) && i.status==='pago' && i.paid_on && inRange(i.paid_on)).reduce((n,i)=>n+(i.amount_received??0)*100,0);
 const received = Math.round(receivedSales+receivedInstallments)/100;
 // MRR: contratos ativos recorrentes quando existem; caso contrário, recorrentes da venda.
 const mrr = ownedContracts.length
  ? Math.round(ownedContracts.filter(c=>c.status==='ativo' && (c.monthly_value??0)>0 && c.starts_on<=today).reduce((n,c)=>n+(c.monthly_value??0)*100,0))/100
  : Math.round(valid.filter(s=>s.contract_type==='recorrente' && s.contract_status==='ativo' && s.starts_on<=today).reduce((n,s)=>n+s.monthly_value*100,0))/100;
 const distinct = new Set(period.map(s=>s.lead_id)).size;
 const bars = Object.entries(period.reduce<Record<string,number>>((a,s)=>{a[s.closed_on]=(a[s.closed_on]??0)+s.initial_value;return a;},{})).sort(([a],[b])=>a.localeCompare(b));
 return {count:period.length,total,received,mrr,ticket:period.length?total/period.length:0,leads:leads.filter(l=>inRange(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(l.created_at)))).length,meetings:meetings.filter(m=>m.status!=='cancelada' && (!seller || m.responsavel_id===seller) && inRange(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(m.data_hora_inicio)))).length,conversion:leads.length?distinct/leads.length*100:0,bars,latest:[...period].sort((a,b)=>b.closed_on.localeCompare(a.closed_on)).slice(0,6)};
}