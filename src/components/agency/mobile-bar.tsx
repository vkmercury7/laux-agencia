import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/agency-config";
import { trackEvent } from "@/lib/analytics";

export function MobileConversionBar() {
  const url = whatsappUrl("Olá! Conheci a LAUX AGÊNCIA pelo site e quero falar com a equipe sobre o Plano Digital.");
  return <div className="mobile-conversion-bar">
    <button type="button" className="bar-primary" onClick={() => document.getElementById("diagnostico")?.scrollIntoView({ behavior: "smooth" })}>Solicitar diagnóstico</button>
    <a className="bar-whatsapp" href={url ?? "#diagnostico"} target={url ? "_blank" : undefined} rel={url ? "noopener noreferrer" : undefined} onClick={() => url && trackEvent("click_whatsapp", { source: "barra-mobile" })}>
      <MessageCircle size={17}/>Falar agora
    </a>
  </div>;
}
