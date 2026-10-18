import { leadStage } from "./funnel";

export type ClientSituation =
  | "somente_formulario"
  | "em_contato"
  | "reuniao_marcada"
  | "proposta_enviada"
  | "cliente_ativo"
  | "cliente_inativo"
  | "contrato_nao_informado"
  | "perdido";

export const SITUATION_LABEL: Record<ClientSituation, string> = {
  somente_formulario: "Somente formulário",
  em_contato: "Em contato",
  reuniao_marcada: "Reunião marcada",
  proposta_enviada: "Proposta enviada",
  cliente_ativo: "Cliente ativo",
  cliente_inativo: "Cliente inativo",
  contrato_nao_informado: "Contrato não informado",
  perdido: "Perdido",
};

export const SITUATION_FILTERS: { key: ClientSituation | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "somente_formulario", label: "Somente formulário" },
  { key: "em_contato", label: "Em contato" },
  { key: "reuniao_marcada", label: "Reunião marcada" },
  { key: "proposta_enviada", label: "Proposta enviada" },
  { key: "cliente_ativo", label: "Clientes ativos" },
  { key: "cliente_inativo", label: "Clientes inativos" },
  { key: "perdido", label: "Perdidos" },
];

export type ClientSale = {
  status: string;
  contract_type: string;
  contract_status: string;
  starts_on: string;
};

/**
 * Situação comercial de um contato, derivada da etapa do funil e das vendas reais.
 * Nunca inventa vigência: venda fechada sem informação de contrato vira "Contrato não informado".
 */
export type ClientContract = { status: string; monthly_value: number | null; starts_on: string };

export function clientSituation(stage: string | null | undefined, sales: ClientSale[], today: string, contracts: ClientContract[] = []): ClientSituation {
  const funnel = leadStage(stage);
  if (funnel === "perdido") return "perdido";

  // Contratos cadastrados mandam na classificação: ativo recorrente → ativo;
  // todos cancelados → inativo; sem contrato → mantém a classificação comercial.
  if (contracts.length > 0) {
    const ativo = contracts.some((c) => c.status === "ativo" && (c.monthly_value ?? 0) > 0 && c.starts_on <= today);
    if (ativo) return "cliente_ativo";
    if (contracts.every((c) => c.status === "cancelado")) return "cliente_inativo";
    return "contrato_nao_informado";
  }

  const validas = sales.filter((s) => s.status === "valida");
  const ativa = validas.some(
    (s) => s.contract_type === "recorrente" && s.contract_status === "ativo" && s.starts_on <= today,
  );
  if (ativa) return "cliente_ativo";

  if (sales.length > 0) {
    const todasEncerradas = sales.every((s) => s.status === "cancelada" || s.contract_status === "encerrado");
    if (todasEncerradas) return "cliente_inativo";
    return "contrato_nao_informado";
  }
  if (funnel === "fechado") return "contrato_nao_informado";
  if (funnel === "proposta_enviada") return "proposta_enviada";
  if (funnel === "reuniao_marcada") return "reuniao_marcada";
  if (funnel === "em_contato") return "em_contato";
  return "somente_formulario";
}
