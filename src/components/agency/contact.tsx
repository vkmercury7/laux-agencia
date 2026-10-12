import { createContext, useContext, useState, type ReactNode, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle, Copy, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { whatsappUrl } from "@/lib/agency-config";

const ContactContext = createContext<(message: string) => void>(() => {});

export function ContactProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const open = (text: string) => {
    const url = whatsappUrl(text);
    if (url) { window.open(url, "_blank", "noopener,noreferrer"); return; }
    setCopied(false);
    setMessage(text);
  };
  return <ContactContext.Provider value={open}>{children}
    <Dialog open={Boolean(message)} onOpenChange={(value) => { if (!value) setMessage(""); }}>
      <DialogContent className="contact-dialog"><MessageCircle className="text-primary" size={28}/><DialogTitle>Vamos conversar sobre sua empresa.</DialogTitle>
        <DialogDescription>O WhatsApp da LAUX AGÊNCIA está aguardando configuração. Nenhuma mensagem foi enviada.</DialogDescription>
        <div className="message-preview">{message}</div>
        <Button variant="premium" onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); } catch { setCopied(false); } }}>{copied ? <Check/> : <Copy/>}{copied ? "Mensagem copiada" : "Copiar mensagem"}</Button>
      </DialogContent>
    </Dialog>
  </ContactContext.Provider>;
}

export function ContactButton({ children, message = "Olá! Conheci a LAUX AGÊNCIA pelo site e gostaria de saber mais sobre o plano de tráfego pago com criação de site.", variant = "premium", ...props }: ButtonProps & { message?: string }) {
  const open = useContext(ContactContext);
  return <Button variant={variant} {...props} onClick={() => open(message)}>{children}<ArrowUpRight/></Button>;
}

export function LeadForm() {
  const open = useContext(ContactContext);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (String(data.get("phone")).replace(/\D/g, "").length < 10) { setError("Informe um WhatsApp válido com DDD."); return; }
    setError("");
    open(`Olá! Gostaria de conhecer a LAUX AGÊNCIA.\nNome: ${data.get("name")}\nEmpresa: ${data.get("company")}\nWhatsApp: ${data.get("phone")}\nSegmento: ${data.get("segment")}\nObjetivo: ${data.get("goal")}`);
  }
  return <form onSubmit={submit} className="lead-form">
    <div className="form-grid"><label>Seu nome<input name="name" required minLength={2} autoComplete="name" placeholder="Como podemos te chamar?"/></label><label>Nome da empresa<input name="company" required minLength={2} autoComplete="organization" placeholder="Sua empresa"/></label><label>WhatsApp<input name="phone" type="tel" required autoComplete="tel" placeholder="(11) 99999-9999"/></label><label>Segmento<select name="segment" required defaultValue=""><option value="" disabled>Selecione seu segmento</option><option>Restaurante</option><option>Saúde e bem-estar</option><option>Comércio</option><option>Serviços</option><option>Outro</option></select></label></div>
    <label>Principal objetivo<textarea name="goal" required minLength={5} placeholder="O que você quer conquistar no digital?" rows={3}/></label>
    <label className="consent"><input type="checkbox" required/>Autorizo encaminhar esses dados ao WhatsApp para atendimento.</label>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button type="submit" variant="premium" size="lg">Conversar sobre meu negócio<ArrowUpRight/></Button>
    <p className="fine-print">Seus dados só serão encaminhados com sua autorização. Contato aguardando configuração.</p>
  </form>;
}