import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/agency/legal-page";
export const Route = createFileRoute("/privacidade")({
  head: () => ({meta:[{title:"Política de Privacidade em revisão | LAUX AGÊNCIA"},{name:"description",content:"Estrutura inicial da política de privacidade da LAUX AGÊNCIA, aguardando validação jurídica e configuração final."},{property:"og:title",content:"Privacidade | LAUX AGÊNCIA"},{property:"og:description",content:"Informações preliminares sobre tratamento de dados e contato. Documento em revisão."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"},{name:"robots",content:"noindex, follow"}]}),
  component: () => <LegalPage type="privacy"/>,
});