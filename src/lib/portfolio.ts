export type PortfolioCategory = "all" | "sites" | "google";
export const portfolioProjects = [
  { name: "Clínica Lumina Estética Avançada", category: "sites", segment: "Estética e saúde", description: "Landing page institucional com catálogo de procedimentos e foco em conversão via WhatsApp.", url: "https://clinicaluminasante.com.br" },
  { name: "Instituto Derma Prime", category: "sites", segment: "Dermatologia", description: "Apresentação do corpo clínico, credenciais, FAQ e chamada para agendamento.", url: "https://www.clinicadermaprime.com.br" },
  { name: "Barbearia Corte & Navalha", category: "sites", segment: "Beleza masculina", description: "Identidade dark, serviços em destaque, galeria e atalhos para agendamento e rota.", url: "https://www.nanavalha.com.br" },
  { name: "The Brothers Barbershop & Lounge", category: "sites", segment: "Barbearia", description: "Página de impacto com combos, produtos, prova social e chamadas para ação.", url: "https://brothersbarbershop.com.br" },
  { name: "Almeida & Silva Advogados", category: "sites", segment: "Advocacia", description: "Site institucional com linguagem corporativa e acesso direto ao atendimento.", url: "https://almeidaesilvaadv.com.br" },
  { name: "Dra. Juliana Torres", category: "sites", segment: "Advocacia empresarial", description: "Landing page voltada a contratos, assessoria e apresentação de especialidades.", url: "https://drajulianatorres.com.br" },
  { name: "Rodrigo Personal", category: "sites", segment: "Personal trainer", description: "Planos online e presenciais, pré-cadastro e contato rápido por WhatsApp.", url: "https://personalrodrigo.com.br" },
  { name: "Vitality Studio & Personal VIP", category: "sites", segment: "Fitness e bem-estar", description: "Página de apresentação de serviços, treinos personalizados e prova social.", url: "https://www.vitalitystudio.ie" },
  { name: "Dra. Camila Fernandes | Estética Avançada", category: "google", segment: "Estética avançada", description: "Suzano, SP · Perfil público no Google Maps.", url: "https://maps.app.goo.gl/7oTPGCYdNxfaMAkW7" },
  { name: "Clínica Saúde Estética Avançada", category: "google", segment: "Clínica de estética", description: "São Paulo, SP · Perfil público no Google Maps.", url: "https://maps.app.goo.gl/KTD9VxNpmnQ7BhhLA" },
  { name: "Clínica de Estética Madame Face", category: "google", segment: "Estética facial", description: "São Paulo, SP · Perfil público no Google Maps.", url: "https://maps.app.goo.gl/urjALqPvMm8TEpvT8" },
  { name: "Barbearia RM", category: "google", segment: "Barbearia", description: "Suzano, SP · Perfil público no Google Maps.", url: "https://maps.app.goo.gl/VJhLXcWnswaWEMpq5" },
  { name: "Barbearia Cruz", category: "google", segment: "Barbearia", description: "Suzano, SP · Perfil público no Google Maps.", url: "https://maps.app.goo.gl/dJYModnu6jMLXcEV8" },
  { name: "Gregório Barbearia", category: "google", segment: "Barbearia", description: "Suzano, SP · Perfil público no Google Maps.", url: "https://maps.app.goo.gl/tt57LKYWubVWAirdA" },
] as const;

export function portfolioSelection(category: PortfolioCategory, expanded: boolean) {
  const projects = portfolioProjects.filter(project => category === "all" || project.category === category);
  return { visible: expanded ? projects : projects.slice(0, 6), hasMore: !expanded && projects.length > 6 };
}