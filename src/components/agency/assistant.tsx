import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContact } from "./contact";
import { trackEvent } from "@/lib/analytics";
import lauxLogo from "@/assets/laux-logo.png.asset.json";

type Msg = { from: "laux" | "user"; text: string };

const quickOptions = [
  "Quanto custa?",
  "O site está incluído?",
  "Como funciona o tráfego pago?",
  "Preciso pagar os anúncios?",
  "Quero contratar.",
  "Falar com um especialista.",
];

const answers: Array<{ match: RegExp; reply: string }> = [
  { match: /custa|preço|preco|valor|quanto/i, reply: "O Plano Digital custa R$ 490 no primeiro mês — R$ 390 de gestão de tráfego + R$ 100 únicos pela criação do site — e R$ 390/mês a partir do segundo. O investimento em anúncios é pago separadamente, direto à plataforma." },
  { match: /site.*inclu|inclu.*site/i, reply: "Sim. A criação inicial de um site profissional está incluída no primeiro mês, pela cobrança única de R$ 100. O escopo completo é definido na proposta." },
  { match: /tráfego|trafego|anúncio|anuncio|ads|google|meta/i, reply: "Planejamos, configuramos e otimizamos campanhas em plataformas como Google Ads e Meta Ads, com acompanhamento de indicadores e relatório mensal." },
  { match: /pagar.*anúncio|pagar.*anuncio|pago.*anúncio|orçamento|orcamento/i, reply: "Sim. O orçamento de anúncios não está incluído na mensalidade e é pago separadamente pelo cliente, direto à plataforma de anúncios." },
  { match: /contrat|assinar|fechar|começar|comecar/i, reply: "Ótima decisão! Toque em “Continuar pelo WhatsApp” abaixo e a equipe vai te ajudar com a contratação do Plano Digital." },
  { match: /especialista|humano|pessoa|equipe|falar/i, reply: "Claro! A equipe LAUX pode te atender agora mesmo pelo WhatsApp. Toque em “Continuar pelo WhatsApp” abaixo." },
  { match: /horário|horario|atendimento|tempo|prazo/i, reply: "O atendimento é realizado via WhatsApp. Horários, prazos e condições são confirmados na conversa com a equipe." },
  { match: /simulador|calculadora|clique|cpc/i, reply: "O simulador do site mostra uma estimativa ilustrativa de cliques e do investimento total. É um ponto de partida — os resultados reais variam conforme o segmento e a campanha." },
];

const fallback = "Essa pergunta merece uma resposta da equipe! Toque em “Continuar pelo WhatsApp” abaixo e converse direto com a LAUX AGÊNCIA.";

function replyTo(text: string): string {
  // Future AI integration: replace this lookup with a call to a configured assistant backend.
  return answers.find(a => a.match.test(text))?.reply ?? fallback;
}

export function LauxAssistant() {
  const open = useContact();
  const [openPanel, setOpenPanel] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ from: "laux", text: "Olá! Sou o assistente virtual da LAUX AGÊNCIA. Posso ajudar você a conhecer nossos serviços." }]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, openPanel]);

  function ask(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setMessages(prev => [...prev, { from: "user", text: clean }, { from: "laux", text: replyTo(clean) }]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
    setDraft("");
  }

  return <>
    <Button className="assistant-launcher" aria-label={openPanel ? "Fechar Assistente LAUX" : "Abrir Assistente LAUX"} aria-expanded={openPanel} onClick={() => { setOpenPanel(v => !v); if (!openPanel) trackEvent("start_diagnosis", { via: "assistente" }); }}>
      {openPanel ? <X size={22}/> : <Bot size={22}/>}
      {!openPanel && <span className="assistant-pulse" aria-hidden="true"/>}
    </Button>
    {openPanel && <div className="assistant-panel" role="dialog" aria-label="Assistente LAUX">
      <header className="assistant-head">
        <img src={lauxLogo.url} alt="LAUX AI CORE"/>
        <div><strong>Assistente LAUX</strong><span><i/>Online agora</span></div>
      </header>
      <div className="assistant-list" ref={listRef}>
        {messages.map((m, i) => <div key={i} className={`assistant-msg ${m.from}`}>{m.text}</div>)}
        <div className="assistant-options">{quickOptions.map(o => <button key={o} type="button" onClick={() => ask(o)}>{o}</button>)}</div>
      </div>
      <form className="assistant-input" onSubmit={submit}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Digite sua pergunta..." aria-label="Digite sua pergunta para o Assistente LAUX"/>
        <Button type="submit" size="icon" variant="premium" aria-label="Enviar pergunta"><Send size={17}/></Button>
      </form>
      <Button variant="premium" className="assistant-whatsapp" onClick={() => open("Olá! Estava conversando com o Assistente LAUX no site e quero continuar no WhatsApp com a equipe.", "assistente")}><MessageCircle size={16}/>Continuar pelo WhatsApp</Button>
    </div>}
  </>;
}
