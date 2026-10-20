export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export type AsaasChargeDraft = {
  customerId: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
};

export type AsaasChargePayload = {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
};

export type AsaasRequestPlan = {
  method: 'POST';
  path: '/v3/payments';
  body: AsaasChargePayload;
};

export type AsaasIntegrationStatus = {
  enabled: false;
  apiCallsEnabled: false;
  requiresServerCredential: true;
  reason: string;
};

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} é obrigatório.`);
  return normalized;
}

function moneyValue(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('O valor da cobrança deve ser maior que zero.');
  }
  return Math.round(value * 100) / 100;
}

function dateValue(value: string): string {
  const normalized = requiredText(value, 'A data de vencimento');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('A data de vencimento deve usar o formato AAAA-MM-DD.');
  }
  return normalized;
}

function positiveInteger(value: number | undefined, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} deve ser um número inteiro positivo.`);
  }
  return value;
}

/**
 * Monta o corpo compatível com a cobrança do Asaas sem fazer nenhuma chamada externa.
 * O token deve permanecer em uma função server-side quando a integração for ativada.
 */
export function buildAsaasChargePayload(draft: AsaasChargeDraft): AsaasChargePayload {
  const payload: AsaasChargePayload = {
    customer: requiredText(draft.customerId, 'O cliente'),
    billingType: draft.billingType,
    value: moneyValue(draft.value),
    dueDate: dateValue(draft.dueDate),
  };

  if (draft.description?.trim()) payload.description = draft.description.trim();
  if (draft.externalReference?.trim()) payload.externalReference = draft.externalReference.trim();

  const installmentCount = positiveInteger(draft.installmentCount, 'A quantidade de parcelas');
  const installmentValue = draft.installmentValue === undefined
    ? undefined
    : moneyValue(draft.installmentValue);

  if (installmentCount !== undefined) payload.installmentCount = installmentCount;
  if (installmentValue !== undefined) payload.installmentValue = installmentValue;

  return payload;
}

/**
 * Retorna um plano explícito para futura execução server-side, sem executar fetch.
 */
export function prepareAsaasChargeRequest(draft: AsaasChargeDraft): AsaasRequestPlan {
  return {
    method: 'POST',
    path: '/v3/payments',
    body: buildAsaasChargePayload(draft),
  };
}

export function getAsaasIntegrationStatus(): AsaasIntegrationStatus {
  return {
    enabled: false,
    apiCallsEnabled: false,
    requiresServerCredential: true,
    reason: 'A integração externa ainda não foi ativada e nenhum pagamento é confirmado por este módulo.',
  };
}
