import { createContext, useContext, useState, type ReactNode } from "react";
import { ArrowUpRight, MessageCircle, Copy, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { whatsappUrl } from "@/lib/agency-config";
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

export function ContactButton({ children, message = "Olá! Conheci a LAUX AGÊNCIA pelo site e gostaria de saber mais sobre o plano de tráfego pago com criação de site.", source, analyticsEvent, variant = "premium", ...props }: ButtonProps & { message?: string; source?: string; analyticsEvent?: "click_contract" }) {
  const open = useContact();
  return <Button variant={variant} {...props} onClick={() => { if (analyticsEvent) trackEvent(analyticsEvent, { source }); open(message, source); }}>{children}<ArrowUpRight/></Button>;
}

/** Primary conversion CTA: scrolls to the existing Diagnostic form (#diagnostico). */
export function DiagnosticButton({ children, source, variant = "premium", ...props }: ButtonProps & { source?: string }) {
  return <Button asChild variant={variant} {...props}><a href="#diagnostico" onClick={() => trackEvent("click_diagnostico_cta", { source })}>{children}<ArrowUpRight/></a></Button>;
}

