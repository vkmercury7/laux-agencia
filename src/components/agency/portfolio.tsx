import { useState } from "react";
import { ArrowUpRight, Globe, MapPin, Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagnosticButton } from "./contact";
import { portfolioSelection, type PortfolioCategory } from "@/lib/portfolio";

const filters = [
  { value: "all", label: "Todos", icon: LayoutGrid },
  { value: "sites", label: "Sites", icon: Globe },
  { value: "google", label: "Google Meu Negócio", icon: MapPin },
] as const;

export function Portfolio() {
  const [category, setCategory] = useState<PortfolioCategory>("all");
  const [expanded, setExpanded] = useState(false);
  const { visible, hasMore } = portfolioSelection(category, expanded);

  return <section id="portfolio" className="section bg-background" aria-labelledby="portfolio-title">
    <div className="container">
      <div className="section-heading centered">
        <span className="eyebrow">PORTFÓLIO DEMONSTRATIVO</span>
        <h2 id="portfolio-title">Conheça nosso <em>portfólio digital</em></h2>
        <p>Explore referências de sites, experiências digitais e presença local para negócios de diferentes segmentos.</p>
      </div>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">Sites e perfis apresentados como referências de estruturas digitais, não como comprovação de autoria ou de clientes atendidos pela LAUX.</p>
      <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrar portfólio">
        {filters.map(({ value, label, icon: Icon }) => <Button key={value} variant={category === value ? "secondary" : "outline"} className="min-h-11" aria-pressed={category === value} aria-controls="portfolio-projects" onClick={() => { setCategory(value); setExpanded(false); }}><Icon size={16}/>{label}</Button>)}
      </div>
      <div id="portfolio-projects" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {visible.map((project) => {
          const Icon = project.category === "sites" ? Globe : MapPin;
          return <article key={project.url} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40 motion-reduce:transition-none">
            <div className="mb-6 flex items-center justify-between gap-3"><Icon className="text-primary" size={28} aria-hidden="true"/><span className="text-xs font-semibold text-muted-foreground">{project.category === "sites" ? "SITE" : "GOOGLE MEU NEGÓCIO"}</span></div>
            <span className="mb-2 text-xs font-semibold text-primary">{project.segment}</span>
            <h3 className="mb-3 min-h-14 text-lg leading-snug font-bold text-foreground">{project.name}</h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
            <Button asChild variant="outline" className="min-h-11 w-full justify-between"><a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${project.category === "sites" ? "Ver site" : "Ver no Google Maps"}: ${project.name}`}>{project.category === "sites" ? "Ver site" : "Ver no Google Maps"}<ArrowUpRight size={16}/></a></Button>
          </article>;
        })}
      </div>
      {hasMore && <div className="mt-8 flex justify-center"><Button variant="outline" size="lg" onClick={() => setExpanded(true)} aria-controls="portfolio-projects"><Plus size={16}/>Ver mais projetos</Button></div>}
      <div className="mt-12 flex flex-col items-center gap-5 border-t border-border pt-10 text-center">
        <p className="text-lg font-semibold text-foreground">Seu negócio pode ser o próximo a fortalecer sua presença digital.</p>
        <DiagnosticButton size="lg" source="portfolio">Solicitar diagnóstico gratuito</DiagnosticButton>
      </div>
    </div>
  </section>;
}