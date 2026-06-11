"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function AccessGate() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!code.trim()) {
      setMessage("Informe sua key para continuar.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "Não foi possível validar esta key.");
        return;
      }

      router.push("/roleta");
      router.refresh();
    } catch {
      setMessage("Não foi possível validar esta key agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-obsidian px-4 py-8 text-white">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <div className="flex justify-center">
          <Image
            src="/brand/zenix-blox-logo.png"
            alt="Zenix Blox"
            width={320}
            height={162}
            priority
            className="h-auto w-56 drop-shadow-[0_0_22px_rgba(0,255,65,0.25)] sm:w-64"
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-volt">
            Acesso às roletas
          </p>
          <h1 className="mt-3 text-3xl font-black">Digite sua key</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Valide sua key para escolher uma das quatro roletas disponíveis.
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="field-label">Key de acesso</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="field text-center uppercase"
              placeholder="Ex.: ZENIX-ABC123"
              autoComplete="off"
              autoFocus
              disabled={loading}
            />
          </label>
          <button
            disabled={loading || !code.trim()}
            className="primary-button w-full"
          >
            {loading ? "Validando..." : "Entrar nas roletas"}
          </button>
        </form>

        {message ? (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
