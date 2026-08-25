"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

type StaffMember = { id: number; name: string };
type Booking = {
  id: number;
  name: string;
  phone: string;
  service: string;
  appointmentAt: string;
  priceCents: number;
  durationMinutes: number;
  staffId: number | null;
  staffName: string;
  status: string;
};
type ScheduleBlock = {
  id: number;
  staffId: number | null;
  startsAt: string;
  endsAt: string;
  reason: string;
};

const nav = [
  ["Visão geral", "⌂", "/dashboard"], ["Agenda", "◫", "/schedule"], ["Clientes", "◎", "/clients"], ["Serviços", "✦", "/services"],
  ["Equipe", "♙", "#"], ["Financeiro", "$", "#"], ["Relatórios", "↗", "#"],
];

const weekDayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function mondayOf(value: Date) {
  const result = new Date(value);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function timeOf(value: string) {
  return value.split("T")[1]?.slice(0, 5) ?? "--:--";
}

export default function SchedulePage() {
  const [mobileNav, setMobileNav] = useState(false);
  const [shopId, setShopId] = useState(0);
  const [shopName, setShopName] = useState("Sua barbearia");
  const [shopAddress, setShopAddress] = useState("Configure seu espaço");
  const [team, setTeam] = useState<StaffMember[]>([]);
  const [staffFilter, setStaffFilter] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editStaff, setEditStaff] = useState(0);
  const [showBlock, setShowBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: isoDate(new Date()), start: "12:00", end: "13:00", staffId: 0, reason: "Intervalo" });
  const [saving, setSaving] = useState(false);

  const weekDates = useMemo(() => {
    const monday = mondayOf(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, [selectedDate]);
  const rangeStart = view === "day" ? isoDate(selectedDate) : isoDate(weekDates[0]);
  const rangeEnd = view === "day" ? isoDate(selectedDate) : isoDate(weekDates[6]);

  useEffect(() => {
    fetch("/api/onboarding").then(response => response.json()).then((data: {
      shop?: { id?: number; name?: string; address?: string } | null;
      staff?: StaffMember[];
    }) => {
      if (data.shop?.id) setShopId(data.shop.id);
      if (data.shop?.name) setShopName(data.shop.name);
      if (data.shop?.address) setShopAddress(data.shop.address);
      setTeam(data.staff ?? []);
    }).catch(() => setMessage("Não foi possível carregar a configuração da barbearia."));
  }, []);

  const loadAgenda = useCallback(async () => {
    if (!shopId) { setLoading(false); return; }
    setLoading(true);
    setMessage("");
    try {
      const query = `start=${rangeStart}&end=${rangeEnd}`;
      const [bookingResponse, blockResponse] = await Promise.all([fetch(`/api/bookings?${query}`), fetch(`/api/blocks?${query}`)]);
      const bookingData = await bookingResponse.json() as { bookings?: Booking[]; error?: string };
      const blockData = await blockResponse.json() as { blocks?: ScheduleBlock[]; error?: string };
      if (!bookingResponse.ok || !blockResponse.ok) throw new Error(bookingData.error || blockData.error || "Não foi possível carregar a agenda");
      setBookings((bookingData.bookings ?? []).filter(item => item.status !== "cancelled"));
      setBlocks(blockData.blocks ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a agenda");
    } finally {
      setLoading(false);
    }
  }, [rangeEnd, rangeStart, shopId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAgenda(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAgenda]);

  const visibleBookings = staffFilter ? bookings.filter(item => item.staffId === staffFilter) : bookings;
  const visibleBlocks = staffFilter ? blocks.filter(item => !item.staffId || item.staffId === staffFilter) : blocks;
  const today = isoDate(new Date());
  const title = view === "day"
    ? `${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`
    : `${weekDates[0].getDate()} ${monthNames[weekDates[0].getMonth()].slice(0, 3)} — ${weekDates[6].getDate()} ${monthNames[weekDates[6].getMonth()].slice(0, 3)}`;

  function moveRange(direction: number) {
    setSelectedDate(current => addDays(current, direction * (view === "week" ? 7 : 1)));
  }

  function openBooking(booking: Booking) {
    setSelectedBooking(booking);
    setEditDate(booking.appointmentAt.slice(0, 10));
    setEditTime(timeOf(booking.appointmentAt));
    setEditStaff(booking.staffId ?? 0);
    setMessage("");
  }

  async function updateBooking(payload: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o agendamento");
      setSelectedBooking(null);
      setMessage(payload.status === "cancelled" ? "Agendamento cancelado." : "Agendamento reagendado com sucesso.");
      await loadAgenda();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o agendamento");
    } finally {
      setSaving(false);
    }
  }

  async function submitBlock(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: blockForm.staffId || null, startsAt: `${blockForm.date}T${blockForm.start}:00`, endsAt: `${blockForm.date}T${blockForm.end}:00`, reason: blockForm.reason }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível bloquear o horário");
      setShowBlock(false);
      setMessage("Horário bloqueado. Ele já foi removido da página de agendamento.");
      await loadAgenda();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível bloquear o horário");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: number) {
    const response = await fetch("/api/blocks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) { setMessage("Bloqueio removido."); await loadAgenda(); }
  }

  function startBlock() {
    setBlockForm(current => ({ ...current, date: isoDate(selectedDate) }));
    setShowBlock(true);
    setMessage("");
  }

  function renderDay(date: Date) {
    const dateKey = isoDate(date);
    const dateBookings = visibleBookings.filter(item => item.appointmentAt.startsWith(dateKey));
    const dateBlocks = visibleBlocks.filter(item => item.startsAt.startsWith(dateKey));
    const hours = Array.from({ length: 14 }, (_, index) => index + 7);
    return (
      <div className="day-timeline">
        {hours.map(hour => {
          const appointments = dateBookings.filter(item => Number(timeOf(item.appointmentAt).slice(0, 2)) === hour);
          const hourBlocks = dateBlocks.filter(item => Number(timeOf(item.startsAt).slice(0, 2)) === hour);
          return (
            <div className="timeline-row" key={hour}>
              <time>{String(hour).padStart(2, "0")}:00</time>
              <div className="timeline-slot">
                {!appointments.length && !hourBlocks.length && <span className="available-line">Disponível</span>}
                {appointments.map(booking => (
                  <button className="agenda-booking" key={booking.id} onClick={() => openBooking(booking)}>
                    <i>{timeOf(booking.appointmentAt)}</i><span><strong>{booking.name}</strong><small>{booking.service} · {booking.durationMinutes} min</small></span><b>{booking.staffName}</b><em>${(booking.priceCents / 100).toFixed(0)}</em>
                  </button>
                ))}
                {hourBlocks.map(block => (
                  <div className="agenda-block" key={block.id}><i>×</i><span><strong>{block.reason}</strong><small>{timeOf(block.startsAt)}–{timeOf(block.endsAt)} · {block.staffId ? team.find(person => person.id === block.staffId)?.name : "Toda a equipe"}</small></span><button onClick={() => removeBlock(block.id)}>Remover</button></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main className="app-shell schedule-shell">
      <aside className={`app-sidebar ${mobileNav ? "open" : ""}`}>
        <Link href="/" className="dashboard-logo"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link>
        <nav aria-label="Navegação do painel">
          <small>ESPAÇO DE TRABALHO</small>
          {nav.map(([label, icon, href], index) => <Link href={href} className={`sidebar-link ${index === 1 ? "active" : ""}`} key={label}><i>{icon}</i>{label}</Link>)}
          <small>CONTA</small>
          <Link href="/onboarding" className="sidebar-link"><i>⚙</i>Configurações</Link><button><i>?</i>Central de ajuda</button>
          <SignOutButton />
        </nav>
        <div className="shop-profile"><span>{shopName.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div><strong>{shopName}</strong><small>{shopAddress}</small></div><button>•••</button></div>
      </aside>

      <section className="dashboard-main">
        <header className="app-topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu">☰</button>
          <div className="schedule-breadcrumb"><span>Agenda</span><i>/</i><strong>{view === "day" ? "Dia" : "Semana"}</strong></div>
          <div className="top-actions"><button aria-label="Notificações">♢<i /></button><span>AS</span></div>
        </header>

        <div className="schedule-content">
          <div className="schedule-title">
            <div><p>AGENDA OPERACIONAL</p><h1>{title}</h1><span>{visibleBookings.length} agendamento{visibleBookings.length === 1 ? "" : "s"} neste período</span></div>
            <div className="schedule-actions"><button onClick={startBlock}>⊘ Bloquear horário</button><Link href="/book" className="primary-button small">+ Novo agendamento</Link></div>
          </div>

          <div className="schedule-toolbar">
            <div className="date-navigation"><button onClick={() => moveRange(-1)} aria-label="Período anterior">←</button><button onClick={() => setSelectedDate(new Date())}>Hoje</button><button onClick={() => moveRange(1)} aria-label="Próximo período">→</button></div>
            <div className="staff-filter"><button className={!staffFilter ? "active" : ""} onClick={() => setStaffFilter(0)}>Todos</button>{team.map(person => <button className={staffFilter === person.id ? "active" : ""} key={person.id} onClick={() => setStaffFilter(person.id)}>{person.name}</button>)}</div>
            <div className="view-switch"><button className={view === "day" ? "active" : ""} onClick={() => setView("day")}>Dia</button><button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Semana</button></div>
          </div>

          {message && <div className="schedule-message">{message}<button onClick={() => setMessage("")}>×</button></div>}
          {loading ? <div className="schedule-loading">Carregando agenda...</div> : view === "day" ? renderDay(selectedDate) : (
            <div className="week-board">
              {weekDates.map(date => {
                const key = isoDate(date);
                const dayBookings = visibleBookings.filter(item => item.appointmentAt.startsWith(key));
                const dayBlocks = visibleBlocks.filter(item => item.startsAt.startsWith(key));
                return <section className={key === today ? "today" : ""} key={key}><header><small>{weekDayNames[date.getDay()]}</small><strong>{date.getDate()}</strong></header><div>{!dayBookings.length && !dayBlocks.length && <p>Dia livre</p>}{dayBookings.map(booking => <button className="week-booking" key={booking.id} onClick={() => openBooking(booking)}><time>{timeOf(booking.appointmentAt)}</time><strong>{booking.name}</strong><small>{booking.service}</small><i>{booking.staffName}</i></button>)}{dayBlocks.map(block => <article className="week-block" key={block.id}><time>{timeOf(block.startsAt)}–{timeOf(block.endsAt)}</time><strong>{block.reason}</strong></article>)}</div></section>;
              })}
            </div>
          )}
        </div>
      </section>

      {selectedBooking && <div className="schedule-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setSelectedBooking(null); }}><section className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><button className="modal-close" onClick={() => setSelectedBooking(null)}>×</button><small>AGENDAMENTO</small><h2 id="booking-title">{selectedBooking.name}</h2><p>{selectedBooking.service} · {selectedBooking.durationMinutes} minutos · ${(selectedBooking.priceCents / 100).toFixed(2)}</p><div className="client-contact"><span>Telefone</span><strong>{selectedBooking.phone}</strong></div><div className="modal-form"><label>Nova data<input type="date" value={editDate} onChange={event => setEditDate(event.target.value)} /></label><label>Horário<input type="time" value={editTime} onChange={event => setEditTime(event.target.value)} /></label><label className="full">Profissional<select value={editStaff} onChange={event => setEditStaff(Number(event.target.value))}><option value={0}>Primeiro disponível</option>{team.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label></div><div className="modal-actions"><button className="danger-action" disabled={saving} onClick={() => updateBooking({ id: selectedBooking.id, status: "cancelled" })}>Cancelar agendamento</button><button className="primary-button small" disabled={saving} onClick={() => updateBooking({ id: selectedBooking.id, appointmentAt: `${editDate}T${editTime}:00`, staffId: editStaff || null })}>{saving ? "Salvando..." : "Reagendar"}</button></div>{message && <div className="modal-error">{message}</div>}</section></div>}

      {showBlock && <div className="schedule-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setShowBlock(false); }}><form className="schedule-modal" onSubmit={submitBlock}><button type="button" className="modal-close" onClick={() => setShowBlock(false)}>×</button><small>NOVO BLOQUEIO</small><h2>Bloquear horário</h2><p>O intervalo deixará de aparecer como disponível para clientes.</p><div className="modal-form"><label className="full">Motivo<input required value={blockForm.reason} onChange={event => setBlockForm({ ...blockForm, reason: event.target.value })} /></label><label>Data<input required type="date" value={blockForm.date} onChange={event => setBlockForm({ ...blockForm, date: event.target.value })} /></label><label>Profissional<select value={blockForm.staffId} onChange={event => setBlockForm({ ...blockForm, staffId: Number(event.target.value) })}><option value={0}>Toda a equipe</option>{team.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>Início<input required type="time" value={blockForm.start} onChange={event => setBlockForm({ ...blockForm, start: event.target.value })} /></label><label>Fim<input required type="time" value={blockForm.end} onChange={event => setBlockForm({ ...blockForm, end: event.target.value })} /></label></div><div className="modal-actions"><button type="button" onClick={() => setShowBlock(false)}>Voltar</button><button className="primary-button small" disabled={saving}>{saving ? "Salvando..." : "Bloquear horário"}</button></div>{message && <div className="modal-error">{message}</div>}</form></div>}
    </main>
  );
}
