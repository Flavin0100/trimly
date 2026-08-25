"use client";

import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { useEffect, useMemo, useState } from "react";

type Range = "Hoje" | "Semana" | "Mês";
type RevenueRange = { totalCents: number; change: number; series: Array<{ label: string; value: number }> };
type DashboardData = {
  shop: { id: number; name: string; address: string; timezone: string } | null;
  today: string;
  metrics: {
    revenueCents: number;
    appointments: number;
    clients: number;
    newClients: number;
    returnRate: number;
    availableSlots: number;
    occupancy: number;
    capacitySlots: number;
  };
  revenue: Record<Range, RevenueRange>;
  appointments: Array<{
    id: number;
    time: string;
    name: string;
    initials: string;
    service: string;
    staffName: string;
    priceCents: number;
    status: string;
  }>;
};

const nav = [
  ["Visão geral", "⌂", "/dashboard"], ["Agenda", "◫", "/schedule"], ["Clientes", "◎", "/clients"], ["Serviços", "✦", "/services"],
  ["Equipe", "♙", "#"], ["Financeiro", "$", "#"], ["Relatórios", "↗", "#"],
];

const emptyData: DashboardData = {
  shop: null,
  today: new Date().toISOString().slice(0, 10),
  metrics: { revenueCents: 0, appointments: 0, clients: 0, newClients: 0, returnRate: 0, availableSlots: 0, occupancy: 0, capacitySlots: 0 },
  revenue: {
    Hoje: { totalCents: 0, change: 0, series: [] },
    Semana: { totalCents: 0, change: 0, series: [] },
    Mês: { totalCents: 0, change: 0, series: [] },
  },
  appointments: [],
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatCurrency(cents: number) {
  return currency.format(cents / 100);
}

function statusLabel(status: string) {
  if (status === "completed") return "Concluído";
  if (status === "cancelled") return "Cancelado";
  return "Confirmado";
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("Hoje");
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async response => {
        const payload = await response.json() as DashboardData & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o painel");
        setData(payload.shop ? payload : emptyData);
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Não foi possível carregar o painel"))
      .finally(() => setLoading(false));
  }, []);

  const selectedRevenue = data.revenue[range];
  const maxChartValue = Math.max(1, ...selectedRevenue.series.map(item => item.value));
  const shopName = data.shop?.name ?? "Sua barbearia";
  const shopAddress = data.shop?.address ?? "Configure seu espaço";
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  }).format(new Date(`${data.today}T12:00:00`)), [data.today]);
  const changePositive = selectedRevenue.change >= 0;

  return (
    <main className="app-shell">
      <aside className={`app-sidebar ${mobileNav ? "open" : ""}`}>
        <Link href="/" className="dashboard-logo"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link>
        <nav aria-label="Navegação do painel">
          <small>ESPAÇO DE TRABALHO</small>
          {nav.map(([label, icon, href], index) => <Link href={href} className={`sidebar-link ${index === 0 ? "active" : ""}`} key={label}><i>{icon}</i>{label}</Link>)}
          <small>CONTA</small>
          <Link href="/onboarding" className="sidebar-link"><i>⚙</i>Configurações</Link><button><i>?</i>Central de ajuda</button><SignOutButton />
        </nav>
        <div className="shop-profile"><span>{shopName.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div><strong>{shopName}</strong><small>{shopAddress}</small></div><button aria-label="Opções da barbearia">•••</button></div>
      </aside>

      <section className="dashboard-main">
        <header className="app-topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu">☰</button>
          <div className="search-field"><span>⌕</span><input aria-label="Pesquisar" placeholder="Pesquisar clientes, agendamentos..." /><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button aria-label="Notificações">♢<i /></button><span>{shopName.split(" ").map(part => part[0]).slice(0, 2).join("")}</span></div>
        </header>

        <div className={`dashboard-content ${loading ? "dashboard-loading" : ""}`}>
          <div className="dashboard-title">
            <div><p>{dateLabel}</p><h1>Bom dia.</h1><span>Veja o que está acontecendo hoje na {shopName}.</span></div>
            <div className="title-actions"><button>Exportar relatório</button><Link href="/book" className="primary-button small">+ Novo agendamento</Link></div>
          </div>

          {error && <div className="dashboard-alert"><span>Não foi possível atualizar os indicadores.</span><button onClick={() => window.location.reload()}>Tentar novamente</button></div>}
          {!data.shop && !loading && !error && <div className="dashboard-alert empty"><span>Configure sua barbearia para começar a acompanhar os indicadores.</span><Link href="/onboarding">Configurar agora →</Link></div>}

          <div className="real-metrics">
            <article><div><small>Receita agendada hoje</small><i>$</i></div><strong>{formatCurrency(data.metrics.revenueCents)}</strong><p><b>{data.metrics.appointments} atendimento{data.metrics.appointments === 1 ? "" : "s"}</b> confirmado{data.metrics.appointments === 1 ? "" : "s"}</p></article>
            <article><div><small>Agendamentos</small><i>◫</i></div><strong>{data.metrics.appointments}</strong><p><b>{data.metrics.availableSlots} horários</b> ainda disponíveis</p></article>
            <article><div><small>Clientes hoje</small><i>◎</i></div><strong>{data.metrics.clients}</strong><p><b>{data.metrics.newClients} novo{data.metrics.newClients === 1 ? "" : "s"}</b> cliente{data.metrics.newClients === 1 ? "" : "s"}</p></article>
            <article><div><small>Taxa de retorno</small><i>↻</i></div><strong>{data.metrics.returnRate}%</strong><p><b>{data.metrics.clients - data.metrics.newClients}</b> cliente{data.metrics.clients - data.metrics.newClients === 1 ? "" : "s"} recorrente{data.metrics.clients - data.metrics.newClients === 1 ? "" : "s"}</p></article>
          </div>

          <div className="insight-grid">
            <article className="revenue-panel">
              <div className="panel-heading"><div><small>RECEITA AGENDADA</small><h2>Desempenho do negócio</h2></div><div className="range-tabs">{(["Hoje", "Semana", "Mês"] as Range[]).map(item => <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item}</button>)}</div></div>
              <div className="revenue-total"><strong>{formatCurrency(selectedRevenue.totalCents)}</strong><span className={!changePositive ? "negative" : ""}>{changePositive ? "+" : ""}{selectedRevenue.change}%</span></div>
              <div className="dynamic-chart" role="img" aria-label={`Gráfico da receita de ${range.toLowerCase()}`}>
                <div className="chart-lines"><i /><i /><i /><i /></div>
                <div className="chart-bars">{selectedRevenue.series.map(item => <div key={item.label} className="chart-column"><i style={{ height: `${Math.max(4, (item.value / maxChartValue) * 100)}%` }}><span>{item.value ? formatCurrency(item.value) : "$0"}</span></i><small>{item.label}</small></div>)}</div>
                {!selectedRevenue.series.some(item => item.value) && <div className="chart-empty">Os próximos agendamentos aparecerão aqui.</div>}
              </div>
            </article>

            <article className="occupancy-panel">
              <div className="panel-heading"><div><small>CAPACIDADE</small><h2>Ocupação de hoje</h2></div><button aria-label="Opções">•••</button></div>
              <div className="occupancy-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="47"/><circle className="progress" cx="60" cy="60" r="47" style={{ strokeDashoffset: 295 - (295 * data.metrics.occupancy / 100) }}/></svg><div><strong>{data.metrics.occupancy}%</strong><small>ocupado</small></div></div>
              <div className="capacity-list"><div><i className="booked"/><span>Ocupados</span><strong>{data.metrics.appointments} horários</strong></div><div><i/><span>Disponíveis</span><strong>{data.metrics.availableSlots} horários</strong></div></div>
              <Link href="/book">Preencher horários livres <span>→</span></Link>
            </article>
          </div>

          <article className="appointments-panel">
            <div className="panel-heading"><div><small>A SEGUIR</small><h2>Agendamentos de hoje</h2></div><Link href="/schedule">Ver agenda completa →</Link></div>
            <div className="appointments-table">
              <div className="table-head"><span>Horário</span><span>Cliente</span><span>Serviço</span><span>Barbeiro</span><span>Valor</span><span>Status</span><span /></div>
              {data.appointments.map(appointment => (
                <div className="table-row" key={appointment.id}><time>{appointment.time}</time><div className="client-cell"><i>{appointment.initials}</i><strong>{appointment.name}</strong></div><span>{appointment.service}</span><span>{appointment.staffName}</span><strong>{formatCurrency(appointment.priceCents)}</strong><b className={appointment.status === "confirmed" ? "arriving" : ""}><i />{statusLabel(appointment.status)}</b><Link href="/schedule" aria-label={`Abrir agendamento de ${appointment.name}`}>→</Link></div>
              ))}
              {!data.appointments.length && !loading && <div className="appointments-empty"><span>◫</span><strong>Nenhum agendamento para hoje.</strong><p>Compartilhe seu link ou crie um novo agendamento para preencher a agenda.</p><Link href="/book">Novo agendamento →</Link></div>}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
