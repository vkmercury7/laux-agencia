export const ACTIVITY_LABELS: Record<string, string> = {
  lead_created: 'Novo formulário', lead_assigned: 'Atribuição de lead', meeting_created: 'Reunião agendada', meeting_cancelled: 'Reunião cancelada', meeting_rescheduled: 'Reunião remarcada', sale_created: 'Venda registrada', contract_created: 'Contrato criado', contract_cancelled: 'Contrato cancelado', installment_paid: 'Mensalidade paga',
};
export const activityTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));