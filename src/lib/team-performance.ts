export type TeamPerformanceRow = Record<string, unknown> & {
  userId: string;
  email: string;
  role: string;
  calls: number;
  meetings: number;
  sales: number;
  sold: number;
};

function firstValue(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function textValue(source: Record<string, unknown>, keys: string[], fallback = ''): string {
  const value = firstValue(source, keys);
  return value === undefined ? fallback : String(value);
}

function numberValue(source: Record<string, unknown>, keys: string[]): number {
  const value = Number(firstValue(source, keys) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Normaliza o contrato de desempenho recebido pelo frontend.
 * A origem dos dados continua sendo responsabilidade do server function;
 * esta camada apenas preserva linhas completas e aceita nomes equivalentes.
 */
export function normalizeTeamPerformanceRows(input: unknown): TeamPerformanceRow[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];

    const source = entry as Record<string, unknown>;
    const userId = textValue(source, ['userId', 'user_id', 'id']);
    const email = textValue(source, ['email', 'userEmail', 'user_email']);

    if (!userId || !email) return [];

    return [{
      ...source,
      userId,
      email,
      role: textValue(source, ['role', 'teamRole', 'team_role'], 'unknown'),
      calls: numberValue(source, ['calls', 'callCount', 'call_count']),
      meetings: numberValue(source, ['meetings', 'meetingCount', 'meeting_count']),
      sales: numberValue(source, ['sales', 'saleCount', 'sale_count']),
      sold: numberValue(source, ['sold', 'soldValue', 'sold_value', 'totalSold', 'total_sold']),
    }];
  });
}
