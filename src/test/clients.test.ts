import { describe, expect, it } from "vitest";
import { clientSituation } from "@/lib/clients";

const TODAY = "2026-10-18";
const sale = (over: Partial<{ status: string; contract_type: string; contract_status: string; starts_on: string }>) => ({
  status: "valida",
  contract_type: "recorrente",
  contract_status: "ativo",
  starts_on: "2026-10-01",
  ...over,
});

describe("clientSituation", () => {
  it("lead novo sem vendas é somente formulário", () => {
    expect(clientSituation("novo_lead", [], TODAY)).toBe("somente_formulario");
    expect(clientSituation(null, [], TODAY)).toBe("somente_formulario");
  });

  it("reflete as etapas do funil", () => {
    expect(clientSituation("em_contato", [], TODAY)).toBe("em_contato");
    expect(clientSituation("reuniao_marcada", [], TODAY)).toBe("reuniao_marcada");
    expect(clientSituation("proposta_enviada", [], TODAY)).toBe("proposta_enviada");
  });

  it("perdido vence qualquer venda", () => {
    expect(clientSituation("perdido", [sale({})], TODAY)).toBe("perdido");
  });

  it("cliente ativo exige contrato recorrente vigente e iniciado", () => {
    expect(clientSituation("fechado", [sale({})], TODAY)).toBe("cliente_ativo");
    expect(clientSituation("fechado", [sale({ starts_on: "2026-11-01" })], TODAY)).toBe("contrato_nao_informado");
    expect(clientSituation("fechado", [sale({ contract_type: "unico" })], TODAY)).toBe("contrato_nao_informado");
  });

  it("contratos encerrados ou cancelados viram cliente inativo", () => {
    expect(clientSituation("fechado", [sale({ contract_status: "encerrado" })], TODAY)).toBe("cliente_inativo");
    expect(clientSituation("fechado", [sale({ status: "cancelada" })], TODAY)).toBe("cliente_inativo");
  });

  it("venda ativa vence encerrada antiga", () => {
    expect(clientSituation("fechado", [sale({ contract_status: "encerrado" }), sale({})], TODAY)).toBe("cliente_ativo");
  });

  it("fechado sem venda registrada é contrato não informado", () => {
    expect(clientSituation("fechado", [], TODAY)).toBe("contrato_nao_informado");
  });
});
