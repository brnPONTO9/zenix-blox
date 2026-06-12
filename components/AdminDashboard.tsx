"use client";

import {
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  probability: number;
  wheelNumber: number;
  active: boolean;
};

type AccessKey = {
  id: string;
  code: string;
  label: string | null;
  wheelNumber: number;
  singleUse: boolean;
  active: boolean;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

type Spin = {
  id: string;
  key: string;
  item: string;
  rarity: string;
  wheelNumber: number;
  createdAt: string;
};

const emptyItem = {
  name: "",
  imageUrl: "",
  rarity: "Raro",
  probability: "10",
  wheelNumber: "1",
  active: true
};

const emptyKey = {
  code: "",
  label: "",
  wheelNumber: "1",
  singleUse: true,
  active: true,
  expiresAt: ""
};

const wheelNumbers = [1, 2, 3, 4] as const;

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
  const [openItemWheel, setOpenItemWheel] = useState<number | null>(null);
  const [openKeyWheel, setOpenKeyWheel] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const itemFormRef = useRef<HTMLFormElement | null>(null);
  const keyFormRef = useRef<HTMLFormElement | null>(null);
  const syncInFlightRef = useRef(false);

  const stats = useMemo(
    () => ({
      activeItems: items.filter((item) => item.active).length,
      activeKeys: keys.filter((key) => key.active).length,
      usedKeys: keys.filter((key) => key.usedAt).length,
      spins: spins.length
    }),
    [items, keys, spins]
  );

  const load = useCallback(async (silent = false) => {
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    if (!silent) {
      setLoading(true);
    }

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
      if (!silent) {
        setMessage("Não foi possível carregar os dados do painel.");
      }
    } finally {
      syncInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    function syncWhenVisible() {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(true), 2000);
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [load]);

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
        probability: Number(itemForm.probability),
        wheelNumber: Number(itemForm.wheelNumber)
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
    setItemForm({ ...emptyItem, wheelNumber: itemForm.wheelNumber });
    setEditingItemId(null);
    setOpenItemWheel(null);
    setMessage("Item salvo com sucesso.");
    setActionLoading(null);
  }

  async function uploadItemImage(file: File) {
    setMessage("");

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setMessage("Escolha uma imagem PNG, JPG, WebP ou GIF.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 4 MB.");
      return;
    }

    setImageUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "Não foi possível enviar a imagem.");
        return;
      }

      setItemForm((current) => ({ ...current, imageUrl: data.url }));
      setMessage("Imagem carregada. Agora preencha os dados e salve o item.");
    } catch {
      setMessage("Não foi possível enviar a imagem.");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingImage(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void uploadItemImage(file);
    }
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
        wheelNumber: Number(keyForm.wheelNumber),
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
    setKeyForm({ ...emptyKey, wheelNumber: keyForm.wheelNumber });
    setEditingKeyId(null);
    setOpenKeyWheel(null);
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
      setOpenItemWheel(null);
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
      setOpenKeyWheel(null);
    }
    setMessage("Key removida com sucesso.");
    setActionLoading(null);
  }

  async function copyKey(key: AccessKey) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(key.code);
      } else {
        const input = document.createElement("textarea");
        input.value = key.code;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }

      setCopiedKeyId(key.id);
      setMessage(`Key da Roleta ${key.wheelNumber} copiada.`);
      window.setTimeout(() => {
        setCopiedKeyId((current) => (current === key.id ? null : current));
      }, 1800);
    } catch {
      setMessage("Não foi possível copiar a key automaticamente.");
    }
  }

  async function removeSpin(id: string) {
    setMessage("");
    setActionLoading(`spin-${id}`);
    const response = await fetch(`/api/admin/spins/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível remover este histórico.");
      setActionLoading(null);
      return;
    }

    setSpins((current) => current.filter((spin) => spin.id !== id));
    setMessage("Histórico removido com sucesso.");
    setActionLoading(null);
  }

  async function clearSpins() {
    if (!window.confirm("Deseja remover todo o histórico de giros?")) {
      return;
    }

    setMessage("");
    setActionLoading("clear-spins");
    const response = await fetch("/api/admin/spins", { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível limpar o histórico.");
      setActionLoading(null);
      return;
    }

    setSpins([]);
    setMessage("Todo o histórico foi removido.");
    setActionLoading(null);
  }

  function editItem(item: Item) {
    setEditingItemId(item.id);
    setOpenItemWheel(item.wheelNumber);
    setItemForm({
      name: item.name,
      imageUrl: item.imageUrl,
      rarity: item.rarity,
      probability: String(item.probability),
      wheelNumber: String(item.wheelNumber),
      active: item.active
    });
    window.requestAnimationFrame(() => {
      itemFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function editKey(key: AccessKey) {
    setEditingKeyId(key.id);
    setOpenKeyWheel(key.wheelNumber);
    setKeyForm({
      code: key.code,
      label: key.label ?? "",
      wheelNumber: String(key.wheelNumber),
      singleUse: key.singleUse,
      active: key.active,
      expiresAt: key.expiresAt ? key.expiresAt.slice(0, 16) : ""
    });
    window.requestAnimationFrame(() => {
      keyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function addItemToWheel(wheelNumber: number) {
    if (openItemWheel === wheelNumber && !editingItemId) {
      setOpenItemWheel(null);
      return;
    }

    setEditingItemId(null);
    setOpenItemWheel(wheelNumber);
    setItemForm({ ...emptyItem, wheelNumber: String(wheelNumber) });
    window.requestAnimationFrame(() => {
      itemFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function addKeyToWheel(wheelNumber: number) {
    if (openKeyWheel === wheelNumber && !editingKeyId) {
      setOpenKeyWheel(null);
      return;
    }

    setEditingKeyId(null);
    setOpenKeyWheel(wheelNumber);
    setKeyForm({ ...emptyKey, wheelNumber: String(wheelNumber) });
    window.requestAnimationFrame(() => {
      keyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function closeItemForm() {
    setEditingItemId(null);
    setOpenItemWheel(null);
    setItemForm(emptyItem);
  }

  function closeKeyForm() {
    setEditingKeyId(null);
    setOpenKeyWheel(null);
    setKeyForm(emptyKey);
  }

  function renderItemForm(wheelNumber: number) {
    return (
      <form
        ref={itemFormRef}
        onSubmit={submitItem}
        className="mt-4 grid gap-3 rounded-xl border border-volt/25 bg-volt/5 p-3 sm:grid-cols-2 sm:p-4"
      >
        <div className="sm:col-span-2">
          <p className="font-black text-white">
            {editingItemId ? "Editar produto" : "Adicionar produto"} na Roleta{" "}
            {wheelNumber}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Este produto será exibido somente nesta roleta.
          </p>
        </div>

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

        <div className="sm:col-span-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadItemImage(file);
              }
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => imageInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                imageInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingImage(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDraggingImage(false)}
            onDrop={handleImageDrop}
            className={`group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition ${
              isDraggingImage
                ? "border-volt bg-volt/10"
                : "border-white/15 bg-black/20 hover:border-volt/50 hover:bg-volt/5"
            }`}
          >
            {imageUploading ? (
              <>
                <div className="text-base font-black text-volt">Enviando imagem...</div>
                <div className="mt-1 text-xs text-slate-400">Aguarde alguns segundos</div>
              </>
            ) : itemForm.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={itemForm.imageUrl}
                  alt="Prévia do produto"
                  className="mb-3 h-24 w-24 rounded-lg border border-white/10 bg-black/30 object-contain p-2"
                />
                <div className="font-black text-white">Clique ou arraste para trocar</div>
                <div className="mt-1 text-xs text-slate-400">PNG, JPG, WebP ou GIF</div>
              </>
            ) : (
              <>
                <div className="grid h-12 w-12 place-items-center rounded-full border border-volt/30 bg-volt/10 text-2xl font-black text-volt">
                  +
                </div>
                <div className="mt-3 font-black text-white">Escolher imagem do produto</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  Clique para procurar ou arraste a imagem até aqui
                  <br />
                  PNG, JPG, WebP ou GIF, máximo 4 MB
                </div>
              </>
            )}
          </div>
        </div>

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
            onChange={(event) =>
              setItemForm({ ...itemForm, active: event.target.checked })
            }
          />
          Ativo
        </label>

        <div className="admin-form-actions sm:col-span-2">
          <button
            disabled={actionLoading === "item-form" || imageUploading}
            className="primary-button"
          >
            {actionLoading === "item-form"
              ? "Salvando..."
              : editingItemId
                ? "Atualizar produto"
                : "Salvar produto"}
          </button>
          <button type="button" onClick={closeItemForm} className="ghost-button">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  function renderKeyForm(wheelNumber: number) {
    return (
      <form
        ref={keyFormRef}
        onSubmit={submitKey}
        className="mt-4 grid gap-3 rounded-xl border border-volt/25 bg-volt/5 p-3 sm:grid-cols-2 sm:p-4"
      >
        <div className="sm:col-span-2">
          <p className="font-black text-white">
            {editingKeyId ? "Editar key" : "Criar key"} da Roleta {wheelNumber}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Esta key dará acesso somente à Roleta {wheelNumber}.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row">
          <input
            className="field uppercase"
            placeholder="Código"
            value={keyForm.code}
            onChange={(event) => setKeyForm({ ...keyForm, code: event.target.value })}
          />
          <button
            type="button"
            onClick={() => setKeyForm({ ...keyForm, code: generateCode() })}
            className="ghost-button w-full sm:w-auto"
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
          onChange={(event) =>
            setKeyForm({ ...keyForm, expiresAt: event.target.value })
          }
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
            onChange={(event) =>
              setKeyForm({ ...keyForm, active: event.target.checked })
            }
          />
          Ativa
        </label>

        <div className="admin-form-actions sm:col-span-2">
          <button
            disabled={actionLoading === "key-form"}
            className="primary-button"
          >
            {actionLoading === "key-form"
              ? "Salvando..."
              : editingKeyId
                ? "Atualizar key"
                : "Salvar key"}
          </button>
          <button type="button" onClick={closeKeyForm} className="ghost-button">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <main className="admin-layout">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/zenix-blox-logo.png"
              alt="Zenix Blox"
              width={198}
              height={100}
              priority
              className="h-12 w-auto shrink-0 drop-shadow-[0_0_14px_rgba(0,255,65,0.28)] sm:h-14"
            />
            <div className="hidden min-w-0 sm:block">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 sm:text-xs sm:tracking-[0.26em]">
                Painel administrativo
              </p>
            </div>
          </div>
          <div className="admin-top-actions">
            <Link href="/" className="ghost-button">
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

        <section className="space-y-6">
          <div className="admin-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Produtos das roletas</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Use o botão de cada roleta para abrir o cadastro no lugar certo.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {wheelNumbers.map((wheelNumber) => {
                const wheelItems = items.filter(
                  (item) => item.wheelNumber === wheelNumber
                );

                return (
                  <section
                    key={wheelNumber}
                    className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4"
                  >
                    <div className="admin-block-header">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          Roleta {wheelNumber}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {wheelItems.length} produto{wheelItems.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addItemToWheel(wheelNumber)}
                        className="ghost-button admin-block-action"
                      >
                        {openItemWheel === wheelNumber && !editingItemId
                          ? "Fechar cadastro"
                          : "Adicionar produto"}
                      </button>
                    </div>

                    {openItemWheel === wheelNumber
                      ? renderItemForm(wheelNumber)
                      : null}

                    <div className="admin-wheel-list mt-4">
                      {wheelItems.length ? (
                        wheelItems.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-lg border border-white/10 bg-black/30 object-contain p-1"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-bold">{item.name}</div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {item.rarity} • Chance {item.probability} •{" "}
                                  {item.active ? "Ativo" : "Inativo"}
                                </div>
                              </div>
                            </div>
                            <div className="admin-card-actions mt-3">
                              <button
                                type="button"
                                disabled={Boolean(actionLoading)}
                                onClick={() => editItem(item)}
                                className="ghost-button"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === `item-${item.id}`}
                                onClick={() => void removeItem(item.id)}
                                className="ghost-button"
                              >
                                {actionLoading === `item-${item.id}`
                                  ? "Removendo..."
                                  : "Remover"}
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                          Nenhum produto cadastrado nesta roleta.
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="admin-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Keys de acesso</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Use o botão de cada roleta para criar a key diretamente nela.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {wheelNumbers.map((wheelNumber) => {
                const wheelKeys = keys.filter(
                  (key) => key.wheelNumber === wheelNumber
                );

                return (
                  <section
                    key={wheelNumber}
                    className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4"
                  >
                    <div className="admin-block-header">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          Roleta {wheelNumber}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {wheelKeys.length} key{wheelKeys.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addKeyToWheel(wheelNumber)}
                        className="ghost-button admin-block-action"
                      >
                        {openKeyWheel === wheelNumber && !editingKeyId
                          ? "Fechar cadastro"
                          : "Criar key"}
                      </button>
                    </div>

                    {openKeyWheel === wheelNumber ? renderKeyForm(wheelNumber) : null}

                    <div className="admin-wheel-list mt-4">
                      {wheelKeys.length ? (
                        wheelKeys.map((key) => (
                          <article
                            key={key.id}
                            className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
                          >
                            <div className="admin-key-header">
                              <div className="min-w-0">
                                <div className="break-all font-mono font-bold text-white">
                                  {key.code}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {key.singleUse ? "Uso único" : "Reutilizável"} •{" "}
                                  {key.active ? "Ativa" : "Inativa"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => void copyKey(key)}
                                className="ghost-button admin-copy-button"
                              >
                                {copiedKeyId === key.id ? "Copiada!" : "Copiar"}
                              </button>
                            </div>

                            <div className="mt-2 text-xs leading-5 text-slate-400">
                              <div>
                                {key.usedAt
                                  ? `Usada em ${formatDate(key.usedAt)}`
                                  : "Ainda não utilizada"}
                              </div>
                              <div>Expira: {formatDate(key.expiresAt)}</div>
                              {key.label ? <div>Rótulo: {key.label}</div> : null}
                            </div>

                            <div className="admin-card-actions mt-3">
                              <button
                                type="button"
                                disabled={Boolean(actionLoading)}
                                onClick={() => editKey(key)}
                                className="ghost-button"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === `key-${key.id}`}
                                onClick={() => void removeKey(key.id)}
                                className="ghost-button"
                              >
                                {actionLoading === `key-${key.id}`
                                  ? "Removendo..."
                                  : "Remover"}
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                          Nenhuma key cadastrada para esta roleta.
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <section className="admin-card mt-6">
          <div className="admin-history-header">
            <h2 className="text-xl font-black">Histórico de giros</h2>
            <div className="admin-history-actions">
              <a href="/api/admin/export" className="ghost-button">
                Exportar CSV
              </a>
              <button
                type="button"
                onClick={() => void clearSpins()}
                disabled={!spins.length || actionLoading === "clear-spins"}
                className="ghost-button"
              >
                {actionLoading === "clear-spins" ? "Limpando..." : "Limpar histórico"}
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="admin-table admin-history-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Prêmio</th>
                  <th>Roleta</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {spins.map((spin) => (
                  <tr key={spin.id}>
                    <td data-label="Key" className="font-mono">{spin.key}</td>
                    <td data-label="Prêmio">
                      {spin.item}
                      <span className="ml-2 text-xs text-slate-400">{spin.rarity}</span>
                    </td>
                    <td data-label="Roleta">Roleta {spin.wheelNumber}</td>
                    <td data-label="Data">{formatDate(spin.createdAt)}</td>
                    <td data-label="Ações">
                      <div className="admin-actions">
                        <button
                          type="button"
                          onClick={() => void removeSpin(spin.id)}
                          disabled={actionLoading === `spin-${spin.id}`}
                          className="ghost-button"
                        >
                          {actionLoading === `spin-${spin.id}` ? "Removendo..." : "Remover"}
                        </button>
                      </div>
                    </td>
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
