import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery,useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Plus,Eye,Pencil,Search } from 'lucide-react';
import { AdminHeader } from '@/components/agency/admin-nav';
import { Button } from '@/components/ui/button';
import { SaleForm,SaleDetails } from '@/components/agency/sale-form';
import { salesQuery } from '@/lib/sales-query';
import { registerSale,editSale,savePayment,cancelSale } from '@/lib/sales.functions';
import { currency } from '@/lib/sales';
export const Route = createFileRoute('/_authenticated/admin_/vendas')({
 validateSearch:(s:Record<string,unknown>)=>({q:typeof s.q==='string'?s.q:''}),
 loader:async({context})=>{await context.queryClient.ensureQueryData(salesQuery);},
 head:()=>({meta:[{title:'Vendas | LAUX AGÊNCIA'},{name:'description',content:'Registro privado de contratos e pagamentos da LAUX AGÊNCIA.'},{property:'og:title',content:'Vendas | LAUX AGÊNCIA'},{property:'og:description',content:'Vendas vinculadas aos clientes do CRM LAUX.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex, nofollow'}]}),
 errorComponent:({error})=><p role="alert" className="admin-empty">{error.message}</p>,notFoundComponent:()=> <p>Vendas não encontradas.</p>,component:SalesPage,
});
function SalesPage(){
 const {data}=useSuspenseQuery(salesQuery);const qc=useQueryClient();const register=useServerFn(registerSale);const edit=useServerFn(editSale);const payment=useServerFn(savePayment);const cancel=useServerFn(cancelSale);
 const {q}=Route.useSearch();const navigate=Route.useNavigate();const [form,setForm]=useState<string|null>(null);const [details,setDetails]=useState<string|null>(null);
 async function refresh(){await Promise.all([qc.invalidateQueries({queryKey:['commercial']}),qc.invalidateQueries({queryKey:['leads']})]);}
 const rows=[...data.sales].sort((a,b)=>b.closed_on.localeCompare(a.closed_on)).filter(s=>{const l=data.leads.find(l=>l.id===s.lead_id);return `${l?.name} ${l?.company} ${s.service} ${s.seller_email}`.toLowerCase().includes(q.toLowerCase());});
 const selected=data.sales.find(s=>s.id===details);
 return <main className="admin-shell"><div className="admin-container"><AdminHeader title="Vendas" subtitle={data.isAdmin?'Contratos e recebimentos da equipe.':'Meus contratos e recebimentos.'}><Button variant="premium" onClick={()=>setForm('new')}><Plus/>Registrar venda</Button></AdminHeader><div className="admin-toolbar"><label className="admin-search"><Search size={16}/><input aria-label="Buscar vendas" placeholder="Buscar cliente, serviço ou vendedor" value={q} onChange={e=>void navigate({search:{q:e.target.value},replace:true})}/></label><span className="text-muted-foreground">{rows.length} vendas</span></div>{!rows.length?<p className="admin-empty">Nenhuma venda encontrada. Os registros aparecerão aqui.</p>:<div className="admin-table-scroll"><table className="admin-table"><thead><tr>{['Cliente / Empresa','Serviço','Vendedor','Data','Contratado','Mensalidade','Pagamento','Ações'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(s=>{const l=data.leads.find(l=>l.id===s.lead_id);const ps=data.payments.filter(p=>p.sale_id===s.id);const paid=ps.filter(p=>p.status==='pago').reduce((n,p)=>n+p.amount,0);return <tr key={s.id}><td><strong>{l?.name}</strong><div>{l?.company}</div></td><td>{s.service}{s.status==='cancelada'&&<span className="sale-status">Cancelada</span>}</td><td>{s.seller_email}</td><td>{s.closed_on}</td><td>{currency(s.initial_value)}</td><td>{currency(s.monthly_value)}</td><td>{s.status==='cancelada'?'Cancelada':paid>0?(paid<s.initial_value?'Parcial':'Pago'):ps.some(p=>p.status==='pendente')?'Pendente':'Cancelado'}</td><td><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Detalhes de ${l?.name}`} onClick={()=>setDetails(s.id)}><Eye/></Button>{s.status==='valida'&&<Button variant="ghost" size="icon" aria-label={`Editar venda de ${l?.name}`} onClick={()=>setForm(s.id)}><Pencil/></Button>}</div></td></tr>;})}</tbody></table></div>}</div>
 {form&&<SaleForm key={form} data={data} initial={data.sales.find(s=>s.id===form)} onClose={()=>setForm(null)} onSave={async(s,p)=>{if(form==='new')await register({data:{sale:s,payment:p}});else await edit({data:s});await refresh();}}/>}
 {selected&&<SaleDetails sale={selected} data={data} onClose={()=>setDetails(null)} onPayment={async(id,p)=>{await payment({data:{id,sale_id:selected.id,payment:p}});await refresh();}} onCancel={async()=>{await cancel({data:{id:selected.id}});await refresh();}}/>}
 </main>;
}