"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "forgot") {
        const { error: authError } = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/login`,
        });
        if (authError) throw new Error(authError.message || "Não foi possível enviar o email");
        setMessage("Enviamos as instruções de recuperação para o seu email.");
        return;
      }

      const result = mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password, callbackURL: "/onboarding" })
        : await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });

      if (result.error) throw new Error(result.error.message || "Não foi possível autenticar");
      window.location.href = mode === "sign-up" ? "/onboarding" : "/dashboard";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function social(provider: "google" | "apple") {
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await authClient.signIn.social({ provider, callbackURL: "/dashboard" });
      if (authError) throw new Error(authError.message || "Não foi possível continuar");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível continuar");
      setLoading(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  const title = mode === "sign-up" ? "Criar sua conta" : mode === "forgot" ? "Recuperar acesso" : "Entrar no Trimly";
  const description = mode === "sign-up"
    ? "Comece seu teste e configure sua barbearia em poucos minutos."
    : mode === "forgot"
      ? "Informe seu email para receber um link seguro."
      : "Acesse a agenda e os indicadores da sua barbearia.";

  return <main className="auth-shell">
    <section className="auth-brand">
      <Link href="/"><Image src="/brand/trimly-wordmark.png" width={620} height={130} alt="Trimly" /></Link>
      <div><span>CUIDE DA BARBEARIA.<br />NÃO DA AGENDA.</span><p>Um espaço organizado para cada agendamento, barbeiro e cliente.</p></div>
      <small>© 2026 Trimly, Inc.</small>
    </section>
    <section className="auth-panel"><form className="auth-box" onSubmit={submit}>
      <span className="eyebrow dark"><i /> {mode === "sign-up" ? "Comece agora" : mode === "forgot" ? "Acesso seguro" : "Bem-vindo de volta"}</span>
      <h1>{title}</h1><p>{description}</p>

      {mode !== "forgot" && <>
        <button type="button" disabled={loading} className="oauth-button" onClick={() => social("google")}><b>G</b> Continuar com Google</button>
        <button type="button" disabled={loading} className="oauth-button" onClick={() => social("apple")}><b>●</b> Continuar com Apple</button>
        <div className="or-divider"><i/>OU<i/></div>
      </>}

      {mode === "sign-up" && <label>Seu nome<input required value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Seu nome" /></label>}
      <label>Email profissional<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="voce@barbearia.com" /></label>
      {mode !== "forgot" && <label>Senha {mode === "sign-in" && <button type="button" className="auth-text-button" onClick={() => changeMode("forgot")}>Esqueceu a senha?</button>}<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder="Mínimo de 8 caracteres" /></label>}

      {error && <p className="auth-feedback error" role="alert">{error}</p>}
      {message && <p className="auth-feedback success" role="status">{message}</p>}
      <button type="submit" disabled={loading} className="primary-button auth-submit">{loading ? "Aguarde..." : mode === "sign-up" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Entrar"} <span>→</span></button>

      {mode === "sign-in" && <p className="auth-switch">Ainda não usa o Trimly? <button type="button" onClick={() => changeMode("sign-up")}>Comece seu teste grátis</button></p>}
      {mode === "sign-up" && <p className="auth-switch">Já possui uma conta? <button type="button" onClick={() => changeMode("sign-in")}>Entrar</button></p>}
      {mode === "forgot" && <p className="auth-switch"><button type="button" onClick={() => changeMode("sign-in")}>← Voltar para o login</button></p>}
    </form></section>
  </main>;
}
