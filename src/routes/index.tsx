import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Menu, X, Target, Globe, ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand, Dashboard } from "@/components/agency/dashboard";
import { ContactButton, ContactProvider, DiagnosticButton } from "@/components/agency/contact";
import { Problem, Solutions, WebsiteDemo, Process, Pricing, Differentials, Ecosystem, FAQ, FinalContact } from "@/components/agency/sections";
import { Diagnostic } from "@/components/agency/diagnostic";
import { Portfolio } from "@/components/agency/portfolio";
import { Simulator } from "@/components/agency/simulator";
import { LauxAssistant } from "@/components/agency/assistant";
import { MobileConversionBar } from "@/components/agency/mobile-bar";
import { trackPageView } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({meta: [
    {title:"LAUX AGÊNCIA | Gestão de Tráfego Pago e Criação de Sites"},
    {name:"description",content:"Sites profissionais e gestão de tráfego pago em uma solução integrada. Conheça o Plano Digital da LAUX AGÊNCIA: R$ 490 no primeiro mês, mídia à parte. Fale com a equipe pelo WhatsApp +55 22 99926-7900."},
    {property:"og:title",content:"LAUX AGÊNCIA — Sua empresa, mais digital"},
    {property:"og:description",content:"Presença digital, estratégia e tecnologia. Sites profissionais e gestão de anúncios para o próximo passo da sua empresa."},
    {property:"og:type",content:"website"}, {name:"twitter:card",content:"summary_large_image"},
  ]}),
  component: Index,
});

const navigation = [["Início","inicio"],["Soluções","solucoes"],["Diagnóstico","diagnostico"],["Simulador","simulador"],["Planos","planos"],["FAQ","faq"]];

function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    trackPageView("/");
    const sections = document.querySelectorAll("main > section:not(.hero), .service-card");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => {entries.forEach(entry => {if(entry.isIntersecting) {entry.target.classList.add("revealed"); observer.unobserve(entry.target);}});}, {threshold:0.06});
    sections.forEach(s => {s.classList.add("reveal-section");observer.observe(s);});
    return () => observer.disconnect();
  }, []);
  return <ContactProvider><a className="skip-link" href="#main-content">Pular para o conteúdo</a><header className="site-header"><div className="container nav-inner"><a href="#inicio" aria-label="LAUX AGÊNCIA — início"><Brand/></a><nav className={mobileOpen ? "main-nav mobile-open" : "main-nav"} aria-label="Navegação principal">{navigation.map(([label,id])=><a key={id} href={`#${id}`} onClick={()=>setMobileOpen(false)}>{label}</a>)}</nav><DiagnosticButton className="nav-contact" size="default" source="menu">Fazer diagnóstico gratuito</DiagnosticButton><Button size="icon" variant="ghost" className="menu-toggle" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</Button></div></header>
    <main id="main-content"><section id="inicio" className="hero"><div className="hero-grid-bg" aria-hidden="true"/><div className="tech-particles" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} className={`particle-${(i % 6) + 1}`}/>)}</div><div className="container hero-inner"><div className="hero-copy"><span className="hero-eyebrow"><i/>MARKETING DIGITAL <span>·</span> PERFORMANCE <span>·</span> TECNOLOGIA</span><h1>Seu negócio merece uma <em>presença digital</em> que trabalha por ele.</h1><p>Sites profissionais e campanhas de tráfego pago para conectar sua empresa a potenciais clientes, com estratégia, acompanhamento e transparência.</p><div className="hero-actions"><DiagnosticButton size="lg" source="hero">Solicitar diagnóstico gratuito</DiagnosticButton><Button asChild variant="ghost" size="lg"><a href="#solucoes">Conhecer os serviços<ArrowDown/></a></Button></div><div className="hero-offer"><span className="offer-icon"><Check size={15}/></span><span>Site profissional + gestão de tráfego<br/><strong>A partir de R$ 490 no primeiro mês.</strong></span><span className="offer-note">Mídia paga<br/>separadamente.</span></div></div><Dashboard/></div><div className="container hero-bottom"><span>ESTRATÉGIA. PRESENÇA. EVOLUÇÃO.</span><a href="#solucoes">Conheça o próximo passo<ArrowDown size={13}/></a></div></section>
    <div className="expertise-strip"><div className="container"><span>Da presença à performance.</span><span><Globe size={17}/>Sites profissionais</span><span><Target size={17}/>Google Ads & Meta Ads</span><span><ChartNoAxesCombined size={17}/>Estratégia orientada por dados</span><span className="strip-end">UM ECOSSISTEMA LAUX<ArrowUpRight size={14}/></span></div></div>
    <Problem/><Solutions/><Portfolio/><WebsiteDemo/><Simulator/><Process/><Pricing/><Differentials/><Ecosystem/><FAQ/><FinalContact/><Diagnostic/></main>
    <footer className="site-footer"><div className="container"><div className="footer-top"><div><a href="#inicio" aria-label="LAUX AGÊNCIA — voltar ao início"><Brand/></a><p>Estratégia, presença e tecnologia.<br/>Sua empresa pronta para o próximo passo.</p></div><div><span>EXPLORE</span><a href="#solucoes">Soluções</a><a href="#diagnostico">Diagnóstico</a><a href="#simulador">Simulador</a><a href="#planos">Plano Digital</a></div><div><span>ECOSSISTEMA</span><a href="https://lauxai-pixel-perfect.lovable.app/" target="_blank" rel="noopener noreferrer">LAUX AI<ArrowUpRight size={13}/></a><a href="#diagnostico">Contato</a><a href="#faq">Perguntas frequentes</a></div><div className="footer-signature">O digital é o caminho.<br/><em>Vamos juntos.</em><ContactButton variant="link" source="rodape">Conversar com a LAUX</ContactButton></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} LAUX AGÊNCIA. Todos os direitos reservados.</span><div><Link to="/termos">Termos de Uso</Link><Link to="/privacidade">Política de Privacidade</Link></div><span>PARTE DO ECOSSISTEMA LAUX ↗</span></div></div></footer>
    <LauxAssistant/><MobileConversionBar/>
  </ContactProvider>;
}
