import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminHeader } from '@/components/agency/admin-nav';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { listActivities } from '@/lib/activities.functions';
import { ACTIVITY_LABELS, activityTime } from '@/lib/activities';
export const Route = createFileRoute('/_authenticated/admin_/atividades')({
  head: () => ({ meta: [{ title: 'Atividades | LAUX AGÊNCIA' }, { name: 'description', content: 'Histórico privado de acontecimentos reais do CRM LAUX AGÊNCIA.' }, { property: 'og:title', content: 'Atividades | LAUX AGÊNCIA' }, { property: 'og:description', content: 'Linha do tempo de formulários, reuniões, vendas e contratos.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }), component: ActivitiesPage,
});
function ActivitiesPage() {
  const fetch = useServerFn(listActivities);
  const [type, setType] = useState('all'), [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({ queryKey: ['activities', type, page], queryFn: () => fetch({ data: { type, page } }), refetchInterval: 60_000 });
  return <main className="admin-shell"><div className="admin-container"><AdminHeader title="Atividades" subtitle="Acontecimentos recentes da equipe."/><div className="activity-toolbar"><Select value={type} onValueChange={v => { setType(v); setPage(0); }}><SelectTrigger aria-label="Filtrar atividades" className="activity-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas as atividades</SelectItem>{Object.entries(ACTIVITY_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><span>{data?.count ?? 0} atividades</span></div>{isLoading && <p className="admin-empty">Carregando atividades...</p>}{error && <p role="alert" className="text-destructive">Não foi possível carregar as atividades.</p>}{!isLoading && !error && !data?.rows.length && <p className="admin-empty">Nenhuma atividade registrada ainda.</p>}<ol className="activity-timeline">{data?.rows.map(row => <li key={row.id}><div className="activity-marker"><Activity size={16}/></div><div className="activity-content"><div className="activity-meta"><strong>{ACTIVITY_LABELS[row.type] ?? row.type}</strong><time>{activityTime(row.created_at)}</time></div><h2>{row.client_name}{row.company && <span> · {row.company}</span>}</h2><p>{row.description}</p>{row.actor_name && <small>Por {row.actor_name}</small>}</div></li>)}</ol><div className="activity-pagination"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft/></Button><span>Página {page + 1}</span><Button variant="outline" size="icon" aria-label="Próxima página" disabled={(page + 1) * 40 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)}><ChevronRight/></Button></div></div></main>;
}