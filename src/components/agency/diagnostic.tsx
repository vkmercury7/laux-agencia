import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLead } from "@/lib/leads.functions";
import { ArrowLeft, ArrowRight, ArrowUpRight, Building2, Check, ClipboardList, Rocket, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContact } from "./contact";
import { buildDiagnosticMessage, maskPhone, isValidPhone } from "@/lib/agency-config";
import { trackEvent } from "@/lib/analytics";

const steps = [
  { icon: Building2, title: "Sobre a empresa" },
  { icon: Smartphone, title: "Presença digital" },
  { icon: Rocket, title: "Objetivos" },
  { icon: ClipboardList, title: "Contato" },
];

const segments = ["Restaurante", "Saúde e bem-estar", "Comércio", "Serviços", "Outro"];
const goalOptions = ["Conseguir mais clientes", "Receber mais mensagens no WhatsApp", "Melhorar a presença digital", "Divulgar produtos e serviços"];
const budgets = ["Até R$ 500", "R$ 500 a R$ 1.000", "R$ 1.000 a R$ 2.000", "R$ 2.000 a R$ 3.000", "Acima de R$ 3.000", "Ainda não sei"];

type Data = { name: string; company: string; segment: string; hasSite: string; usesInstagram: string; advertises: string; goals: string[]; phone: string; location: string; budget: string; consent: boolean };

const initial: Data = { name: "", company: "", segment: "", hasSite: "", usesInstagram: "", advertises: "", goals: [], phone: "", location: "", budget: "", consent: false };

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <fieldset className="wizard-field"><legend>{label}</legend><div className="choice-group">{options.map(o => <button type="button" key={o} aria-pressed={value === o} className={value === o ? "choice-btn selected" : "choice-btn"} onClick={() => onChange(o)}>{value === o && <Check size={14}/>}{o}</button>)}</div></fieldset>;
}

export function Diagnostic() {
  const open = useContact();
  const save = useServerFn(submitLead);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Data>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<Data>) => setData(prev => ({ ...prev, ...patch }));
  const toggleGoal = (goal: string) => set({ goals: data.goals.includes(goal) ? data.goals.filter(g => g !== goal) : [...data.goals, goal] });

  function next() {
    if (step === 1) {
      if (!data.name.trim() || !data.company.trim() || !data.segment) { setError("Preencha nome, empresa e segmento."); return; }
      trackEvent("start_diagnosis", {});
    }
    if (step === 2 && (!data.hasSite || !data.usesInstagram || !data.advertises)) { setError("Responda as três perguntas desta etapa."); return; }
    if (step === 3 && !data.goals.length) { setError("Selecione pelo menos um objetivo."); return; }
    if (step === 4) {
      if (!isValidPhone(data.phone)) { setError("Informe um WhatsApp válido com DDD."); return; }
      if (!data.location.trim() || !data.budget || !data.consent) { setError("Complete o contato, o orçamento e autorize o contato."); return; }
      setError("");
      setSaving(true);
      void save({ data: { ...data, name: data.name.trim(), company: data.company.trim(), location: data.location.trim(), consent: true } })
        .then(() => {
          setSaved(true);
          setStep(5);
          trackEvent("complete_diagnosis", { goals: data.goals.length });
          const msg = buildDiagnosticMessage(data);
          if (msg) open(msg, "diagnostico");
        })
        .catch(() => setError("Não foi possível registrar seu diagnóstico agora. Tente novamente em instantes."))
        .finally(() => setSaving(false));
      return;
    }
    setError("");
    setStep(s => Math.min(4, s + 1));
  }

  const message = buildDiagnosticMessage(data);

  return <section id="diagnostico" className="section section-tinted diagnostic-section"><div className="container">
    <div className="section-heading centered"><span className="eyebrow">DIAGNÓSTICO DIGITAL INTERATIVO</span><h2>Descubra o próximo passo para o crescimento digital da sua <em>empresa.</em></h2><p>Responda algumas perguntas e solicite uma análise inicial da sua presença digital.</p></div>
    <div className="wizard">
      {step < 5 && <div className="wizard-progress"><span className="wizard-bar" style={{ width: `${(step / 4) * 100}%` }}/><div className="wizard-steps">{steps.map((s, i) => <span key={s.title} className={step > i + 1 ? "done" : step === i + 1 ? "current" : ""}><s.icon size={15}/>{s.title}</span>)}</div></div>}
      {step < 5 && <div className="wizard-body" key={step}>
        {step === 1 && <div className="wizard-fields">
          <label>Nome completo<input value={data.name} onChange={e => set({ name: e.target.value })} autoComplete="name" placeholder="Como podemos te chamar?"/></label>
          <label>Nome da empresa<input value={data.company} onChange={e => set({ company: e.target.value })} autoComplete="organization" placeholder="Sua empresa"/></label>
          <label>Segmento da empresa<select value={data.segment} onChange={e => set({ segment: e.target.value })}><option value="" disabled>Selecione seu segmento</option>{segments.map(s => <option key={s}>{s}</option>)}</select></label>
        </div>}
        {step === 2 && <div className="wizard-fields">
          <Choice label="Possui site?" value={data.hasSite} options={["Sim", "Não", "Estou construindo"]} onChange={v => set({ hasSite: v })}/>
          <Choice label="Utiliza Instagram?" value={data.usesInstagram} options={["Sim", "Não"]} onChange={v => set({ usesInstagram: v })}/>
          <Choice label="Já anuncia no Google ou Meta?" value={data.advertises} options={["Sim, atualmente", "Já investi no passado", "Nunca investi"]} onChange={v => set({ advertises: v })}/>
        </div>}
        {step === 3 && <div className="wizard-fields"><fieldset className="wizard-field"><legend>Quais são seus objetivos? <small>(selecione todos que quiser)</small></legend><div className="choice-group">{goalOptions.map(g => <button type="button" key={g} aria-pressed={data.goals.includes(g)} className={data.goals.includes(g) ? "choice-btn selected" : "choice-btn"} onClick={() => toggleGoal(g)}>{data.goals.includes(g) && <Check size={14}/>}{g}</button>)}</div></fieldset></div>}
        {step === 4 && <div className="wizard-fields">
          <label>WhatsApp para contato<input type="tel" inputMode="numeric" value={data.phone} onChange={e => set({ phone: maskPhone(e.target.value) })} placeholder="(22) 99999-9999"/></label>
          <label>Cidade / estado<input value={data.location} onChange={e => set({ location: e.target.value })} placeholder="Ex.: Campos dos Goytacazes / RJ"/></label>
          <label>Orçamento mensal pretendido para anúncios<select value={data.budget} onChange={e => set({ budget: e.target.value })}><option value="" disabled>Selecione uma faixa</option>{budgets.map(b => <option key={b}>{b}</option>)}</select></label>
          <label className="consent"><input type="checkbox" checked={data.consent} onChange={e => set({ consent: e.target.checked })}/>Autorizo o contato comercial da LAUX AGÊNCIA por WhatsApp para receber a análise inicial.</label>
        </div>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <div className="wizard-nav">
          {step > 1 && <Button variant="ghost" onClick={() => { setError(""); setStep(s => s - 1); }}><ArrowLeft/>Voltar</Button>}
          <Button variant="premium" onClick={next}>{step === 4 ? "Revisar meu diagnóstico" : "Continuar"}<ArrowRight/></Button>
        </div>
      </div>}
      {step === 5 && <div className="wizard-done">
        <span className="done-icon"><Check size={26}/></span>
        <h3>Seu diagnóstico está pronto para ser solicitado!</h3>
        <p>Toque no botão abaixo: o WhatsApp abre com suas respostas organizadas. Você revisa e confirma o envio — nada é enviado automaticamente.</p>
        <Button variant="premium" size="lg" disabled={!message} onClick={() => message && open(message, "diagnostico")}>Enviar informações para a LAUX<ArrowUpRight/></Button>
        <p className="fine-print">A análise inicial é uma conversa para entender o momento da sua empresa — não uma análise automática concluída. O plano apresentado é R$ 490 no primeiro mês e R$ 390 por mês depois; a mídia é paga à plataforma separadamente.</p>
        <Button variant="link" onClick={() => { setStep(1); setData(initial); }}>Preencher novamente</Button>
      </div>}
    </div>
  </div></section>;
}
