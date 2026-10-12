import { useState } from "react";
import { ArrowUpRight, Info, MousePointer2, Wallet } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ContactButton } from "./contact";
import { agencyConfig, brl, simulateInvestment } from "@/lib/agency-config";

export function Simulator() {
  const [media, setMedia] = useState(800);
  const [cpc, setCpc] = useState("2.50");
  const [first, setFirst] = useState(true);
  const result = simulateInvestment(media, Number(cpc), first);
  return <section id="simulador" className="section section-tinted"><div className="container"><div className="section-heading centered"><span className="eyebrow">MENOS ACHISMO. MAIS CLAREZA.</span><h2>Descubra o potencial do seu<br className="desktop-break"/> investimento em <em>anúncios.</em></h2><p>Explore os números e encontre um ponto de partida para sua estratégia.</p></div>
    <div className="simulator-layout"><div className="simulator-inputs"><span className="label-with-icon"><Wallet size={18}/>Seu investimento mensal em mídia</span><strong className="budget-value" data-testid="media-budget">{brl(media)}<span>/mês</span></strong>
      <Slider aria-label="Investimento mensal em mídia" min={agencyConfig.mediaMin} max={agencyConfig.mediaMax} step={agencyConfig.mediaStep} value={[media]} onValueChange={values => setMedia(values[0] ?? agencyConfig.mediaMin)}/><div className="slider-limits"><span>R$ 300</span><span>R$ 3.000</span></div>
      <div className="cpc-input"><label htmlFor="cpc">CPC hipotético <span>Custo por clique</span></label><div><span>R$</span><input id="cpc" type="number" min="0.01" step="0.10" value={cpc} onChange={e => setCpc(e.target.value)}/></div></div>
      <div className="segmented month-toggle"><Button variant={first ? "secondary" : "ghost"} aria-pressed={first} onClick={() => setFirst(true)}>Primeiro mês</Button><Button variant={!first ? "secondary" : "ghost"} aria-pressed={!first} onClick={() => setFirst(false)}>Meses seguintes</Button></div>
      <p className="fine-print">O orçamento de mídia é pago à plataforma de anúncios, separadamente da gestão.</p>
    </div><div className="simulator-output"><div className="clicks-heading"><span><MousePointer2 size={18}/>Cliques estimados</span><span className="illustrative-tag">HIPÓTESE</span></div><strong className="clicks-value" data-testid="estimated-clicks">{result ? result.clicks.toLocaleString("pt-BR") : "—"}<ArrowUpRight/></strong>
      <div className="simulator-bars" aria-hidden="true">{Array.from({length:20}, (_, i) => <span key={i} style={{height:`${18 + (i / 19) * Math.min(80, media / 35)}%`}}/>)}</div>
      <div className="cost-breakdown"><div><span>Investimento em anúncios</span><strong>{brl(media)}</strong></div><div><span>Gestão mensal LAUX</span><strong>R$ 390</strong></div>{first && <div><span>Criação inicial do site · única</span><strong>R$ 100</strong></div>}<div className="total-row"><span>Total estimado</span><strong data-testid="investment-total">{result ? brl(result.total) : "—"}</strong></div></div>
      {!result && <p role="alert" className="text-destructive">Informe um CPC maior que zero.</p>}
      <ContactButton className="w-full" message={`Olá! Simulei um orçamento de mídia de ${brl(media)} e quero conhecer a gestão da LAUX AGÊNCIA.`}>Quero planejar meus anúncios</ContactButton>
    </div></div><p className="simulation-warning"><Info size={16}/>Simulação meramente ilustrativa. O custo por clique e o desempenho real variam conforme segmento, concorrência, plataforma e campanha. Cliques não representam vendas garantidas.</p>
  </div></section>;
}