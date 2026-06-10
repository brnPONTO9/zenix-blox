"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  probability: number;
  active: boolean;
};

type AccessKey = {
  id: string;
  code: string;
  label: string | null;
  singleUse: boolean;
  active: boolean;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

type Spin = {
  id: string;
  nick: string;
  key: string;
  item: string;
  rarity: string;
  createdAt: string;
};

const emptyItem = {
  name: "",
  imageUrl: "",
  rarity: "Raro",
  probability: "10",
  active: true
};

const emptyKey = {
  code: "",
  label: "",
  singleUse: true,
  active: true,
  expiresAt: ""
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function generateCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `ZENIX-${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function AdminDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [spins, setSpins] = useState<Spin[]>([]);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [keyForm, setKeyForm] = useState(emptyKey);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      activeItems: items.filter((item) => item.active).length,
      activeKeys: keys.filter((key) => key.active).length,
      usedKeys: keys.filter((key) => key.usedAt).length,
      spins: spins.length
    }),
    [items, keys, spins]
  );

  async function load() {
    setLoading(true);
    try {
      const [itemsResponse, keysResponse, spinsResponse] = await Promise.all([
        fetch("/api/admin/items", { cache: "no-store" }),
        fetch("/api/admin/keys", { cache: "no-store" }),
        fetch("/api/admin/spins", { cache: "no-store" })
      ]);

      if (
        [itemsResponse, keysResponse, spinsResponse].some((response) => response.status === 401)
      ) {
        router.push("/admin/login");
        return;
      }

      const [itemsData, keysData, spinsData] = await Promise.all([
        itemsResponse.json(),
        keysResponse.json(),
        spinsResponse.json()
      ]);

      setItems(itemsData.items ?? []);
      setKeys(keysData.keys ?? []);
      setSpins(spinsData.spins ?? []);
    } catch {
      setMessage("Não foi possível carregar os dados do painel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setActionLoading("item-form");
    const currentEditingId = editingItemId;
    const endpoint = currentEditingId ? `/api/admin/items/${currentEditingId}` : "/api/admin/items";
    const method = currentEditingId ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...itemForm,
        probability: Number(itemForm.probability)
      })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível salvar o item.");
      setActionLoading(null);
      return;
    }

    setItems((current) =>
      currentEditingId
        ? current.map((item) => (item.id === currentEditingId ? data.item : item))
        : [data.item, ...current]
    );
    setItemForm(emptyItem);
    setEditingItemId(null);
    setMessage("Item salvo com sucesso.");
    setActionLoading(null);
  }

  async function submitKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setActionLoading("key-form");
    const currentEditingId = editingKeyId;
    const endpoint = currentEditingId ? `/api/admin/keys/${currentEditingId}` : "/api/admin/keys";
    const method = currentEditingId ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...keyForm,
        expiresAt: keyForm.expiresAt ? new Date(keyForm.expiresAt).toISOString() : ""
      })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível salvar a key.");
      setActionLoading(null);
      return;
    }

    setKeys((current) =>
      currentEditingId
        ? current.map((key) => (key.id === currentEditingId ? data.key : key))
        : [data.key, ...current]
    );
    setKeyForm(emptyKey);
    setEditingKeyId(null);
    setMessage("Key salva com sucesso.");
    setActionLoading(null);
  }

  async function removeItem(id: string) {
    setMessage("");
    setActionLoading(`item-${id}`);
    const response = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível remover o item.");
      setActionLoading(null);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
      setItemForm(emptyItem);
    }
    setMessage("Item removido com sucesso.");
    setActionLoading(null);
  }

  async function removeKey(id: string) {
    setMessage("");
    setActionLoading(`key-${id}`);
    const response = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível remover a key.");
      setActionLoading(null);
      return;
    }

    setKeys((current) => current.filter((key) => key.id !== id));
    if (editingKeyId === id) {
      setEditingKeyId(null);
      setKeyForm(emptyKey);
    }
    setMessage("Key removida com sucesso.");
    setActionLoading(null);
  }

  function editItem(item: Item) {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      imageUrl: item.imageUrl,
      rarity: item.rarity,
      probability: String(item.probability),
      active: item.active
    });
  }

  function editKey(key: AccessKey) {
    setEditingKeyId(key.id);
    setKeyForm({
      code: key.code,
      label: key.label ?? "",
      singleUse: key.singleUse,
      active: key.active,
      expiresAt: key.expiresAt ? key.expiresAt.slice(0, 16) : ""
    });
  }

  return (
    <main className="admin-layout">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-volt/30 bg-volt/10 text-base font-black text-volt shadow-neon sm:h-11 sm:w-11 sm:text-lg">
              ZB
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black sm:text-xl">ZenixBlox Admin</p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 sm:text-xs sm:tracking-[0.26em]">
                Roleta de prêmios
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link href="/" className="ghost-button inline-flex items-center">
              Ver roleta
            </Link>
            <button onClick={logout} className="ghost-button">
              Sair
            </button>
          </div>
        </header>

        {message ? (
          <div className="mb-5 rounded-lg border border-volt/30 bg-volt/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        <section className="mb-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="admin-card">
            <p className="text-sm text-slate-400">Itens ativos</p>
            <p className="mt-2 text-3xl font-black">{stats.activeItems}</p>
          </div>
          <div className="admin-card">
            <p className="text-sm text-slate-400">Keys ativas</p>
            <p className="mt-2 text-3xl font-black">{stats.activeKeys}</p>
          </div>
          <div className="admin-card">
            <p className="text-sm text-slate-400">Keys usadas</p>
            <p className="mt-2 text-3xl font-black">{stats.usedKeys}</p>
          </div>
          <div className="admin-card">
            <p className="text-sm text-slate-400">Giros recentes</p>
            <p className="mt-2 text-3xl font-black">{stats.spins}</p>
          </div>
        </section>

        <section className="grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="admin-card">
            <h2 className="text-xl font-black">Itens da roleta</h2>
            <form onSubmit={submitItem} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="field"
                placeholder="Nome do item"
                value={itemForm.name}
                onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })}
              />
              <input
                className="field"
                placeholder="Raridade"
                value={itemForm.rarity}
                onChange={(event) => setItemForm({ ...itemForm, rarity: event.target.value })}
              />
              <input
                className="field sm:col-span-2"
                placeholder="URL da imagem"
                value={itemForm.imageUrl}
                onChange={(event) => setItemForm({ ...itemForm, imageUrl: event.target.value })}
              />
              <input
                className="field"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Chance/peso"
                value={itemForm.probability}
                onChange={(event) =>
                  setItemForm({ ...itemForm, probability: event.target.value })
                }
              />
              <label className="flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={itemForm.active}
                  onChange={(event) => setItemForm({ ...itemForm, active: event.target.checked })}
                />
                Ativo
              </label>
              <button disabled={actionLoading === "item-form"} className="primary-button sm:col-span-2">
                {actionLoading === "item-form"
                  ? "Salvando..."
                  : editingItemId
                    ? "Atualizar item"
                    : "Adicionar item"}
              </button>
            </form>

            <div className="mt-5 max-h-[430px] overflow-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Chance</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-bold">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.rarity}</div>
                      </td>
                      <td>{item.probability}</td>
                      <td>{item.active ? "Ativo" : "Inativo"}</td>
                      <td className="space-x-2">
                        <button
                          disabled={Boolean(actionLoading)}
                          onClick={() => editItem(item)}
                          className="ghost-button"
                        >
                          Editar
                        </button>
                        <button
                          disabled={actionLoading === `item-${item.id}`}
                          onClick={() => removeItem(item.id)}
                          className="ghost-button"
                        >
                          {actionLoading === `item-${item.id}` ? "Removendo..." : "Remover"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-xl font-black">Keys de acesso</h2>
            <form onSubmit={submitKey} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <input
                  className="field uppercase"
                  placeholder="Código"
                  value={keyForm.code}
                  onChange={(event) => setKeyForm({ ...keyForm, code: event.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setKeyForm({ ...keyForm, code: generateCode() })}
                  className="ghost-button sm:w-auto"
                >
                  Gerar
                </button>
              </div>
              <input
                className="field"
                placeholder="Rótulo opcional"
                value={keyForm.label}
                onChange={(event) => setKeyForm({ ...keyForm, label: event.target.value })}
              />
              <input
                className="field"
                type="datetime-local"
                value={keyForm.expiresAt}
                onChange={(event) => setKeyForm({ ...keyForm, expiresAt: event.target.value })}
              />
              <label className="flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={keyForm.singleUse}
                  onChange={(event) =>
                    setKeyForm({ ...keyForm, singleUse: event.target.checked })
                  }
                />
                Uso único
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={keyForm.active}
                  onChange={(event) => setKeyForm({ ...keyForm, active: event.target.checked })}
                />
                Ativa
              </label>
              <button disabled={actionLoading === "key-form"} className="primary-button sm:col-span-2">
                {actionLoading === "key-form"
                  ? "Salvando..."
                  : editingKeyId
                    ? "Atualizar key"
                    : "Criar key"}
              </button>
            </form>

            <div className="mt-5 max-h-[430px] overflow-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Uso</th>
                    <th>Expira</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td>
                        <div className="font-mono font-bold">{key.code}</div>
                        <div className="text-xs text-slate-400">
                          {key.usedAt ? `Usada em ${formatDate(key.usedAt)}` : "Não usada"}
                        </div>
                      </td>
                      <td>{key.singleUse ? "Único" : "Reutilizável"}</td>
                      <td>{formatDate(key.expiresAt)}</td>
                      <td className="space-x-2">
                        <button
                          disabled={Boolean(actionLoading)}
                          onClick={() => editKey(key)}
                          className="ghost-button"
                        >
                          Editar
                        </button>
                        <button
                          disabled={actionLoading === `key-${key.id}`}
                          onClick={() => removeKey(key.id)}
                          className="ghost-button"
                        >
                          {actionLoading === `key-${key.id}` ? "Removendo..." : "Remover"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="admin-card mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Histórico de giros</h2>
            <a href="/api/admin/export" className="ghost-button inline-flex items-center">
              Exportar CSV
            </a>
          </div>

          <div className="overflow-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nick</th>
                  <th>Key</th>
                  <th>Prêmio</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {spins.map((spin) => (
                  <tr key={spin.id}>
                    <td className="font-bold">{spin.nick}</td>
                    <td className="font-mono">{spin.key}</td>
                    <td>
                      {spin.item}
                      <span className="ml-2 text-xs text-slate-400">{spin.rarity}</span>
                    </td>
                    <td>{formatDate(spin.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {loading ? (
          <div className="fixed inset-x-0 bottom-4 mx-auto w-fit rounded-lg border border-white/10 bg-black/80 px-4 py-2 text-sm text-slate-200">
            Carregando dados...
          </div>
        ) : null}
      </div>
    </main>
  );
}
