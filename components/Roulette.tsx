"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Image from "next/image";

type WheelItem = {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  wheelNumber: number;
  probability?: number;
};

const cardWidth = 156;
const targetIndex = 64;
const idleIndex = 8;

const rarityTone: Record<string, string> = {
  comum: "from-slate-400 to-slate-200",
  raro: "from-sky-400 to-cyan-200",
  epico: "from-violet-500 to-fuchsia-300",
  lendario: "from-amber-400 to-orange-200",
  mítico: "from-rose-500 to-amber-200",
  mitico: "from-rose-500 to-amber-200"
};

function itemTone(rarity: string) {
  return rarityTone[rarity.toLowerCase()] ?? "from-emerald-400 to-teal-200";
}

function shuffleReel(items: WheelItem[], winner?: WheelItem) {
  if (!items.length) {
    return [];
  }

  return Array.from({ length: 86 }, (_, index) => {
    if (winner && index === targetIndex) {
      return winner;
    }
    return items[Math.floor(Math.random() * items.length)];
  });
}

function getCenteredOffset(
  viewport: HTMLDivElement | null,
  track: HTMLDivElement | null,
  index: number
) {
  const viewportWidth = viewport?.clientWidth ?? 940;
  const targetCard = track?.querySelector<HTMLElement>(`[data-reel-index="${index}"]`);
  const cardCenter =
    (targetCard?.offsetLeft ?? index * cardWidth) + (targetCard?.offsetWidth ?? cardWidth) / 2;

  return Math.max(0, cardCenter - viewportWidth / 2);
}

export function Roulette() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedItemsRef = useRef(false);
  const isSpinningRef = useRef(false);
  const [items, setItems] = useState<WheelItem[]>([]);
  const [reel, setReel] = useState<WheelItem[]>([]);
  const [selectedWheel, setSelectedWheel] = useState(1);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [offset, setOffset] = useState(0);

  const selectedItems = useMemo(
    () => items.filter((item) => item.wheelNumber === selectedWheel),
    [items, selectedWheel]
  );

  const totalProbability = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + (typeof item.probability === "number" ? item.probability : 0),
        0
      ),
    [selectedItems]
  );

  useEffect(() => {
    let active = true;

    async function refreshItems() {
      try {
        const response = await fetch("/api/items", { cache: "no-store" });
        const data = await response.json();

        if (!active) {
          return;
        }

        const loaded = data.items ?? [];
        setItems(loaded);
        hasLoadedItemsRef.current = true;

        if (!isSpinningRef.current) {
          setReel(
            shuffleReel(
              loaded.filter((item: WheelItem) => item.wheelNumber === selectedWheel)
            )
          );
        }
      } catch {
        if (active && !hasLoadedItemsRef.current) {
          setMessage("Não foi possível carregar os itens da roleta.");
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshItems();
      }
    }

    void refreshItems();
    const interval = window.setInterval(() => void refreshItems(), 2000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [selectedWheel]);

  function chooseWheel(wheelNumber: number) {
    if (isSpinning) {
      return;
    }

    setSelectedWheel(wheelNumber);
    setWinner(null);
    setMessage("");
    setIsAnimating(false);
    setOffset(0);
  }

  async function spin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setWinner(null);

    if (!selectedItems.length) {
      setMessage(`A Roleta ${selectedWheel} ainda não possui itens ativos.`);
      return;
    }

    setIsSpinning(true);
    isSpinningRef.current = true;
    setIsAnimating(false);
    setOffset(0);

    const response = await fetch("/api/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wheelNumber: selectedWheel })
    });
    const data = await response.json();

    if (!response.ok) {
      setIsSpinning(false);
      isSpinningRef.current = false;
      setMessage(data.error ?? "Não foi possível girar a roleta.");
      return;
    }

    const nextReel = shuffleReel(selectedItems, data.item);
    setReel(nextReel);
    setIsAnimating(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffset(getCenteredOffset(viewportRef.current, trackRef.current, idleIndex));
        requestAnimationFrame(() => {
          const centerOffset = getCenteredOffset(
            viewportRef.current,
            trackRef.current,
            targetIndex
          );
          setIsAnimating(true);
          setOffset(centerOffset);
        });
      });
    });

    window.setTimeout(() => {
      setWinner(data.item);
      setIsSpinning(false);
      isSpinningRef.current = false;
      setIsAnimating(false);
      setMessage(`Parabéns! Você ganhou ${data.item.name}.`);
    }, 6100);
  }

  useEffect(() => {
    if (!reel.length || isSpinning) {
      return;
    }

    requestAnimationFrame(() => {
      setIsAnimating(false);
      setOffset(getCenteredOffset(viewportRef.current, trackRef.current, idleIndex));
    });
  }, [reel.length, isSpinning, selectedWheel]);

  useEffect(() => {
    function handleResize() {
      if (!isSpinning) {
        setIsAnimating(false);
        setOffset(getCenteredOffset(viewportRef.current, trackRef.current, idleIndex));
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSpinning]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-obsidian text-white">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-wrap items-center gap-3">
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
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.28em]">
                Premium Rewards
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 items-start gap-5 py-6 lg:grid-cols-[minmax(320px,390px)_minmax(0,1fr)] lg:items-center lg:gap-8 lg:py-8">
          <aside className="panel w-full min-w-0 p-4 sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-volt sm:text-sm sm:tracking-[0.26em]">
                Roleta oficial
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-white min-[380px]:text-4xl sm:text-5xl">
                Gire por prêmios ZenixBlox
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Escolha uma das quatro roletas e gire. Cada roleta possui seus próprios
                produtos e chances configurados pelo admin.
              </p>
            </div>

            <form onSubmit={spin} className="space-y-4">
              <div>
                <span className="field-label">Escolha sua roleta</span>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((wheelNumber) => {
                    const itemCount = items.filter(
                      (item) => item.wheelNumber === wheelNumber
                    ).length;

                    return (
                      <button
                        key={wheelNumber}
                        type="button"
                        onClick={() => chooseWheel(wheelNumber)}
                        disabled={isSpinning}
                        className={clsx(
                          "roulette-choice",
                          selectedWheel === wheelNumber && "roulette-choice-active"
                        )}
                      >
                        <strong>Roleta {wheelNumber}</strong>
                        <span>
                          {itemCount} {itemCount === 1 ? "item" : "itens"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                disabled={isSpinning || !selectedItems.length}
                className="primary-button w-full"
              >
                {isSpinning ? "Girando..." : `Girar Roleta ${selectedWheel}`}
              </button>
            </form>

            {message ? (
              <div
                className={clsx(
                  "mt-5 rounded-lg border px-4 py-3 text-sm",
                  winner
                    ? "border-volt/30 bg-volt/10 text-emerald-100"
                    : "border-danger/30 bg-danger/10 text-rose-100"
                )}
              >
                {message}
              </div>
            ) : null}

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm max-[340px]:grid-cols-1">
              <div className="stat">
                <dt>Itens nesta roleta</dt>
                <dd>{selectedItems.length}</dd>
              </div>
              <div className="stat">
                <dt>Peso total</dt>
                <dd>{totalProbability.toFixed(1)}</dd>
              </div>
            </dl>
          </aside>

          <section className="w-full min-w-0 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-volt">
                  Selecionada
                </p>
                <h2 className="text-2xl font-black">Roleta {selectedWheel}</h2>
              </div>
              <span className="rounded-full border border-volt/25 bg-volt/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-volt">
                {selectedItems.length} itens
              </span>
            </div>
            <div className="roulette-shell">
              <div ref={viewportRef} className="roulette-viewport">
                <div
                  ref={trackRef}
                  className={clsx("roulette-track", isAnimating && "roulette-track-animate")}
                  style={{ transform: `translate3d(-${offset}px, 0, 0)` }}
                >
                  {reel.map((item, index) => (
                    <article
                      key={`${item.id}-${index}`}
                      data-reel-index={index}
                      className={clsx(
                        "roulette-card",
                        winner?.id === item.id && index === targetIndex && "winner-card"
                      )}
                    >
                      <div className={clsx("item-art bg-gradient-to-br", itemTone(item.rarity))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt="" />
                      </div>
                      <p className="line-clamp-2 text-sm font-bold">{item.name}</p>
                      <span>{item.rarity}</span>
                    </article>
                  ))}
                </div>
                {reel.length > 0 ? (
                  <div className="roulette-pointer" aria-hidden="true">
                    <span className="roulette-pointer-cap roulette-pointer-cap-top" />
                    <span className="roulette-pointer-core" />
                    <span className="roulette-pointer-cap roulette-pointer-cap-bottom" />
                  </div>
                ) : null}
              </div>
            </div>

            {winner ? (
              <div className="result-panel">
                <div className={clsx("result-art bg-gradient-to-br", itemTone(winner.rarity))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={winner.imageUrl} alt="" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-volt sm:tracking-[0.28em]">
                    Resultado
                  </p>
                  <h2 className="mt-1 text-xl font-black sm:text-2xl">{winner.name}</h2>
                  <p className="text-sm text-slate-300">{winner.rarity}</p>
                </div>
              </div>
            ) : (
              <div className="result-panel">
                <div className="grid h-16 w-16 place-items-center rounded-lg border border-white/10 bg-white/5 text-xl font-black text-slate-400">
                  ?
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 sm:tracking-[0.28em]">
                    Aguardando giro
                  </p>
                  <h2 className="mt-1 text-xl font-black sm:text-2xl">
                    Seu prêmio aparecerá aqui
                  </h2>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
