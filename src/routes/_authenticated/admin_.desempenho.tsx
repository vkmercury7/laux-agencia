import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AdminHeader } from '@/components/agency/admin-nav';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { getTeamPerformance } from '@/lib/calls.functions';
import { getMyAccess } from '@/lib/team.functions';
import { currency, todaySP } from '@/lib/sales';
import { ROLE_LABELS } from '@/lib/team-roles';

export const Route = createFileRoute('/_authenticated/admin_/desempenho')({
  head: () => ({ meta: [{ title: 'Desempenho da Equipe | LAUX AGÊNCIA' }, { name: 'description', content: 'Painel privado de desempenho da equipe LAUX AGÊNCIA.' }, { property: 'og:title', content: 'Desempenho da Equipe | LAUX AGÊNCIA' }, { property: 'og:description', content: 'Indicadores de produtividade da equipe.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: PerformancePage,
});

function PerformancePage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchPerf = useServerFn(getTeamPerformance);
  const { data: access, isLoading: loadingAccess } = useQuery({ queryKey: ['access'], queryFn: () => fetchAccess() });

  const today = todaySP();
  const week = new Date(`${today}T12:00:00Z`); week.setUTCDate(week.getUTCDate() - 6);
  const [period, setPeriod] = useState('month');
  const [member, setMember] = useState('');
  const [role, setRole] = useState('');
  const from = period === 'today' ? today : period === 'week' ? week.toISOString().slice(0, 10) : `${today.slice(0, 7)}-01`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['team-performance', from, today],
    queryFn: () => fetchPerf({ data: { from, to: today } }),
    enabled: Boolean(access?.isAdmin),
  });

  if (loadingAccess) return <main className="admin-shell"><p className="admin-empty">Carregando...</p></main>;
  if (!access?.isAdmin) return <main className="admin-shell"><div className="admin-container"><AdminHeader title="Acesso restrito" /><p className="admin-empty" role="alert">Esta seção é exclusiva para administradores.</p></div></main>;

  const rows = (data?.rows ?? []).filter((r) => (!member || r.userId === member) && (!role || r.role === role));
  const roles = [...new Set((data?.rows ?? []).map((r) => r.role).filter(Boolean))];

  return <main className="admin-shell"><div className="admin-container">
    <AdminHeader title="Desempenho da Equipe" subtitle="Produtividade individual com dados reais do CRM." />
    <div className="commercial-filters">
      <div className="flex flex-wrap gap-2">
        {[['today', 'Hoje'], ['week', 'Últimos 7 dias'], ['month', 'Este mês']].map(([key, label]) =>
          <Button key={key} variant={period === key ? 'secondary' : 'outline'} onClick={() => setPeriod(key!)}>{label}</Button>)}
      </div>
      <Select value={member || 'all'} onValueChange={(v) => setMember(v === 'all' ? '' : v)}>
        <SelectTrigger aria-label="Filtrar colaborador" className="activity-select"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos os colaboradores</SelectItem>
          {(data?.rows ?? []).map((r) => <SelectItem key={r.userId} value={r.userId}>{r.email}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={role || 'all'} onValueChange={(v) => setRole(v === 'all' ? '' : v)}>
        <SelectTrigger aria-label="Filtrar cargo" className="activity-select"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos os cargos</SelectItem>
          {roles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    {isLoading && <p className="admin-empty">Carregando indicadores...</p>}
    {error && <p role="alert" className="text-destructive">Não foi possível carregar o desempenho.</p>}
    {data && <>
      <div className="commercial-stats">
        {[['Ligações registradas', data.totals.calls], ['Reuniões agendadas', data.totals.meetings], ['Vendas fechadas', data.totals.sales], ['Valor total vendido', currency(data.totals.sold)]].map(([label, value]) =>
          <div className="admin-card admin-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <section className="commercial-section">
        <h2>Desempenho individual</h2>
        {!rows.length && <p className="admin-empty">Sem dados registrados neste período.</p>}
        {rows.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Colaborador</th><th>Cargo</th><th>Ligações</th><th>Retornos pendentes</th><th>Reuniões</th><th>Vendas</th><th>Valor vendido</th><th>Clientes de tráfego</th></tr></thead>
          <tbody>{rows.map((r) => {
            const isSeller = ['seller', 'collaborator', 'admin', 'super_admin'].includes(r.role);
            const isTraffic = r.role === 'traffic_manager';
            return <tr key={r.userId}>
              <td>{r.email}</td><td>{ROLE_LABELS[r.role] ?? r.role}</td>
              <td>{r.calls}</td><td>{r.pending}</td>
              <td>{r.meetings}</td>
              <td>{isSeller ? r.sales : '—'}</td>
              <td>{isSeller ? currency(r.sold) : '—'}</td>
              <td>{isTraffic ? r.trafficClients : '—'}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </section>
    </>}
  </div></main>;
}
