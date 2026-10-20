import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AdminHeader } from '@/components/agency/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTeamPerformance } from '@/lib/calls.functions';
import { getMyAccess } from '@/lib/team.functions';
import { currency, todaySP } from '@/lib/sales';
import { ROLE_LABELS } from '@/lib/team-roles';

export const Route = createFileRoute('/_authenticated/admin_/desempenho')({
  head: () => ({
    meta: [
      { title: 'Desempenho da Equipe | LAUX AGÊNCIA' },
      { name: 'description', content: 'Painel privado de desempenho da equipe LAUX AGÊNCIA.' },
      { property: 'og:title', content: 'Desempenho da Equipe | LAUX AGÊNCIA' },
      { property: 'og:description', content: 'Indicadores de produtividade da equipe.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: PerformancePage,
});

type PresenceStatus = 'online' | 'away' | 'offline' | 'unknown';
type RankingMetric = 'meetings' | 'sales' | 'sold';

function optionalValue(row: unknown, keys: string[]) {
  if (!row || typeof row !== 'object') return undefined;
  const source = row as Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function optionalText(row: unknown, keys: string[]) {
  const value = optionalValue(row, keys);
  return value === undefined ? undefined : String(value);
}

function rowName(row: unknown) {
  return optionalText(row, ['fullName', 'full_name', 'name', 'displayName', 'display_name']) ?? 'Nome não informado';
}

function rowStatus(row: unknown): PresenceStatus {
  const value = optionalText(row, ['status', 'presenceStatus', 'presence_status', 'presence'])?.toLowerCase();
  if (value === 'online' || value === 'active' || value === 'ativo') return 'online';
  if (value === 'away' || value === 'ausente' || value === 'idle') return 'away';
  if (value === 'offline' || value === 'inativo') return 'offline';
  return 'unknown';
}

function statusLabel(status: PresenceStatus) {
  return { online: 'Online', away: 'Ausente', offline: 'Offline', unknown: 'Não informado' }[status];
}

function statusClass(status: PresenceStatus) {
  return {
    online: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    away: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    offline: 'border-muted bg-muted text-muted-foreground',
    unknown: 'border-border bg-background text-muted-foreground',
  }[status];
}

function formatDate(value: unknown) {
  if (!value) return 'Não informado';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function PerformancePage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchPerf = useServerFn(getTeamPerformance);
  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ['access'],
    queryFn: () => fetchAccess(),
  });

  const today = todaySP();
  const yesterday = shiftDate(today, -1);
  const week = shiftDate(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [period, setPeriod] = useState('month');
  const [member, setMember] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [customFrom, setCustomFrom] = useState(monthStart);
  const [customTo, setCustomTo] = useState(today);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('sales');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const requestFrom = period === 'today'
    ? today
    : period === 'yesterday'
      ? yesterday
      : period === 'week'
        ? week
        : period === 'custom'
          ? customFrom
          : monthStart;
  const requestTo = period === 'yesterday' ? yesterday : period === 'custom' ? customTo : today;
  const validRange = requestFrom <= requestTo;

  const { data, isLoading, error } = useQuery({
    queryKey: ['team-performance', requestFrom, requestTo],
    queryFn: () => fetchPerf({ data: { from: requestFrom, to: requestTo } }),
    enabled: Boolean(access?.isAdmin && validRange),
  });

  const allRows = data?.rows ?? [];
  const roles = [...new Set(allRows.map((row) => row.role).filter(Boolean))];

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const name = rowName(row).toLowerCase();
      const email = row.email.toLowerCase();
      const matchesSearch = !normalizedSearch || name.includes(normalizedSearch) || email.includes(normalizedSearch);
      const matchesMember = !member || row.userId === member;
      const matchesRole = !role || row.role === role;
      const matchesStatus = !status || rowStatus(row) === status;
      return matchesSearch && matchesMember && matchesRole && matchesStatus;
    });
  }, [allRows, member, role, search, status]);

  const totals = useMemo(() => rows.reduce(
    (result, row) => ({
      calls: result.calls + Number(row.calls || 0),
      meetings: result.meetings + Number(row.meetings || 0),
      sales: result.sales + Number(row.sales || 0),
      sold: result.sold + Number(row.sold || 0),
    }),
    { calls: 0, meetings: 0, sales: 0, sold: 0 },
  ), [rows]);

  const onlineRows = rows.filter((row) => rowStatus(row) === 'online');
  const rankingRows = [...rows].sort((a, b) => {
    const aValue = Number(a[rankingMetric] || 0);
    const bValue = Number(b[rankingMetric] || 0);
    return bValue - aValue;
  }).slice(0, 5);
  const selectedRow = selectedUserId ? allRows.find((row) => row.userId === selectedUserId) : undefined;

  if (loadingAccess) {
    return <main className="admin-shell min-h-screen bg-background"><p className="admin-empty">Carregando...</p></main>;
  }

  if (!access?.isAdmin) {
    return <main className="admin-shell min-h-screen bg-background"><div className="admin-container"><AdminHeader title="Acesso restrito" /><p className="admin-empty" role="alert">Esta seção é exclusiva para administradores.</p></div></main>;
  }

  return (
    <main className="admin-shell min-h-screen bg-background">
      <div className="admin-container space-y-6">
        <AdminHeader title="Desempenho da Equipe" subtitle="Central administrativa de monitoramento e produtividade com dados registrados no CRM." />

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6" aria-label="Filtros administrativos">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">Filtros de monitoramento</h2>
            <p className="text-sm text-muted-foreground">Use os filtros para atualizar os indicadores, a lista e o ranking.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['today', 'Hoje'],
              ['yesterday', 'Ontem'],
              ['week', 'Últimos 7 dias'],
              ['month', 'Este mês'],
              ['custom', 'Período personalizado'],
            ].map(([key, label]) => (
              <Button key={key} type="button" variant={period === key ? 'secondary' : 'outline'} onClick={() => setPeriod(key)}>
                {label}
              </Button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-foreground">De<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label>
              <label className="grid gap-1 text-sm font-medium text-foreground">Até<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label>
            </div>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar nome ou e-mail" aria-label="Pesquisar funcionário" />
            <Select value={member || 'all'} onValueChange={(value) => setMember(value === 'all' ? '' : value)}>
              <SelectTrigger aria-label="Filtrar colaborador"><SelectValue placeholder="Todos os funcionários" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os funcionários</SelectItem>{allRows.map((row) => <SelectItem key={row.userId} value={row.userId}>{row.email}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={role || 'all'} onValueChange={(value) => setRole(value === 'all' ? '' : value)}>
              <SelectTrigger aria-label="Filtrar cargo"><SelectValue placeholder="Todos os cargos" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os cargos</SelectItem>{roles.map((item) => <SelectItem key={item} value={item}>{ROLE_LABELS[item] ?? item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
              <SelectTrigger aria-label="Filtrar status"><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="away">Ausente</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); setMember(''); setRole(''); setStatus(''); }}>Limpar filtros</Button>
          </div>
          {!validRange && <p className="mt-3 text-sm text-destructive" role="alert">Informe um período válido, com a data inicial anterior ou igual à data final.</p>}
        </section>

        {isLoading && <p className="admin-empty">Carregando indicadores...</p>}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar o desempenho.</p>}

        {data && !isLoading && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores gerais">
              <div className="admin-card admin-stat"><span>Funcionários na seleção</span><strong>{rows.length}</strong></div>
              <div className="admin-card admin-stat"><span>Ligações registradas</span><strong>{totals.calls}</strong></div>
              <div className="admin-card admin-stat"><span>Reuniões agendadas</span><strong>{totals.meetings}</strong></div>
              <div className="admin-card admin-stat"><span>Valor vendido</span><strong>{currency(totals.sold)}</strong></div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 className="text-xl font-semibold text-foreground">Funcionários</h2><p className="text-sm text-muted-foreground">Cada colaborador retornado pela consulta atual permanece visível mesmo com indicadores zerados.</p></div>
                <span className="text-sm text-muted-foreground">{rows.length} resultado(s)</span>
              </div>
              {!rows.length && <p className="admin-empty rounded-xl border border-dashed border-border">Nenhum colaborador foi retornado pela fonte atual para este filtro.</p>}
              {rows.length > 0 && <div className="grid gap-4 lg:grid-cols-2">
                {rows.map((row) => {
                  const currentStatus = rowStatus(row);
                  return <article key={row.userId} className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-foreground">{rowName(row)}</h3><Badge variant="outline" className={statusClass(currentStatus)}>{statusLabel(currentStatus)}</Badge></div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{row.email}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{ROLE_LABELS[row.role] ?? row.role}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedUserId(row.userId)}>Ver desempenho completo</Button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                      <div><p className="text-xs text-muted-foreground">Atividades</p><p className="text-lg font-semibold text-foreground">{Number(row.calls || 0) + Number(row.meetings || 0)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Reuniões</p><p className="text-lg font-semibold text-foreground">{row.meetings}</p></div>
                      <div><p className="text-xs text-muted-foreground">Vendas</p><p className="text-lg font-semibold text-foreground">{row.sales}</p></div>
                      <div><p className="text-xs text-muted-foreground">Valor vendido</p><p className="text-lg font-semibold text-foreground">{currency(Number(row.sold || 0))}</p></div>
                    </div>
                    <div className="mt-4 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2"><span>Última atividade: {formatDate(optionalValue(row, ['lastActivityAt', 'last_activity_at', 'lastActivity']))}</span><span>Último acesso: {formatDate(optionalValue(row, ['lastSignInAt', 'last_sign_in_at', 'lastAccess']))}</span></div>
                  </article>;
                })}
              </div>}
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-foreground">Funcionários online</h2><p className="text-sm text-muted-foreground">Presença somente quando informada pela fonte atual.</p></div><Badge variant="secondary">{onlineRows.length}</Badge></div>
                {onlineRows.length ? <div className="space-y-3">{onlineRows.map((row) => <div key={row.userId} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div className="min-w-0"><p className="truncate font-medium text-foreground">{rowName(row)}</p><p className="truncate text-xs text-muted-foreground">{row.email}</p></div><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-label="Online" /></div>)}</div> : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Nenhuma presença online foi informada pela consulta atual.</p>}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold text-foreground">Ranking da equipe</h2><p className="text-sm text-muted-foreground">Comparação apenas entre os registros do período selecionado.</p></div><Select value={rankingMetric} onValueChange={(value: RankingMetric) => setRankingMetric(value)}><SelectTrigger className="w-full sm:w-52" aria-label="Métrica do ranking"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sales">Vendas fechadas</SelectItem><SelectItem value="meetings">Reuniões agendadas</SelectItem><SelectItem value="sold">Valor vendido</SelectItem></SelectContent></Select></div>
                <div className="space-y-3">{rankingRows.map((row, index) => { const value = Number(row[rankingMetric] || 0); return <div key={row.userId} className="flex items-center gap-3 rounded-lg border border-border p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-medium text-foreground">{rowName(row)}</p><p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[row.role] ?? row.role}</p></div><strong className="text-sm text-foreground">{rankingMetric === 'sold' ? currency(value) : value}</strong></div>; })}</div>
                {!rankingRows.length && <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Ainda não há registros para montar o ranking.</p>}
              </section>
            </div>
          </>
        )}
      </div>

      <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}>
        <DialogContent className="max-w-2xl">
          {selectedRow && <>
            <DialogHeader><DialogTitle>{rowName(selectedRow)}</DialogTitle><DialogDescription>{selectedRow.email} · {ROLE_LABELS[selectedRow.role] ?? selectedRow.role}</DialogDescription></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-medium text-foreground">{statusLabel(rowStatus(selectedRow))}</p></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Última atividade</p><p className="mt-1 font-medium text-foreground">{formatDate(optionalValue(selectedRow, ['lastActivityAt', 'last_activity_at', 'lastActivity']))}</p></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Data de cadastro</p><p className="mt-1 font-medium text-foreground">{formatDate(optionalValue(selectedRow, ['createdAt', 'created_at', 'invitedAt', 'invited_at']))}</p></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Último acesso</p><p className="mt-1 font-medium text-foreground">{formatDate(optionalValue(selectedRow, ['lastSignInAt', 'last_sign_in_at', 'lastAccess']))}</p></div>
            </div>
            <div><h3 className="mb-3 text-base font-semibold text-foreground">Produtividade no período</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Ligações</p><p className="text-xl font-semibold text-foreground">{selectedRow.calls}</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Reuniões</p><p className="text-xl font-semibold text-foreground">{selectedRow.meetings}</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Vendas</p><p className="text-xl font-semibold text-foreground">{selectedRow.sales}</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Valor vendido</p><p className="text-xl font-semibold text-foreground">{currency(Number(selectedRow.sold || 0))}</p></div></div></div>
            <div className="rounded-xl border border-dashed border-border p-4"><h3 className="font-semibold text-foreground">Histórico de atividades</h3><p className="mt-1 text-sm text-muted-foreground">O histórico detalhado, os registros afetados e os valores anteriores e novos não são retornados pela consulta de desempenho atual. Nenhum evento foi criado ou reconstruído nesta tela.</p></div>
          </>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
