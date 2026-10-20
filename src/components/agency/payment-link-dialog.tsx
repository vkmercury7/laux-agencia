import { useState, type FormEvent } from 'react';
import { CalendarDays, CheckCircle2, CreditCard, Link2 } from 'lucide-react';
import { getAsaasIntegrationStatus } from '@/lib/asaas';
import type { AsaasBillingType } from '@/lib/asaas';
import type { SalesData } from '@/lib/sales-query';
import { currency, parseMoney, todaySP } from '@/lib/sales';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type PaymentMethod = 'pix' | 'cartao' | 'boleto';

type PaymentLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SalesData;
};

type FormValues = {
  customerId: string;
  payerName: string;
  payerDocument: string;
  description: string;
  amount: string;
  method: PaymentMethod;
  dueDate: string;
  saleId: string;
  installments: string;
  notes: string;
};

type PreparedSummary = {
  payerName: string;
  amount: number;
  dueDate: string;
  method: PaymentMethod;
  billingType: AsaasBillingType;
};

const billingTypeByMethod: Record<PaymentMethod, AsaasBillingType> = {
  pix: 'PIX',
  cartao: 'CREDIT_CARD',
  boleto: 'BOLETO',
};

const methodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  boleto: 'Boleto',
};

function createEmptyForm(): FormValues {
  return {
    customerId: 'none',
    payerName: '',
    payerDocument: '',
    description: '',
    amount: '',
    method: 'pix',
    dueDate: todaySP(),
    saleId: 'none',
    installments: '1',
    notes: '',
  };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function PaymentLinkDialog({ open, onOpenChange, data }: PaymentLinkDialogProps) {
  const [form, setForm] = useState<FormValues>(() => createEmptyForm());
  const [error, setError] = useState('');
  const [preparedSummary, setPreparedSummary] = useState<PreparedSummary | null>(null);
  const integrationStatus = getAsaasIntegrationStatus();
  const isCard = form.method === 'cartao';
  const leads = [...data.leads].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR'));

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(createEmptyForm());
      setError('');
      setPreparedSummary(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payerName = form.payerName.trim();
    const description = form.description.trim();
    const amount = parseMoney(form.amount);

    if (!payerName) {
      setError('Informe o nome do pagador.');
      return;
    }
    if (!description) {
      setError('Informe a descrição da cobrança.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Informe um valor de cobrança maior que zero.');
      return;
    }
    if (!form.dueDate) {
      setError('Informe o vencimento.');
      return;
    }
    if (isCard) {
      const installments = Number(form.installments);
      if (!Number.isInteger(installments) || installments <= 0) {
        setError('Informe uma quantidade válida de parcelas.');
        return;
      }
    }

    setPreparedSummary({
      payerName,
      amount,
      dueDate: form.dueDate,
      method: form.method,
      billingType: billingTypeByMethod[form.method],
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Link2 className='h-5 w-5 text-primary' />
            Gerar link de pagamento
          </DialogTitle>
          <DialogDescription>
            Prepare os dados da cobrança para uma futura integração segura com o Asaas. Nenhum link ou cobrança real será criado nesta etapa.
          </DialogDescription>
        </DialogHeader>

        {preparedSummary ? (
          <div className='space-y-4'>
            <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-4'>
              <div className='flex items-start gap-3'>
                <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' />
                <div className='space-y-2'>
                  <p className='font-medium text-foreground'>
                    Cobrança preparada. A geração do link estará disponível após a integração com o Asaas.
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Nenhum registro foi salvo, nenhum QR Code foi criado e nenhum pagamento foi confirmado.
                  </p>
                </div>
              </div>
            </div>

            <div className='grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3'>
              <div>
                <p className='text-xs text-muted-foreground'>Pagador</p>
                <p className='mt-1 text-sm font-medium'>{preparedSummary.payerName}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Valor</p>
                <p className='mt-1 text-sm font-medium'>{currency(preparedSummary.amount)}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Vencimento</p>
                <p className='mt-1 text-sm font-medium'>{formatDate(preparedSummary.dueDate)}</p>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
              <Badge variant='outline'>{methodLabels[preparedSummary.method]}</Badge>
              <span>Formato futuro: {preparedSummary.billingType}</span>
              <span>{integrationStatus.reason}</span>
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
              <Button type='button' onClick={() => setPreparedSummary(null)}>
                Preparar outra
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className='space-y-5' onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <Label htmlFor='payment-customer'>Cliente existente <span className='text-muted-foreground'>(opcional)</span></Label>
              <Select
                value={form.customerId}
                onValueChange={(value) => {
                  const lead = data.leads.find((item) => item.id === value);
                  setForm((current) => ({
                    ...current,
                    customerId: value,
                    payerName: lead?.name ? String(lead.name) : current.payerName,
                  }));
                  setError('');
                }}
              >
                <SelectTrigger id='payment-customer'>
                  <SelectValue placeholder='Selecione um cliente' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Sem cliente existente</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {String(lead.name || 'Cliente sem nome')}{lead.company ? ` · ${lead.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='payment-payer-name'>Nome do pagador</Label>
                <Input id='payment-payer-name' value={form.payerName} onChange={(event) => update('payerName', event.target.value)} placeholder='Nome completo ou razão social' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='payment-payer-document'>CPF/CNPJ <span className='text-muted-foreground'>(opcional)</span></Label>
                <Input id='payment-payer-document' value={form.payerDocument} onChange={(event) => update('payerDocument', event.target.value)} placeholder='000.000.000-00' />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='payment-description'>Descrição da cobrança</Label>
              <Input id='payment-description' value={form.description} onChange={(event) => update('description', event.target.value)} placeholder='Ex.: Criação de site institucional' />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='payment-amount'>Valor da cobrança (R$)</Label>
                <Input id='payment-amount' inputMode='decimal' value={form.amount} onChange={(event) => update('amount', event.target.value)} placeholder='0,00' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='payment-due-date'>Vencimento</Label>
                <div className='relative'>
                  <CalendarDays className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input id='payment-due-date' className='pl-9' type='date' value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
                </div>
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='payment-method'>Método de pagamento</Label>
                <Select
                  value={form.method}
                  onValueChange={(value) => {
                    if (value === 'pix' || value === 'cartao' || value === 'boleto') {
                      update('method', value);
                    }
                  }}
                >
                  <SelectTrigger id='payment-method'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pix'>Pix</SelectItem>
                    <SelectItem value='cartao'>Cartão</SelectItem>
                    <SelectItem value='boleto'>Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCard && (
                <div className='space-y-2'>
                  <Label htmlFor='payment-installments'>Número de parcelas</Label>
                  <div className='relative'>
                    <CreditCard className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input id='payment-installments' className='pl-9' type='number' min='1' step='1' value={form.installments} onChange={(event) => update('installments', event.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='payment-sale'>Venda vinculada <span className='text-muted-foreground'>(opcional)</span></Label>
              <Select value={form.saleId} onValueChange={(value) => update('saleId', value)}>
                <SelectTrigger id='payment-sale'>
                  <SelectValue placeholder='Nenhuma venda vinculada' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Nenhuma venda vinculada</SelectItem>
                  {data.sales.map((sale) => {
                    const lead = data.leads.find((item) => item.id === sale.lead_id);
                    return (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.service} · {String(lead?.name || 'Cliente não informado')} · {sale.closed_on}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='payment-notes'>Observações internas <span className='text-muted-foreground'>(opcional)</span></Label>
              <Textarea id='payment-notes' value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder='Informações internas para a equipe financeira' rows={3} />
            </div>

            {error && <p className='text-sm text-destructive' role='alert'>{error}</p>}

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type='submit'>Preparar cobrança</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
