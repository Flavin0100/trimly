"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Service = { name: string; duration: number; price: number; description: string };
type TeamMember = { name: string; role: string; phone: string };

const initialServices: Service[] = [
  { name: "Corte Signature", duration: 40, price: 45, description: "Corte personalizado e finalização." },
  { name: "Corte + Barba", duration: 60, price: 62, description: "Corte completo com barba e contorno." },
];

const dayLabels = [
  ["monday", "Segunda"], ["tuesday", "Terça"], ["wednesday", "Quarta"],
  ["thursday", "Quinta"], ["friday", "Sexta"], ["saturday", "Sábado"], ["sunday", "Domingo"],
];

const initialHours = Object.fromEntries(dayLabels.map(([key], index) => [key, { enabled: index !== 6, start: "09:00", end: index === 5 ? "16:00" : "19:00" }]));

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<"solo" | "pro">("pro");
  const [shop, setShop] = useState({ name: "", slug: "", phone: "", address: "", timezone: "America/New_York" });
  const [services, setServices] = useState<Service[]>(initialServices);
  const [team, setTeam] = useState<TeamMember[]>([{ name: "", role: "Barbeiro", phone: "" }]);
  const [hours, setHours] = useState<Record<string, { enabled: boolean; start: string; end: string }>>(initialHours);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => `${Math.min(step, 4) * 25}%`, [step]);

  function updateShop(field: string, value: string) {
    setShop(current => ({ ...current, [field]: value, ...(field === "name" && !current.slug ? { slug: value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}) }));
  }

  function updateService(index: number, field: keyof Service, value: string) {
    setServices(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === "name" || field === "description" ? value : Number(value) } : item));
  }

  function updateMember(index: number, field: keyof TeamMember, value: string) {
    setTeam(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop: { ...shop, plan }, services, staff: team.filter(person => person.name.trim()), openingHours: hours }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir a configuração");
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a configuração");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <Link href="/"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link>
        <span>{done ? "CONFIGURAÇÃO CONCLUÍDA" : `ETAPA ${step} DE 4`}</span>
      </header>

      <div className="onboarding-progress"><i style={{ width: done ? "100%" : progress }} /></div>

      {!done ? <section className="onboarding-card">
        <aside className="onboarding-aside">
          <span className="eyebrow"><i /> Comece do jeito certo</span>
          <h1>Sua barbearia pronta em minutos.</h1>
          <p>Configure somente o essencial. Você poderá alterar tudo depois no painel.</p>
          <ol>
            {["Escolha seu plano", "Dados da barbearia", "Serviços e preços", "Equipe e horários"].map((label, index) => <li key={label} className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""}><b>{step > index + 1 ? "✓" : index + 1}</b><span>{label}</span></li>)}
          </ol>
          <small>Seus dados são protegidos e nunca serão vendidos.</small>
        </aside>

        <form className="onboarding-form" onSubmit={finish}>
          {step === 1 && <div className="onboarding-step">
            <small>PLANO</small><h2>Como você trabalha hoje?</h2><p>Escolha a estrutura que combina com sua operação.</p>
            <div className="plan-picker">
              <button type="button" className={plan === "solo" ? "selected" : ""} onClick={() => setPlan("solo")}><span>SOLO</span><strong>US$29<small>/mês</small></strong><p>Para barbeiros autônomos.</p><ul><li>1 profissional</li><li>Agendamentos ilimitados</li><li>Clientes e lembretes</li></ul><i>{plan === "solo" ? "✓" : ""}</i></button>
              <button type="button" className={plan === "pro" ? "selected" : ""} onClick={() => setPlan("pro")}><em>RECOMENDADO</em><span>PRO</span><strong>US$49<small>/mês</small></strong><p>Para barbearias com equipe.</p><ul><li>3 profissionais incluídos</li><li>Gestão de comissão</li><li>Automações e relatórios</li></ul><i>{plan === "pro" ? "✓" : ""}</i></button>
            </div>
          </div>}

          {step === 2 && <div className="onboarding-step">
            <small>BARBEARIA</small><h2>Conte sobre seu negócio.</h2><p>Essas informações aparecerão na sua página de agendamento.</p>
            <div className="form-grid"><label className="full">Nome da barbearia<input required value={shop.name} onChange={event => updateShop("name", event.target.value)} placeholder="Ex.: Craft & Blade" /></label><label>Telefone<input required value={shop.phone} onChange={event => updateShop("phone", event.target.value)} placeholder="(305) 555-0128" /></label><label>Fuso horário<select value={shop.timezone} onChange={event => updateShop("timezone", event.target.value)}><option value="America/New_York">Nova York (ET)</option><option value="America/Chicago">Chicago (CT)</option><option value="America/Denver">Denver (MT)</option><option value="America/Los_Angeles">Los Angeles (PT)</option></select></label><label className="full">Endereço<input required value={shop.address} onChange={event => updateShop("address", event.target.value)} placeholder="84 SW 8th St, Miami, FL" /></label><label className="full">Seu link<div className="slug-input"><span>trimly.com/</span><input required value={shop.slug} onChange={event => updateShop("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="sua-barbearia" /></div></label></div>
          </div>}

          {step === 3 && <div className="onboarding-step">
            <small>SERVIÇOS</small><h2>O que seus clientes podem agendar?</h2><p>Adicione preço e duração para calcular os horários disponíveis.</p>
            <div className="setup-list">
              {services.map((item, index) => <article key={index}><div className="setup-number">{String(index + 1).padStart(2, "0")}</div><div className="setup-fields"><label>Serviço<input required value={item.name} onChange={event => updateService(index, "name", event.target.value)} /></label><label>Duração<select value={item.duration} onChange={event => updateService(index, "duration", event.target.value)}>{[15, 20, 25, 30, 40, 45, 50, 60, 75, 90].map(value => <option key={value} value={value}>{value} min</option>)}</select></label><label>Preço (US$)<input required min="0" type="number" value={item.price} onChange={event => updateService(index, "price", event.target.value)} /></label><label className="full">Descrição<input value={item.description} onChange={event => updateService(index, "description", event.target.value)} /></label></div><button type="button" aria-label="Remover serviço" onClick={() => setServices(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></article>)}
            </div>
            <button type="button" className="add-setup" onClick={() => setServices(current => [...current, { name: "", duration: 30, price: 35, description: "" }])}>+ Adicionar serviço</button>
          </div>}

          {step === 4 && <div className="onboarding-step">
            <small>EQUIPE E HORÁRIOS</small><h2>Quem atende e quando?</h2><p>No plano Solo, deixe apenas o seu nome. No Pro, adicione sua equipe.</p>
            <div className="team-setup">
              {team.map((member, index) => <div key={index}><span>{member.name ? member.name.split(" ").map(part => part[0]).slice(0, 2).join("") : index + 1}</span><input required={index === 0} value={member.name} onChange={event => updateMember(index, "name", event.target.value)} placeholder={index === 0 ? "Seu nome" : "Nome do barbeiro"}/><select value={member.role} onChange={event => updateMember(index, "role", event.target.value)}><option>Proprietário</option><option>Barbeiro</option><option>Gerente</option></select><input value={member.phone} onChange={event => updateMember(index, "phone", event.target.value)} placeholder="Telefone"/><button type="button" onClick={() => setTeam(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}
              {(plan === "pro" || team.length === 0) && team.length < 3 && <button type="button" className="add-team" onClick={() => setTeam(current => [...current, { name: "", role: "Barbeiro", phone: "" }])}>+ Adicionar profissional</button>}
            </div>
            <h3>Horário de funcionamento</h3>
            <div className="hours-setup">{dayLabels.map(([key, label]) => { const day = hours[key]; return <div key={key}><label className="switch"><input type="checkbox" checked={day.enabled} onChange={event => setHours(current => ({ ...current, [key]: { ...day, enabled: event.target.checked } }))}/><i/></label><strong>{label}</strong>{day.enabled ? <><input type="time" value={day.start} onChange={event => setHours(current => ({ ...current, [key]: { ...day, start: event.target.value } }))}/><span>até</span><input type="time" value={day.end} onChange={event => setHours(current => ({ ...current, [key]: { ...day, end: event.target.value } }))}/></> : <small>Fechado</small>}</div> })}</div>
          </div>}

          {error && <p className="setup-error">{error}</p>}
          <div className="onboarding-actions">{step > 1 ? <button type="button" className="setup-back" onClick={() => setStep(step - 1)}>← Voltar</button> : <span/>}<button type={step === 4 ? "submit" : "button"} className="primary-button" disabled={saving} onClick={step < 4 ? () => setStep(step + 1) : undefined}>{saving ? "Salvando..." : step === 4 ? "Concluir configuração" : "Continuar"}<span>→</span></button></div>
        </form>
      </section> : <section className="onboarding-success"><span>✓</span><small>TUDO PRONTO</small><h1>{shop.name} está no Trimly.</h1><p>Serviços, profissionais e horários foram salvos. Agora você já pode acessar o painel e compartilhar seu link de agendamento.</p><div><small>SEU LINK</small><strong>trimly.com/{shop.slug}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(`trimly.com/${shop.slug}`)}>Copiar</button></div><Link href="/dashboard" className="primary-button">Abrir meu painel <span>→</span></Link></section>}
    </main>
  );
}
