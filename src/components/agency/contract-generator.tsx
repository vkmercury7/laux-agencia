import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Fields = { name: string; company: string; doc: string; service: string; monthly: string; start: string; due: string; term: string; cancel: string };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(f: Fields) {
  const v = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, esc(x.trim())])) as Fields;
  const c = (t: string, b: string) => `<h2>${t}</h2><p>${b}</p>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato - ${v.name}</title><style>@page{size:A4;margin:18mm}body{font-family:Georgia,serif;font-size:11.5pt;line-height:1.5;color:#111}h1{text-align:center;font-size:15pt}h2{font-size:11.5pt;margin:14px 0 4px}p{margin:0 0 6px;text-align:justify}.sig{display:flex;gap:40px;margin-top:50px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:10pt}.note{font-size:9pt;color:#555;margin-top:24px}</style></head><body>
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL</h1>
<p><b>CONTRATADA:</b> 68.119.994 LUCAS JESUS MATTOSO ALVES PAVAN CAPOTE, inscrita no CNPJ sob nº 68.119.994/0001-01, sob a marca LAUX AGÊNCIA.</p>
<p><b>CONTRATANTE:</b> ${v.name}${v.company ? `, empresa ${v.company}` : ""}, inscrito(a) no CPF/CNPJ sob nº ${v.doc}.</p>
${c("1. Objeto", `A CONTRATADA prestará ao CONTRATANTE os seguintes serviços: ${v.service}.`)}
${c("2. Responsabilidades das partes", "A CONTRATADA executará os serviços com diligência e técnica adequadas. O CONTRATANTE fornecerá informações, acessos, materiais e aprovações necessários em tempo hábil, respondendo pela veracidade do conteúdo fornecido.")}
${c("3. Mensalidade e pagamento", `Pelos serviços, o CONTRATANTE pagará ${v.monthly ? `R$ ${v.monthly} mensais` : "o valor acordado entre as partes"}${v.due ? `, com vencimento todo dia ${v.due}` : ""}. Início do contrato: ${v.start}.`)}
${c("4. Verba publicitária", "Os valores investidos em mídia paga (anúncios em plataformas como Meta, Google e outras) não estão incluídos na mensalidade e serão pagos diretamente pelo CONTRATANTE às plataformas.")}
${c("5. Prazo e cancelamento", `Prazo: ${v.term}. Cancelamento: ${v.cancel}`)}
${c("6. Ausência de garantia de resultados", "A CONTRATADA não garante resultados específicos de vendas, faturamento, alcance ou posicionamento, que dependem de fatores externos, como mercado, plataformas e atuação do próprio CONTRATANTE.")}
${c("7. Confidencialidade e proteção de dados", "As partes manterão sigilo sobre informações confidenciais a que tiverem acesso e tratarão dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD), apenas para a execução deste contrato.")}
${c("8. Assinatura eletrônica", "As partes reconhecem a validade da assinatura deste instrumento por meio eletrônico, nos termos da legislação vigente, inclusive a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.")}
<div class="sig"><div>LAUX AGÊNCIA<br>CNPJ 68.119.994/0001-01</div><div>${v.name}<br>CPF/CNPJ ${v.doc}</div></div>
<p class="note">Modelo para revisão. Recomenda-se conferência jurídica antes da assinatura.</p></body></html>`;
}

export function ContractGenerator({ initial }: { initial: Omit<Fields, "doc" | "term" | "cancel"> }) {
  const [f, setF] = useState<Fields | null>(null);
  if (!f) return <Button variant="outline" size="sm" onClick={() => setF({ ...initial, doc: "", term: "", cancel: "" })}><FileDown />Gerar contrato</Button>;
  const missing = (["name", "doc", "service", "start", "term", "cancel"] as const).filter((k) => !f[k].trim());
  const field = (k: keyof Fields, label: string, ph = "") => (
    <label className="lead-field">{label}<input value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html(f)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  return (
    <div className="client-extra">
      <strong>Conferir dados do contrato</strong>
      <div className="lead-followup-grid">
        {field("name", "Nome do cliente *")}{field("company", "Empresa")}{field("doc", "CPF/CNPJ *")}
        {field("service", "Serviço contratado *")}{field("monthly", "Mensalidade (R$)")}{field("start", "Data de início *")}
        {field("due", "Dia de vencimento")}{field("term", "Prazo *", "Ex.: 12 meses, renovável")}{field("cancel", "Condições de cancelamento *", "Ex.: aviso prévio de 30 dias")}
      </div>
      {missing.length > 0 && <p className="text-destructive">Preencha os campos obrigatórios (*).</p>}
      <p className="client-extra-empty">Abre a janela de impressão: escolha "Salvar como PDF". Modelo para revisão, sem validação jurídica.</p>
      <Button size="sm" variant="premium" disabled={missing.length > 0} onClick={print}><FileDown />Baixar PDF</Button>
      <Button size="sm" variant="ghost" onClick={() => setF(null)}>Fechar</Button>
    </div>
  );
}
