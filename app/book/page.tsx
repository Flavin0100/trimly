"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type BookingService = { id: number; name: string; duration: string; durationMinutes: number; price: number; desc: string };
type BookingStaff = { id: number; name: string };
type Slot = { time: string; available: boolean; staffId: number | null; staffName: string | null };
type BookingDate = { day: string; date: string; month: string; iso: string };

const defaultServices: BookingService[] = [
  { id: -1, name: "Corte Signature", duration: "40 min", durationMinutes: 40, price: 45, desc: "Consultoria, corte personalizado e finalização com toalha quente." },
  { id: -2, name: "Corte + Barba", duration: "60 min", durationMinutes: 60, price: 62, desc: "Corte Signature com barba, contorno e acabamento." },
  { id: -3, name: "Degradê", duration: "50 min", durationMinutes: 50, price: 52, desc: "Degradê de precisão com acabamento em navalha e finalização." },
  { id: -4, name: "Barba", duration: "25 min", durationMinutes: 25, price: 28, desc: "Modelagem, contorno, toalha quente e óleo para barba." },
];

const fallbackTimes = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:30", "14:15", "15:00", "15:45", "17:15"];
const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function buildDates(): BookingDate[] {
  const result: BookingDate[] = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let index = 0; index < 7; index += 1) {
    const value = new Date(base);
    value.setDate(base.getDate() + index);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    result.push({ day: dayNames[value.getDay()], date: day, month: monthNames[value.getMonth()], iso: `${year}-${month}-${day}` });
  }
  return result;
}

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState(defaultServices);
  const [service, setService] = useState(defaultServices[0]);
  const [dates] = useState(buildDates);
  const [date, setDate] = useState<BookingDate>(() => buildDates()[0]);
  const [slots, setSlots] = useState<Slot[]>(fallbackTimes.map(time => ({ time, available: true, staffId: null, staffName: null })));
  const [time, setTime] = useState("10:30");
  const [staff, setStaff] = useState<BookingStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(0);
  const [assignedStaffId, setAssignedStaffId] = useState<number | null>(null);
  const [assignedStaffName, setAssignedStaffName] = useState("Primeiro disponível");
  const [shopId, setShopId] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [shopName, setShopName] = useState("Craft & Blade");
  const [shopAddress, setShopAddress] = useState("84 SW 8th St, Miami");
  const summary = useMemo(() => `${date.day}, ${date.date} ${date.month} · ${time}`, [date, time]);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("shop");
    const endpoint = slug ? `/api/public/shop?slug=${encodeURIComponent(slug)}` : "/api/public/shop";
    fetch(endpoint).then(response => response.json()).then((data: {
      shop?: { id?: number; name?: string; address?: string } | null;
      services?: Array<{ id: number; name: string; durationMinutes: number; priceCents: number; description: string }>;
      staff?: Array<{ id: number; name: string }>;
    }) => {
      if (data.shop?.id) setShopId(data.shop.id);
      if (data.shop?.name) setShopName(data.shop.name);
      if (data.shop?.address) setShopAddress(data.shop.address);
      if (data.services?.length) {
        const configured = data.services.map(item => ({ id: item.id, name: item.name, duration: `${item.durationMinutes} min`, durationMinutes: item.durationMinutes, price: item.priceCents / 100, desc: item.description }));
        setServices(configured);
        setService(configured[0]);
      }
      if (data.staff?.length) setStaff(data.staff.map(person => ({ id: person.id, name: person.name })));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!shopId || service.id < 1) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingSlots(true);
      setSlotMessage("");
      const staffQuery = selectedStaffId ? `&staffId=${selectedStaffId}` : "";
      fetch(`/api/availability?date=${date.iso}&serviceId=${service.id}${staffQuery}`, { signal: controller.signal })
        .then(response => response.json())
        .then((data: { slots?: Slot[]; closed?: boolean; error?: string }) => {
          if (data.error) throw new Error(data.error);
          setSlots(data.slots ?? []);
          const firstAvailable = data.slots?.find(slot => slot.available);
          if (firstAvailable) {
            setTime(firstAvailable.time);
            setAssignedStaffId(firstAvailable.staffId);
            setAssignedStaffName(firstAvailable.staffName || "Primeiro disponível");
          } else {
            setTime("");
            setSlotMessage(data.closed ? "A barbearia está fechada neste dia." : "Não há horários livres neste dia. Escolha outra data.");
          }
        })
        .catch(error => { if (error.name !== "AbortError") setSlotMessage(error.message || "Não foi possível carregar os horários."); })
        .finally(() => setLoadingSlots(false));
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [date.iso, selectedStaffId, service.id, shopId]);

  function chooseSlot(slot: Slot, index: number) {
    if (slot.available) {
      setTime(slot.time);
      setAssignedStaffId(slot.staffId);
      setAssignedStaffName(slot.staffName || "Primeiro disponível");
      setSlotMessage("");
      return;
    }
    const alternatives = slots.slice(index + 1).filter(item => item.available).slice(0, 3).map(item => item.time);
    setSlotMessage(alternatives.length ? `${slot.time} está ocupado. Horários mais próximos: ${alternatives.join(", ")}.` : `${slot.time} está ocupado. Escolha outra data.`);
  }

  async function confirmBooking(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (!shopId || service.id < 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setConfirmed(true);
        return;
      }
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shopId, serviceId: service.id, staffId: selectedStaffId || assignedStaffId, appointmentAt: `${date.iso}T${time}:00` }),
      });
      const data = await response.json() as { error?: string; staffName?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível confirmar o agendamento");
      if (data.staffName) setAssignedStaffName(data.staffName);
      setConfirmed(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível confirmar o agendamento");
      if (error instanceof Error && error.message.includes("horário")) setStep(2);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-shell">
      <header className="booking-header"><Link href="/"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link><span>AGENDAMENTO SEGURO</span></header>
      <section className="booking-card">
        <aside className="shop-summary">
          <div className="shop-mark">{shopName.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><small>AGENDAMENTO ONLINE</small><h1>{shopName}</h1><p>Escolha seu serviço e reserve em poucos segundos.</p>
          <div className="shop-details"><span><i>⌖</i> {shopAddress}</span><span><i>★</i> 4,9 · 328 avaliações</span></div>
          <div className="summary-bottom"><span>TECNOLOGIA</span><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></div>
        </aside>

        <div className="booking-flow">
          {!confirmed ? <>
            <div className="booking-progress"><span className={step >= 1 ? "active" : ""}>1</span><i className={step >= 2 ? "active" : ""}/><span className={step >= 2 ? "active" : ""}>2</span><i className={step >= 3 ? "active" : ""}/><span className={step >= 3 ? "active" : ""}>3</span></div>
            {step === 1 && <div className="flow-step"><small>ETAPA 1 DE 3</small><h2>Qual serviço você deseja?</h2><p>Escolha o serviço que mais combina com seu estilo.</p><div className="service-list">{services.map(item => <button key={item.id} onClick={() => setService(item)} className={service.id === item.id ? "selected" : ""}><i>{service.id === item.id ? "✓" : ""}</i><div><strong>{item.name}</strong><span>{item.desc}</span><small>{item.duration}</small></div><b>${item.price}</b></button>)}</div><button className="booking-next" onClick={() => setStep(2)}>Escolher horário <span>→</span></button></div>}
            {step === 2 && <div className="flow-step"><button className="back-link" onClick={() => setStep(1)}>← Voltar</button><small>ETAPA 2 DE 3</small><h2>Escolha seu horário.</h2><p>A disponibilidade abaixo é atualizada em tempo real.</p>{staff.length > 0 && <div className="staff-picker"><button className={selectedStaffId === 0 ? "selected" : ""} onClick={() => setSelectedStaffId(0)}>Qualquer profissional</button>{staff.map(person => <button key={person.id} className={selectedStaffId === person.id ? "selected" : ""} onClick={() => setSelectedStaffId(person.id)}>{person.name}</button>)}</div>}<div className="date-strip">{dates.map(item => <button key={item.iso} onClick={() => setDate(item)} className={date.iso === item.iso ? "selected" : ""}><small>{item.day}</small><strong>{item.date}</strong></button>)}</div>{loadingSlots ? <div className="slot-loading">Buscando horários livres...</div> : <div className="time-grid real-time-grid">{slots.map((item, index) => <button key={item.time} onClick={() => chooseSlot(item, index)} className={`${time === item.time ? "selected" : ""} ${!item.available ? "occupied" : ""}`} aria-label={`${item.time} — ${item.available ? "disponível" : "ocupado"}`}>{item.time}{!item.available && <small>ocupado</small>}</button>)}</div>}{slotMessage && <div className="smart-note occupied-note"><span>✦</span><div><strong>Alternativas inteligentes</strong><small>{slotMessage}</small></div></div>}<div className="smart-note"><span>✓</span><div><strong>Horário verificado</strong><small>{time ? `${time} está disponível com ${assignedStaffName}.` : "Escolha outra data para continuar."}</small></div></div><button className="booking-next" disabled={!time || loadingSlots} onClick={() => setStep(3)}>Continuar <span>→</span></button></div>}
            {step === 3 && <form className="flow-step" onSubmit={confirmBooking}><button type="button" className="back-link" onClick={() => setStep(2)}>← Voltar</button><small>ETAPA 3 DE 3</small><h2>Falta muito pouco.</h2><p>Somente o essencial. Enviaremos a confirmação por mensagem.</p><div className="booking-recap"><div><span>{date.date}</span><small>{date.month}</small></div><p><strong>{service.name}</strong><span>{summary} · {assignedStaffName}</span></p><b>${service.price}</b></div><label>Nome completo<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Seu nome" autoComplete="name" /></label><label>Celular<input required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="(305) 555-0128" autoComplete="tel" /></label><label>Email <span>Opcional</span><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="voce@email.com" autoComplete="email" /></label>{formError && <p className="booking-error">{formError}</p>}<button className="booking-next" disabled={submitting}>{submitting ? "Confirmando..." : `Confirmar agendamento · $${service.price}`} <span>→</span></button><p className="form-note">Não precisa criar conta. Cancele ou reagende pelo link de confirmação.</p></form>}
          </> : <div className="confirmation-state"><span>✓</span><small>AGENDAMENTO CONFIRMADO</small><h2>Nos vemos em breve.</h2><p>Seu horário na {shopName} está reservado. Enviamos uma confirmação para {form.phone}.</p><div className="confirm-details"><div><small>SERVIÇO</small><strong>{service.name}</strong></div><div><small>QUANDO</small><strong>{summary}</strong></div><div><small>BARBEIRO</small><strong>{assignedStaffName}</strong></div></div><button className="booking-next" onClick={() => { setConfirmed(false); setStep(1); }}>Agendar outra visita</button><Link href="/">Voltar ao Trimly</Link></div>}
        </div>
      </section>
      <p className="booking-legal">Ao agendar, você concorda em receber mensagens relacionadas ao atendimento. Tarifas padrão podem ser aplicadas.</p>
    </main>
  );
}
