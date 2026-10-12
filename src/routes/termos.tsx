import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/agency/legal-page";
export const Route = createFileRoute("/termos")({
  head: () => ({meta:[{title:"Termos de Uso em revisão | LAUX AGÊNCIA"},{name:"description",content:"Estrutura inicial dos termos de uso e condições comerciais da LAUX AGÊNCIA. Documento aguardando revisão."},{property:"og:title",content:"Termos de Uso | LAUX AGÊNCIA"},{property:"og:description",content:"Condições comerciais e escopo preliminar do site LAUX AGÊNCIA. Documento em revisão."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"},{name:"robots",content:"noindex, follow"}]}),
  component: () => <LegalPage type="terms"/>,
});