"use client";

import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Service = { id: number; name: string; durationMinutes: number; priceCents: number; description: string; active: boolean; appointments: number; revenueCents: number };
type ServicesData = { shop: { id: number; name: string; address: string } | null; services: Service[]; error?: string };
type ServiceForm = { id?: number; name: string; durationMinutes: number; price: number; description: string };

const nav = [["Visão geral", "⌂", "/dashboard"], ["Agenda", "◫", "/schedule"], ["Clientes", "◎", "/clients"], ["Serviços", "✦", "/services"], ["Equipe", "♙", "#"], ["Financeiro", "$", "#"], ["Relatórios", "↗", "#"]];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const emptyForm: ServiceForm = { name: "", durationMinutes: 30, price: 35, description: "" };

function initials(name: string) { return name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase(); }

export default function ServicesPage() {
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState<ServicesData>({ shop: null, services: [] });
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ServiceForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadServices() {
    setLoading(true);
    try {
      const response = await fetch("/api/services");
      const payload = await response.json() as ServicesData;
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os serviços");
      setData(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar os serviços"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadServices(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => data.services.filter(service => `${service.name} ${service.description}`.toLowerCase().includes(search.toLowerCase())), [data.services, search]);
  const metrics = useMemo(() => {
    const active = data.services.filter(service => service.active);
    return {
      active: active.length,
      averagePrice: active.length ? Math.round(active.reduce((total, service) => total + service.priceCents, 0) / active.length) : 0,
      averageDuration: active.length ? Math.round(active.reduce((total, service) => total + service.durationMinutes, 0) / active.length) : 0,
      revenue: data.services.reduce((total, service) => total + service.revenueCents, 0),
    };
  }, [data.services]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || !data.shop) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/services", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, shopId: data.shop.id }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar o serviço");
      setForm(null); setMessage(form.id ? "Serviço atualizado." : "Serviço criado."); await loadServices();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar o serviço"); }
    finally { setSaving(false); }
  }

  async function toggle(service: Service) {
    const response = await fetch("/api/services", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: service.id, active: !service.active }) });
    if (response.ok) setData(current => ({ ...current, services: current.services.map(item => item.id === service.id ? { ...item, active: !item.active } : item) }));
  }

  const shopName = data.shop?.name ?? "Sua barbearia"; const shopAddress = data.shop?.address ?? "Configure seu espaço";
  return <main className="app-shell services-shell"><aside className={`app-sidebar ${mobileNav ? "open" : ""}`}><Link href="/" className="dashboard-logo"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link><nav aria-label="Navegação do painel"><small>ESPAÇO DE TRABALHO</small>{nav.map(([label, icon, href], index) => <Link href={href} className={`sidebar-link ${index === 3 ? "active" : ""}`} key={label}><i>{icon}</i>{label}</Link>)}<small>CONTA</small><Link href="/onboarding" className="sidebar-link"><i>⚙</i>Configurações</Link><button><i>?</i>Central de ajuda</button><SignOutButton /></nav><div className="shop-profile"><span>{initials(shopName)}</span><div><strong>{shopName}</strong><small>{shopAddress}</small></div><button>•••</button></div></aside>
    <section className="dashboard-main"><header className="app-topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu">☰</button><div className="schedule-breadcrumb"><span>Serviços</span><i>/</i><strong>Catálogo</strong></div><div className="top-actions"><button aria-label="Notificações">♢<i /></button><span>{initials(shopName)}</span></div></header><div className="clients-content"><div className="admin-page-title"><div><p>CATÁLOGO</p><h1>Serviços</h1><span>Preços e durações que alimentam sua agenda em tempo real.</span></div><button className="primary-button small" onClick={() => setForm({ ...emptyForm })}>+ Novo serviço</button></div>{message && <div className="schedule-message standalone">{message}<button onClick={() => setMessage("")}>×</button></div>}<div className="client-metrics"><article><small>ATIVOS</small><strong>{metrics.active}</strong><span>no agendamento</span></article><article><small>PREÇO MÉDIO</small><strong>{currency.format(metrics.averagePrice / 100)}</strong><span>por serviço</span></article><article><small>DURAÇÃO MÉDIA</small><strong>{metrics.averageDuration} min</strong><span>por atendimento</span></article><article><small>RECEITA GERADA</small><strong>{currency.format(metrics.revenue / 100)}</strong><span>histórico total</span></article></div><section className="data-surface"><div className="data-toolbar service-toolbar"><label><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar serviço" /></label><small>{filtered.length} serviço{filtered.length === 1 ? "" : "s"}</small></div><div className="service-grid">{filtered.map((service, index) => <article className={!service.active ? "inactive" : ""} key={service.id}><div className="service-card-top"><i style={{ background: ["#8c0022", "#ad3c00", "#3b286e", "#0c5f62"][index % 4] }}>{String(index + 1).padStart(2, "0")}</i><div><span className={`service-state ${service.active ? "active" : ""}`}>{service.active ? "ATIVO" : "PAUSADO"}</span><button aria-label={`Opções de ${service.name}`} onClick={() => setForm({ id: service.id, name: service.name, durationMinutes: service.durationMinutes, price: service.priceCents / 100, description: service.description })}>•••</button></div></div><h2>{service.name}</h2><p>{service.description || "Sem descrição."}</p><div className="service-details"><span><small>DURAÇÃO</small><strong>{service.durationMinutes} min</strong></span><span><small>PREÇO</small><strong>{currency.format(service.priceCents / 100)}</strong></span></div><div className="service-performance"><span>{service.appointments} agendamentos</span><strong>{currency.format(service.revenueCents / 100)}</strong></div><div className="service-actions"><button onClick={() => setForm({ id: service.id, name: service.name, durationMinutes: service.durationMinutes, price: service.priceCents / 100, description: service.description })}>Editar</button><button onClick={() => toggle(service)}>{service.active ? "Pausar" : "Ativar"}</button></div></article>)}{!filtered.length && !loading && <div className="data-empty service-empty"><i>✦</i><strong>Nenhum serviço encontrado.</strong><span>Crie um serviço para começar a receber agendamentos.</span></div>}{loading && <div className="data-empty service-empty"><span>Carregando serviços...</span></div>}</div></section></div></section>
    {form && <div className="schedule-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setForm(null); }}><form className="schedule-modal service-modal" onSubmit={submit}><button type="button" className="modal-close" onClick={() => setForm(null)}>×</button><small>{form.id ? "EDITAR SERVIÇO" : "NOVO SERVIÇO"}</small><h2>{form.id ? "Atualizar serviço" : "Adicionar ao catálogo"}</h2><p>Esses dados aparecem na página pública de agendamento.</p><div className="modal-form"><label className="full">Nome<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Corte Signature" /></label><label>Duração<select value={form.durationMinutes} onChange={event => setForm({ ...form, durationMinutes: Number(event.target.value) })}>{[15,20,25,30,40,45,50,60,75,90].map(value => <option key={value} value={value}>{value} minutos</option>)}</select></label><label>Preço (US$)<input required min="0" step="0.01" type="number" value={form.price} onChange={event => setForm({ ...form, price: Number(event.target.value) })} /></label><label className="full">Descrição<input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="O que está incluído no serviço" /></label></div><div className="modal-actions"><button type="button" onClick={() => setForm(null)}>Cancelar</button><button className="primary-button small" disabled={saving}>{saving ? "Salvando..." : "Salvar serviço"}</button></div></form></div>}
  </main>;
}
