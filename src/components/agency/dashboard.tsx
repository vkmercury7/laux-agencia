import { ArrowUpRight, BarChart3, Globe, LayoutGrid, MousePointer2, Target, TrendingUp, Instagram, ChevronDown } from "lucide-react";

export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? "brand-small" : ""}`}><span className="brand-symbol" aria-hidden="true"><i/><i/><i/></span><span className="brand-word">LAUX<span className="brand-sub">AGÊNCIA</span></span></span>;
}

export function PerformanceChart({ compact = false }: { compact?: boolean }) {
  return <svg className={`performance-chart ${compact ? "compact-chart" : ""}`} viewBox="0 0 440 155" role="img" aria-label="Gráfico ilustrativo de evolução dos cliques">
    <defs><linearGradient id={compact ? "chart-small" : "chart-main"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".15"/><stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/></linearGradient></defs>
    {[25,65,105,145].map(y => <line key={y} x1="0" y1={y} x2="440" y2={y} className="chart-grid"/>)}
    <path d="M0 125 C25 125 25 105 50 109 S85 80 110 91 S145 109 170 77 S205 84 230 56 S265 71 295 40 S325 48 350 23 S390 37 440 7 L440 155 L0 155 Z" fill={`url(#${compact ? "chart-small" : "chart-main"})`}/>
    <path className="chart-line" d="M0 125 C25 125 25 105 50 109 S85 80 110 91 S145 109 170 77 S205 84 230 56 S265 71 295 40 S325 48 350 23 S390 37 440 7"/>
  </svg>;
}

export function Dashboard() {
  return <div className="dashboard-scene">
    <div className="scene-ring ring-one"/><div className="scene-ring ring-two"/>
    <div className="platform-chip google-chip"><span className="google-g">G</span><span>Google Ads</span></div>
    <div className="platform-chip meta-chip"><span className="meta-mark">∞</span><span>Meta Ads</span><Instagram size={17}/></div>
    <div className="campaign-dashboard">
      <aside className="dashboard-sidebar"><span className="mini-logo">L<span>↗</span></span><LayoutGrid size={18}/><BarChart3 className="active" size={18}/><Target size={18}/><Globe size={18}/><span className="sidebar-bottom">L</span></aside>
      <div className="dashboard-main"><div className="dashboard-top"><div><span className="dashboard-eyebrow">VISÃO GERAL</span><h3>Performance digital</h3></div><span className="live-tag"><i/>Campanhas ativas</span></div>
        <div className="dashboard-filter"><span>Visão geral das campanhas</span><span>Últimos 30 dias<ChevronDown size={11}/></span></div>
        <div className="dashboard-stats"><div><span>Impressões</span><strong>24.580</strong><small><TrendingUp size={11}/> 18,6%</small></div><div><span>Cliques</span><strong>1.248</strong><small><TrendingUp size={11}/> 24,8%</small></div><div><span>CPC médio</span><strong>R$ 2,50</strong><small className="muted-stat">Custo por clique</small></div></div>
        <div className="chart-heading"><span>Evolução de cliques</span><span><i/>Cliques</span></div><PerformanceChart/>
        <div className="chart-dates"><span>01 jun</span><span>07 jun</span><span>14 jun</span><span>21 jun</span><span>30 jun</span></div>
        <div className="campaign-row"><span><span className="google-g">G</span>Campanha de pesquisa</span><span className="live-tag"><i/>Ativa</span><ArrowUpRight size={15}/></div>
      </div>
    </div>
    <div className="floating-metric"><span className="metric-icon"><MousePointer2 size={20}/></span><div><small>Mais oportunidades</small><strong>Presença que conecta<span><TrendingUp size={12}/> Estratégia + tecnologia</span></strong></div><ArrowUpRight size={18}/></div>
    <div className="floating-site"><div className="site-browser"><i/><i/><i/><span>suaempresa.com.br</span></div><div className="mini-site-head"><span>SUA MARCA<span>ONLINE</span></span><span>Início · Sobre · Contato</span></div><div className="mini-site-content"><div><small>O próximo passo começa aqui.</small><strong>Seu negócio.<br/>Mais digital.</strong><span className="mini-site-cta">Conheça nossa empresa ↗</span></div><div className="mini-architecture"><span/><span/><span/></div></div><div className="site-status"><Globe size={12}/><span>Site profissional e responsivo</span><span className="status-dot"/></div></div>
    <span className="dashboard-disclaimer">DEMONSTRAÇÃO ILUSTRATIVA · NÃO REPRESENTA RESULTADOS REAIS</span>
  </div>;
}