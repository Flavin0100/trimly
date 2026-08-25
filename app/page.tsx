import Image from "next/image";
import Link from "next/link";
import LandingEffects from "./landing-effects";

const benefits = [
  { number: "01", title: "Agendado em segundos", text: "Um fluxo sem atritos, criado para transformar visitas ao perfil em clientes pagantes." },
  { number: "02", title: "Menos cadeiras vazias", text: "Lista de espera, lembretes e ofertas automáticas mantêm sua agenda sempre em movimento." },
  { number: "03", title: "Sua barbearia no controle", text: "Uma visão simples de agendas, clientes, desempenho da equipe e faturamento." },
];

const appointments = [
  ["09:00", "Marcus Reed", "Degradê", "$45"],
  ["10:30", "Noah Bennett", "Corte + Barba", "$58"],
  ["12:00", "Ethan Cole", "Corte Clássico", "$38"],
];

export default function Home() {
  return (
    <main className="landing-shell">
      <LandingEffects />
      <header className="site-header">
        <Link href="/" aria-label="Página inicial do Trimly" className="brand-link">
          <Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" priority />
        </Link>
        <nav aria-label="Navegação principal" className="desktop-nav">
          <a href="#features">Recursos</a><a href="#how-it-works">Como funciona</a><a href="#pricing">Planos</a>
        </nav>
        <div className="header-actions">
          <Link href="/login" className="text-button">Entrar</Link>
          <Link href="/onboarding" className="primary-button small">Começar grátis</Link>
        </div>
      </header>

      <section className="hero-section" data-reveal>
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow"><i /> Feito para barbearias modernas</span>
          <h1>Mais clientes.<br /><span>Menos trabalho.</span></h1>
          <p>A maneira mais rápida para seus clientes agendarem e a mais simples para sua barbearia funcionar. Um sistema premium para cada cadeira.</p>
          <div className="hero-actions">
            <Link href="/onboarding" className="primary-button">Comece a agendar melhor <span>↗</span></Link>
            <Link href="/dashboard" className="secondary-button">Explorar o painel</Link>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true"><b>M</b><b>N</b><b>E</b><b>+</b></div>
            <p><strong>15 segundos</strong><br />do link à confirmação</p>
          </div>
        </div>

        <div className="product-stage" data-parallax aria-label="Prévia do painel Trimly">
          <div className="stage-orbit orbit-one" /><div className="stage-orbit orbit-two" />
          <div className="product-window">
            <div className="product-topbar">
              <Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" />
              <div><span /><span /><span /></div>
            </div>
            <div className="product-body">
              <aside className="mini-sidebar">
                {["Visão geral", "Agenda", "Clientes", "Serviços", "Relatórios"].map((item, index) => (
                  <div key={item} className={index === 0 ? "active" : ""}><i>{index + 1}</i>{item}</div>
                ))}
              </aside>
              <div className="mini-dashboard">
                <div className="mini-heading">
                  <div><small>Sábado, 22 de agosto</small><h2>Bom dia, Alex.</h2></div><button>+ Novo agendamento</button>
                </div>
                <div className="metric-grid">
                  <article><small>Faturamento hoje</small><strong>$1,284</strong><span>↗ 12,4%</span></article>
                  <article><small>Agendamentos</small><strong>24</strong><span>3 horários livres</span></article>
                  <article><small>Clientes recorrentes</small><strong>68%</strong><span>↗ 4,8%</span></article>
                </div>
                <div className="dashboard-row">
                  <article className="schedule-card">
                    <div className="card-title"><span>Próximos agendamentos</span><small>Ver todos</small></div>
                    {appointments.map(([time, name, service, price]) => (
                      <div className="appointment" key={time}><time>{time}</time><i>{name[0]}</i><div><strong>{name}</strong><small>{service}</small></div><b>{price}</b></div>
                    ))}
                  </article>
                  <article className="chart-card">
                    <div className="card-title"><span>Faturamento</span><small>Esta semana</small></div><strong>$6,840</strong>
                    <div className="bar-chart" aria-label="Gráfico semanal de faturamento">
                      {[38, 56, 44, 78, 68, 91, 64].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-card confirm-card"><span>✓</span><div><strong>Agendamento confirmado</strong><small>Marcus · 14:30</small></div></div>
          <div className="floating-card open-card"><small>Cadeira livre</small><strong>15:15</strong><button>Preencher horário</button></div>
        </div>
      </section>

      <section className="trust-strip" data-reveal aria-label="Destaques do produto">
        <span>AGENDAMENTO INTELIGENTE</span><i /><span>SEM INSTALAR APLICATIVO</span><i /><span>FEITO PARA SER RÁPIDO</span><i /><span>PAGAMENTOS COM STRIPE</span>
      </section>

      <section className="benefit-section" id="features" data-reveal>
        <div className="section-heading">
          <span className="eyebrow dark"><i /> Por que o Trimly</span>
          <h2>Tudo que você precisa.<br />Nada que atrapalhe.</h2>
          <p>Um sistema focado para barbearias que valorizam a experiência do cliente.</p>
        </div>
        <div className="benefit-grid">
          {benefits.map((benefit, index) => <article key={benefit.number} data-reveal data-reveal-delay={index + 1}><span>{benefit.number}</span><h3>{benefit.title}</h3><p>{benefit.text}</p></article>)}
        </div>
      </section>

      <section className="how-section" id="how-it-works" data-reveal>
        <div>
          <span className="eyebrow"><i /> Feito para converter</span><h2>Seu próximo cliente<br />está a três toques.</h2>
          <p>Compartilhe um único link. O Trimly memoriza preferências, encontra o horário livre mais próximo e traz seus clientes de volta.</p>
          <Link href="/book" className="primary-button">Testar o agendamento <span>↗</span></Link>
        </div>
        <ol>
          <li data-reveal data-reveal-delay="1"><b>1</b><div><strong>Escolha o serviço</strong><span>Preço e duração claros, sem complicação.</span></div></li>
          <li data-reveal data-reveal-delay="2"><b>2</b><div><strong>Escolha o horário</strong><span>Disponibilidade ao vivo com alternativas inteligentes.</span></div></li>
          <li data-reveal data-reveal-delay="3"><b>3</b><div><strong>Confirme</strong><span>Nome, telefone e pronto. Em menos de 15 segundos.</span></div></li>
        </ol>
      </section>

      <section className="pricing-section" id="pricing" data-reveal>
        <div className="pricing-copy"><span className="eyebrow dark"><i /> Preço simples</span><h2>Comece simples.<br />Cresça sem limites.</h2><p>Sem porcentagem sobre seus cortes. Cancele quando quiser.</p></div>
        <div className="pricing-plans">
          <article className="price-card solo-card">
            <span>TRIMLY SOLO</span><div><strong>$29</strong><small>/ mês</small></div>
            <p>Para barbeiros autônomos que querem organizar e crescer.</p>
            <ul><li>1 profissional</li><li>Agendamentos ilimitados</li><li>Página pública e lembretes</li><li>Clientes e relatórios básicos</li></ul>
            <Link href="/onboarding" className="secondary-button">Escolher Solo</Link>
          </article>
          <article className="price-card pro-card">
            <em>RECOMENDADO</em><span>TRIMLY PRO</span><div><strong>$49</strong><small>/ mês</small></div>
            <p>Para barbearias que precisam administrar uma equipe.</p>
            <ul><li>3 profissionais incluídos</li><li>Comissões e permissões</li><li>Lista de espera e promoções</li><li>Relatórios avançados</li></ul>
            <Link href="/onboarding" className="primary-button">Escolher Pro</Link>
          </article>
        </div>
      </section>

      <footer>
        <Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /><p>Simples para clientes. Poderoso para barbearias.</p>
        <div><a href="#features">Recursos</a><a href="#pricing">Planos</a><Link href="/login">Entrar</Link></div><small>© 2026 Trimly, Inc. Todos os direitos reservados.</small>
      </footer>
    </main>
  );
}
