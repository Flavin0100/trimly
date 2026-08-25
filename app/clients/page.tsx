"use client";

import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { useEffect, useMemo, useState } from "react";

type Score = "green" | "yellow" | "red";
type Client = {
  id: number | null;
  name: string;
  phone: string;
  email: string;
  notes: string;
  score: Score;
  visits: number;
  cancellations: number;
  totalSpentCents: number;
  averageTicketCents: number;
  lastVisit: string;
  favoriteService: string;
  history: Array<{ id: number; date: string; service: string; priceCents: number; status: string }>;
};
type ClientsData = { shop: { id: number; name: string; address: string } | null; clients: Client[]; error?: string };

const nav = [
  ["Visão geral", "⌂", "/dashboard"], ["Agenda", "◫", "/schedule"], ["Clientes", "◎", "/clients"], ["Serviços", "✦", "/services"],
  ["Equipe", "♙", "#"], ["Financeiro", "$", "#"], ["Relatórios", "↗", "#"],
];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const scoreText: Record<Score, string> = { green: "Confiável", yellow: "Atenção", red: "Alto risco" };

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(value: string) {
  if (!value) return "Sem visitas";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function ClientsPage() {
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState<ClientsData>({ shop: null, clients: [] });
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | Score>("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then(async response => {
        const payload = await response.json() as ClientsData;
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os clientes");
        setData(payload);
      })
      .catch(error => setMessage(error instanceof Error ? error.message : "Não foi possível carregar os clientes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.clients.filter(client => {
      const matchesSearch = !term || `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(term);
      return matchesSearch && (scoreFilter === "all" || client.score === scoreFilter);
    });
  }, [data.clients, scoreFilter, search]);

  const metrics = useMemo(() => {
    const totalSpent = data.clients.reduce((total, client) => total + client.totalSpentCents, 0);
    const visits = data.clients.reduce((total, client) => total + client.visits, 0);
    return {
      total: data.clients.length,
      recurring: data.clients.filter(client => client.visits > 1).length,
      averageTicket: visits ? Math.round(totalSpent / visits) : 0,
      atRisk: data.clients.filter(client => client.score === "red").length,
    };
  }, [data.clients]);

  async function saveClient() {
    if (!selected || !data.shop) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: data.shop.id, phone: selected.phone, name: selected.name, email: selected.email, notes: selected.notes, score: selected.score }),
      });
      const payload = await response.json() as { client?: { id: number }; error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar");
      setData(current => ({ ...current, clients: current.clients.map(client => client.phone === selected.phone ? { ...selected, id: payload.client?.id ?? selected.id } : client) }));
      setSelected(null);
      setMessage("Cliente atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  const shopName = data.shop?.name ?? "Sua barbearia";
  const shopAddress = data.shop?.address ?? "Configure seu espaço";

  return <main className="app-shell clients-shell">
    <aside className={`app-sidebar ${mobileNav ? "open" : ""}`}>
      <Link href="/" className="dashboard-logo"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link>
      <nav aria-label="Navegação do painel"><small>ESPAÇO DE TRABALHO</small>{nav.map(([label, icon, href], index) => <Link href={href} className={`sidebar-link ${index === 2 ? "active" : ""}`} key={label}><i>{icon}</i>{label}</Link>)}<small>CONTA</small><Link href="/onboarding" className="sidebar-link"><i>⚙</i>Configurações</Link><button><i>?</i>Central de ajuda</button><SignOutButton /></nav>
      <div className="shop-profile"><span>{initials(shopName)}</span><div><strong>{shopName}</strong><small>{shopAddress}</small></div><button aria-label="Opções">•••</button></div>
    </aside>
    <section className="dashboard-main">
      <header className="app-topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu">☰</button><div className="schedule-breadcrumb"><span>Clientes</span><i>/</i><strong>Base ativa</strong></div><div className="top-actions"><button aria-label="Notificações">♢<i /></button><span>{initials(shopName)}</span></div></header>
      <div className="clients-content">
        <div className="admin-page-title"><div><p>RELACIONAMENTO</p><h1>Clientes</h1><span>Histórico, preferências e confiabilidade em um só lugar.</span></div><Link href="/book" className="primary-button small">+ Novo agendamento</Link></div>
        {message && <div className="schedule-message standalone">{message}<button onClick={() => setMessage("")}>×</button></div>}
        <div className="client-metrics"><article><small>CLIENTES</small><strong>{metrics.total}</strong><span>na base</span></article><article><small>RECORRENTES</small><strong>{metrics.recurring}</strong><span>com 2+ visitas</span></article><article><small>TICKET MÉDIO</small><strong>{currency.format(metrics.averageTicket / 100)}</strong><span>por visita</span></article><article><small>ALTO RISCO</small><strong>{metrics.atRisk}</strong><span>pedem atenção</span></article></div>
        <section className="data-surface">
          <div className="data-toolbar"><label><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, telefone ou email" /></label><div>{(["all", "green", "yellow", "red"] as const).map(score => <button key={score} className={scoreFilter === score ? "active" : ""} onClick={() => setScoreFilter(score)}>{score === "all" ? "Todos" : scoreText[score]}</button>)}</div></div>
          <div className="clients-table"><div className="clients-head"><span>Cliente</span><span>Contato</span><span>Visitas</span><span>Total gasto</span><span>Última visita</span><span>Score</span><span /></div>
            {filtered.map(client => <button className="client-row" key={client.phone} onClick={() => setSelected({ ...client })}><div className="client-primary"><i>{initials(client.name)}</i><span><strong>{client.name}</strong><small>{client.favoriteService}</small></span></div><div><strong>{client.phone}</strong><small>{client.email || "Sem email"}</small></div><b>{client.visits}</b><b>{currency.format(client.totalSpentCents / 100)}</b><span>{formatDate(client.lastVisit)}</span><em className={`score-badge ${client.score}`}><i />{scoreText[client.score]}</em><span>→</span></button>)}
            {!filtered.length && !loading && <div className="data-empty"><i>◎</i><strong>Nenhum cliente encontrado.</strong><span>Os clientes aparecem aqui depois do primeiro agendamento.</span></div>}
            {loading && <div className="data-empty"><span>Carregando clientes...</span></div>}
          </div>
        </section>
      </div>
    </section>
    {selected && <div className="client-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setSelected(null); }}><aside className="client-drawer" role="dialog" aria-modal="true" aria-labelledby="client-name"><button className="drawer-close" onClick={() => setSelected(null)}>×</button><div className="drawer-profile"><span>{initials(selected.name)}</span><div><small>PERFIL DO CLIENTE</small><h2 id="client-name">{selected.name}</h2><p>{selected.phone} · {selected.email || "Sem email"}</p></div></div><div className="drawer-stats"><div><small>VISITAS</small><strong>{selected.visits}</strong></div><div><small>TOTAL</small><strong>{currency.format(selected.totalSpentCents / 100)}</strong></div><div><small>TICKET</small><strong>{currency.format(selected.averageTicketCents / 100)}</strong></div></div><label className="drawer-field">Score de confiabilidade<select value={selected.score} onChange={event => setSelected({ ...selected, score: event.target.value as Score })}><option value="green">Verde · Confiável</option><option value="yellow">Amarelo · Atenção</option><option value="red">Vermelho · Exigir sinal</option></select></label><label className="drawer-field">Observações<textarea value={selected.notes} onChange={event => setSelected({ ...selected, notes: event.target.value })} placeholder="Preferências, estilo de corte, observações importantes..." /></label><h3>Histórico recente</h3><div className="client-history">{selected.history.map(item => <div key={item.id}><time>{formatDate(item.date)}</time><span><strong>{item.service}</strong><small>{item.status === "cancelled" ? "Cancelado" : "Confirmado"}</small></span><b>{currency.format(item.priceCents / 100)}</b></div>)}</div><button className="primary-button drawer-save" disabled={saving} onClick={saveClient}>{saving ? "Salvando..." : "Salvar alterações"}</button></aside></div>}
  </main>;
}
