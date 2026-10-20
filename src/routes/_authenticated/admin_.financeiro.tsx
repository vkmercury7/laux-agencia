import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileText,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { AdminHeader } from '@/components/agency/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { salesQuery } from '@/lib/sales-query';
import { todaySP } from '@/lib/sales';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value: unknown): string {
  const date = textValue(value);
  if (!date) return '—';
  const [year, month, day] = date.slice(0, 10).split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function isBetween(date: string, from: string, to: string): boolean {
  return Boolean(date) && date >= from && date <= to;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    valida: 'Válida',
    cancelada: 'Cancelada',
    pago: 'Pago',
    pendente: 'Pendente',
    cancelado: 'Cancelado',
    ativo: 'Ativo',
    encerrado: 'Encerrado',
  };
  return labels[status] ?? (status || '—');
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'cancelada' || status === 'cancelado') return 'destructive';
  if (status === 'pago' || status === 'valida' || status === 'ativo') return 'default';
  return 'secondary';
}

function csvValue(value: unknown): string {
  return `"${textValue(value).replaceAll('"', '""')}"`;
}

export const Route = createFileRoute('/_authenticated/admin_/financeiro')({
  validateSearch: (search: Record<string, unknown>) => ({
    period: String(search.period) === 'all' ? 'all' : 'month',
    q: typeof search.q === 'string' ? search.q : '',
    status: ['all', 'valida', 'cancelada'].includes(String(search.status))
      ? String(search.status)
      : 'all',
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(salesQuery);
  },
  head: () => ({
    meta: [
      { title: 'Central financeira | LAUX AGÊNCIA' },
      {
        name: 'description',
        content: 'Acompanhamento financeiro baseado nas vendas, recebimentos e contratos do CRM LAUX.',
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardContent className="p-6">
          <p className="text-sm text-destructive" role="alert">
            {error instanceof Error ? error.message : 'Não foi possível carregar a central financeira.'}
          </p>
        </CardContent>
      </Card>
    </main>
  ),
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-muted-foreground">Central financeira não encontrada.</p>
    </main>
  ),
  component: Financeiro,
});

function Financeiro() {
  const { data } = useSuspenseQuery(salesQuery);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const today = todaySP();
  const monthStart = `${today.slice(0, 7)}-01`;
  const sales = rows(data.sales);
  const payments = rows(data.payments);
  const installments = rows(data.installments);
  const leads = rows(data.leads);
  const leadMap = new Map(leads.map((lead) => [textValue(lead.id), lead]));
  const paymentBySale = new Map<string, number>();

  for (const payment of payments) {
    if (textValue(payment.status) !== 'pago') continue;
    const saleId = textValue(payment.sale_id);
    paymentBySale.set(saleId, (paymentBySale.get(saleId) ?? 0) + numberValue(payment.amount));
  }

  const periodFrom = search.period === 'month' ? monthStart : '';
  const periodLabel = search.period === 'month' ? 'Este mês' : 'Todo o período';
  const salesInPeriod = sales.filter((sale) => {
    const closedOn = textValue(sale.closed_on);
    const matchesPeriod = search.period === 'all' || isBetween(closedOn, periodFrom, today);
    const matchesStatus = search.status === 'all' || textValue(sale.status) === search.status;
    const lead = leadMap.get(textValue(sale.lead_id));
    const haystack = [
      lead?.name,
      lead?.company,
      sale.service,
      sale.seller_email,
      sale.id,
    ]
      .map(textValue)
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    return matchesPeriod && matchesStatus && haystack.includes(search.q.trim().toLocaleLowerCase('pt-BR'));
  });

  const validSales = salesInPeriod.filter((sale) => textValue(sale.status) === 'valida');
  const soldValue = validSales.reduce((total, sale) => total + numberValue(sale.initial_value), 0);
  const receivedValue = data.isAdmin
    ? validSales.reduce((total, sale) => total + (paymentBySale.get(textValue(sale.id)) ?? 0), 0)
    : null;
  const pendingValue = receivedValue === null ? null : Math.max(soldValue - receivedValue, 0);
  const recurringValue = validSales.reduce((total, sale) => total + numberValue(sale.monthly_value), 0);
  const overdueInstallments = installments.filter(
    (installment) =>
      textValue(installment.status) === 'pendente' &&
      textValue(installment.due_date).slice(0, 10) < today,
  );
  const nextInstallments = installments
    .filter((installment) => textValue(installment.status) === 'pendente')
    .sort((a, b) => textValue(a.due_date).localeCompare(textValue(b.due_date)))
    .slice(0, 5);

  function exportCsv() {
    const header = ['Cliente', 'Empresa', 'Serviço', 'Vendedor', 'Data da venda', 'Valor', 'Recebido', 'Status'];
    const body = salesInPeriod.map((sale) => {
      const lead = leadMap.get(textValue(sale.lead_id));
      return [
        lead?.name,
        lead?.company,
        sale.service,
        sale.seller_email,
        sale.closed_on,
        numberValue(sale.initial_value).toFixed(2),
        data.isAdmin ? (paymentBySale.get(textValue(sale.id)) ?? 0).toFixed(2) : 'restrito',
        statusLabel(textValue(sale.status)),
      ]
        .map(csvValue)
        .join(';');
    });
    const blob = new Blob([`\uFEFF${[header.map(csvValue).join(';'), ...body].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-financeiro-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminHeader
          title="Central financeira"
          subtitle="Acompanhe vendas, recebimentos e mensalidades com base nos registros existentes."
        />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link to="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao dashboard
            </Link>
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <Card className="mb-6 border-border/70 bg-card/80">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
            <label className="flex min-w-48 flex-1 flex-col gap-2 text-sm font-medium">
              Buscar cliente, serviço ou vendedor
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search.q}
                  placeholder="Digite para buscar"
                  onChange={(event) => void navigate({ search: { ...search, q: event.target.value } })}
                />
              </div>
            </label>
            <label className="flex min-w-44 flex-col gap-2 text-sm font-medium">
              Período
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={search.period}
                onChange={(event) => void navigate({ search: { ...search, period: event.target.value } })}
              >
                <option value="month">Este mês</option>
                <option value="all">Todo o período</option>
              </select>
            </label>
            <label className="flex min-w-44 flex-col gap-2 text-sm font-medium">
              Status da venda
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={search.status}
                onChange={(event) => void navigate({ search: { ...search, status: event.target.value } })}
              >
                <option value="all">Todos</option>
                <option value="valida">Válidas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </label>
          </CardContent>
        </Card>

        {!data.isAdmin && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p>
                Os valores de recebimentos e mensalidades são restritos a administradores. As vendas exibidas respeitam as permissões do usuário autenticado.
              </p>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo financeiro">
          <Card>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Vendas válidas</p>
                <p className="mt-2 text-2xl font-bold">{validSales.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Valor vendido</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(soldValue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Contratado no período</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="mt-2 text-2xl font-bold">{receivedValue === null ? 'Restrito' : formatCurrency(receivedValue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Confirmações registradas</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Saldo pendente</p>
                <p className="mt-2 text-2xl font-bold">{pendingValue === null ? 'Restrito' : formatCurrency(pendingValue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Vendas menos recebimentos</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600">
                <CalendarClock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita recorrente prevista</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(recurringValue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Mensalidades vinculadas às vendas válidas filtradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mensalidades vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.isAdmin ? overdueInstallments.length : 'Restrito'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Registros pendentes com vencimento anterior a hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preparação de pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum provedor externo é acionado nesta etapa. QR Codes e links só devem aparecer quando retornados por uma integração real.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Vendas e recebimentos</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{salesInPeriod.length} registro(s) no filtro atual</p>
                </div>
                <Badge variant="outline">Dados reais do CRM</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Cliente</th>
                      <th className="px-5 py-3 font-medium">Serviço</th>
                      <th className="px-5 py-3 font-medium">Venda</th>
                      <th className="px-5 py-3 font-medium">Recebido</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {salesInPeriod.slice(0, 25).map((sale) => {
                      const lead = leadMap.get(textValue(sale.lead_id));
                      const saleReceived = paymentBySale.get(textValue(sale.id)) ?? 0;
                      const status = textValue(sale.status);
                      return (
                        <tr key={textValue(sale.id)} className="transition-colors hover:bg-muted/20">
                          <td className="px-5 py-4">
                            <div className="font-medium">{textValue(lead?.name) || 'Cliente não informado'}</div>
                            <div className="text-xs text-muted-foreground">{textValue(lead?.company) || 'Sem empresa'}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div>{textValue(sale.service) || '—'}</div>
                            <div className="text-xs text-muted-foreground">{textValue(sale.seller_email) || 'Vendedor não informado'}</div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="font-medium">{formatCurrency(numberValue(sale.initial_value))}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(sale.closed_on)}</div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-medium">
                            {data.isAdmin ? formatCurrency(saleReceived) : 'Restrito'}
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!salesInPeriod.length && (
                <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Nenhuma venda encontrada para os filtros selecionados.
                </div>
              )}
              {salesInPeriod.length > 25 && (
                <p className="border-t px-5 py-3 text-xs text-muted-foreground">Mostrando os 25 registros mais relevantes do filtro atual. Use o CSV para exportar todos.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos vencimentos</CardTitle>
              <p className="text-sm text-muted-foreground">Mensalidades pendentes já cadastradas</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.isAdmin && <p className="text-sm text-muted-foreground">Informação disponível somente para administradores.</p>}
              {data.isAdmin && !nextInstallments.length && <p className="text-sm text-muted-foreground">Nenhum vencimento pendente encontrado.</p>}
              {data.isAdmin && nextInstallments.map((installment) => (
                <div key={textValue(installment.id)} className="rounded-lg border border-border/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(numberValue(installment.amount_due))}</p>
                      <p className="text-xs text-muted-foreground">Vencimento: {formatDate(installment.due_date)}</p>
                    </div>
                    <Badge variant={textValue(installment.due_date).slice(0, 10) < today ? 'destructive' : 'secondary'}>
                      {textValue(installment.due_date).slice(0, 10) < today ? 'Vencida' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
