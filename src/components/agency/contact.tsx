import { createContext, useContext, useState, type ReactNode, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle, Copy, Check, ShieldCheck } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { whatsappUrl, maskPhone, isValidPhone, buildLeadMessage } from "@/lib/agency-config";
import { trackEvent } from "@/lib/analytics";

const ContactContext = createContext<(message: string, source?: string) => void>(() => {});

/** Shared WhatsApp opener: tracks the click and falls back to a copy dialog. */
export function useContact() {
  return useContext(ContactContext);
}

export function ContactProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const open = (text: string, source = "geral") => {
    // Opening the conversation only proves the click: it does not confirm a received lead.
    trackEvent("click_whatsapp", { source });
    const url = whatsappUrl(text);
    if (url) { window.open(url, "_blank", "noopener,noreferrer"); return; }
    setCopied(false);
    setMessage(text);
  };
  return <ContactContext.Provider value={open}>{children}
    <Dialog open={Boolean(message)} onOpenChange={(value) => { if (!value) setMessage(""); }}>
      <DialogContent className="contact-dialog"><MessageCircle className="text-primary" size={28}/><DialogTitle>Quase lá: confirme a mensagem no WhatsApp.</DialogTitle>
        <DialogDescription>O WhatsApp não abriu automaticamente. Copie a mensagem e envie para <strong>+55 22 99926-7900</strong>.</DialogDescription>
        <div className="message-preview">{message}</div>
        <Button variant="premium" onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); } catch { setCopied(false); } }}>{copied ? <Check/> : <Copy/>}{copied ? "Mensagem copiada" : "Copiar mensagem"}</Button>
      </DialogContent>
    </Dialog>
  </ContactContext.Provider>;
}

export function ContactButton({ children, message = "Olá! Conheci a LAUX AGÊNCIA pelo site e gostaria de saber mais sobre o plano de tráfego pago com criação de site.", source, variant = "premium", ...props }: ButtonProps & { message?: string; source?: string }) {
  const open = useContact();
  return <Button variant={variant} {...props} onClick={() => open(message, source)}>{children}<ArrowUpRight/></Button>;
}

const segments = ["Restaurante", "Saúde e bem-estar", "Comércio", "Serviços", "Outro"];
const budgets = ["Até R$ 500", "R$ 500 a R$ 1.000", "R$ 1.000 a R$ 2.000", "R$ 2.000 a R$ 3.000", "Acima de R$ 3.000", "Ainda não sei"];

export function LeadForm() {
  const open = useContact();
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const str = (key: string) => String(data.get(key) ?? "");
    if (!isValidPhone(phone)) { setError("Informe um WhatsApp válido com DDD."); return; }
    const message = buildLeadMessage({
      name: str("name"), company: str("company"), phone, segment: str("segment"),
      location: str("location"), hasSite: str("hasSite"), alreadyAdvertises: str("advertises"),
      goal: str("goal"), budget: str("budget"), notes: str("notes"),
    });
    if (!message) { setError("Preencha os campos obrigatórios para continuar."); return; }
    setError("");
    open(message, "formulario-contato");
  }
  return <form onSubmit={submit} className="lead-form">
    <div className="form-grid">
      <label>Nome completo<input name="name" required minLength={2} autoComplete="name" placeholder="Como podemos te chamar?"/></label>
      <label>Nome da empresa<input name="company" required minLength={2} autoComplete="organization" placeholder="Sua empresa"/></label>
      <label>WhatsApp<input name="phone" type="tel" required inputMode="numeric" autoComplete="tel" placeholder="(22) 99999-9999" value={phone} onChange={e => setPhone(maskPhone(e.target.value))}/></label>
      <label>Segmento da empresa<select name="segment" required defaultValue=""><option value="" disabled>Selecione seu segmento</option>{segments.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Cidade / estado <small>(opcional)</small><input name="location" placeholder="Ex.: Campos dos Goytacazes / RJ"/></label>
      <label>Já possui site?<select name="hasSite" required defaultValue=""><option value="" disabled>Selecione</option><option>Sim</option><option>Não</option><option>Estou construindo</option></select></label>
      <label>Já investe em anúncios?<select name="advertises" required defaultValue=""><option value="" disabled>Selecione</option><option>Sim, atualmente</option><option>Já investi no passado</option><option>Nunca investi</option></select></label>
      <label>Orçamento mensal para anúncios<select name="budget" required defaultValue=""><option value="" disabled>Selecione uma faixa</option>{budgets.map(b => <option key={b}>{b}</option>)}</select></label>
    </div>
    <label>Principal objetivo<textarea name="goal" required minLength={5} placeholder="O que você quer conquistar no digital?" rows={3}/></label>
    <label>Observações <small>(opcional)</small><textarea name="notes" placeholder="Algo mais que a equipe deve saber?" rows={2}/></label>
    <label className="consent"><input type="checkbox" required/>Autorizo o contato comercial da LAUX AGÊNCIA por WhatsApp para receber meu diagnóstico. Meus dados não serão compartilhados com terceiros.</label>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button type="submit" variant="premium" size="lg">Enviar diagnóstico<ArrowUpRight/></Button>
    <p className="fine-print">Ao enviar, o WhatsApp abre com a mensagem pronta — você revisa e confirma o envio. Nenhum envio é feito automaticamente.</p>
  </form>;
}
