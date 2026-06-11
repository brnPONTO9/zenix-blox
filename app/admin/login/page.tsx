"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@zenixblox.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Não foi possível entrar.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="admin-layout grid place-items-center px-4 py-10">
      <section className="panel w-full max-w-md p-6">
        <div className="mb-6">
          <Image
            src="/brand/zenix-blox-logo.png"
            alt="Zenix Blox"
            width={321}
            height={162}
            priority
            className="mb-5 h-auto w-48 drop-shadow-[0_0_18px_rgba(0,255,65,0.32)] sm:w-56"
          />
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-volt">
            Painel seguro
          </p>
          <h1 className="mt-2 text-3xl font-black">Área administrativa</h1>
          <p className="mt-2 text-sm text-slate-300">
            Entre para gerenciar itens, keys e histórico de giros.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="field-label">E-mail</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              type="email"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="field-label">Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
          <button disabled={loading} className="primary-button w-full">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
