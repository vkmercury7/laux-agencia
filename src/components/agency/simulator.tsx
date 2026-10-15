import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Info, MousePointer2, Wallet } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ContactButton } from "./contact";
import { agencyConfig, brl, simulateInvestment } from "@/lib/agency-config";
import { trackEvent } from "@/lib/analytics";

/** Smoothly animates a number toward its new value; respects reduced motion. */
function useCountUp(value: number) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
    const start = performance.now();
    const duration = 450;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

export function Simulator() {
  const [media, setMedia] = useState(800);
  const [cpc, setCpc] = useState(agencyConfig.initialCpc.toFixed(2));
  const [first, setFirst] = useState(true);
  const result = simulateInvestment(media, Number(cpc), first);
  const clicks = useCountUp(result?.clicks ?? 0);
  const parts = result ? [
    { label: "Anúncios", value: media, className: "dist-ads" },
    { label: "Gestão", value: result.management, className: "dist-management" },
    ...(result.website ? [{ label: "Site", value: result.website, className: "dist-site" }] : []),
  ] : [];

  return <section id="simulador" className="section section-tinted"><div className="container"><div className="section-heading centered"><span className="eyebrow">CALCULADORA DE INVESTIMENTO TOTAL</span><h2>Descubra o potencial do seu<br className="desktop-break"/> investimento em <em>anúncios.</em></h2><p>Explore os números e encontre um ponto de partida para sua estratégia.</p></div>
    <div className="simulator-layout"><div className="simulator-inputs"><span className="label-with-icon"><Wallet size={18}/>Seu investimento mensal em mídia</span><strong className="budget-value" data-testid="media-budget">{brl(media)}<span>/mês</span></strong>
      <Slider aria-label="Investimento mensal em mídia" min={agencyConfig.mediaMin} max={agencyConfig.mediaMax} step={agencyConfig.mediaStep} value={[media]} onValueChange={values => { const v = values[0] ?? agencyConfig.mediaMin; setMedia(v); trackEvent("select_ad_budget", { budget: v }); }}/><div className="slider-limits"><span>{brl(agencyConfig.mediaMin)}</span><span>{brl(agencyConfig.mediaMax)}</span></div>
      <div className="cpc-input"><label htmlFor="cpc">CPC hipotético <span>Custo por clique</span></label><div><span>R$</span><input id="cpc" type="number" min="0.01" step="0.10" value={cpc} onChange={e => setCpc(e.target.value)}/></div></div>
      <div className="segmented month-toggle"><Button variant={first ? "secondary" : "ghost"} aria-pressed={first} onClick={() => setFirst(true)}>Primeiro mês</Button><Button variant={!first ? "secondary" : "ghost"} aria-pressed={!first} onClick={() => setFirst(false)}>Meses seguintes</Button></div>
      <p className="fine-print">O orçamento de mídia é pago à plataforma de anúncios, separadamente da gestão.</p>
    </div><div className="simulator-output"><div className="clicks-heading"><span><MousePointer2 size={18}/>Cliques estimados</span><span className="illustrative-tag">HIPÓTESE</span></div><strong className="clicks-value" data-testid="estimated-clicks">{result ? clicks.toLocaleString("pt-BR") : "—"}<ArrowUpRight/></strong>
      <div className="simulator-bars" aria-hidden="true">{Array.from({length:20}, (_, i) => <span key={i} style={{height:`${18 + (i / 19) * Math.min(80, media / 35)}%`}}/>)}</div>
      <div className="cost-breakdown"><div><span>Investimento em anúncios</span><strong>{brl(media)}</strong></div><div><span>Gestão mensal LAUX</span><strong>{brl(agencyConfig.managementFee)}</strong></div>{first && <div><span>Criação inicial do site · única</span><strong>{brl(agencyConfig.initialWebsiteFee)}</strong></div>}<div className="total-row"><span>Total estimado</span><strong data-testid="investment-total">{result ? brl(result.total) : "—"}</strong></div></div>
      {result && <div className="distribution-chart" aria-hidden="true"><div className="distribution-bar">{parts.map(p => <span key={p.label} className={p.className} style={{ width: `${(p.value / result.total) * 100}%` }}/>)}</div><div className="distribution-legend">{parts.map(p => <span key={p.label}><i className={p.className}/>{p.label} · {brl(p.value)}</span>)}</div></div>}
      {!result && <p role="alert" className="text-destructive">Informe um CPC maior que zero.</p>}
      <ContactButton className="w-full" source="simulador" message={`Olá! Quero começar com um investimento em mídia de ${brl(media)} por mês e conhecer a gestão da LAUX AGÊNCIA.`}>Quero começar com esse investimento</ContactButton>
    </div></div><p className="simulation-warning"><Info size={16}/>Simulação meramente ilustrativa. O custo por clique e o desempenho real variam conforme segmento, concorrência, plataforma e campanha. Cliques não representam vendas garantidas.</p>
  </div></section>;
}
