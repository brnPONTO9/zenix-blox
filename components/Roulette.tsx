"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type WheelItem = {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  wheelNumber: number;
};

type WheelLaneProps = {
  wheelNumber: number;
  items: WheelItem[];
  spinLocked: boolean;
  accessEnded: boolean;
  onSpinStart: (wheelNumber: number) => void;
  onSpinEnd: (message: string, accessEnded: boolean) => void;
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
    (targetCard?.offsetLeft ?? index * cardWidth) +
    (targetCard?.offsetWidth ?? cardWidth) / 2;

  return Math.max(0, cardCenter - viewportWidth / 2);
}

function WheelLane({
  wheelNumber,
  items,
  spinLocked,
  accessEnded,
  onSpinStart,
  onSpinEnd
}: WheelLaneProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [reel, setReel] = useState<WheelItem[]>(() => shuffleReel(items));
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (isSpinning) {
      return;
    }

    setWinner(null);
    setReel(shuffleReel(items));
  }, [items, isSpinning]);

  useEffect(() => {
    if (!reel.length || isSpinning) {
      return;
    }

    requestAnimationFrame(() => {
      setIsAnimating(false);
      setOffset(getCenteredOffset(viewportRef.current, trackRef.current, idleIndex));
    });
  }, [reel.length, isSpinning]);

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

  async function spin() {
    if (!items.length || spinLocked || accessEnded) {
      return;
    }

    onSpinStart(wheelNumber);
    setWinner(null);
    setIsSpinning(true);
    setIsAnimating(false);
    setOffset(0);

    try {
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wheelNumber })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsSpinning(false);
        onSpinEnd(data.error ?? "Não foi possível girar a roleta.", response.status === 401);
        return;
      }

      setReel(shuffleReel(items, data.item));
      setIsAnimating(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOffset(getCenteredOffset(viewportRef.current, trackRef.current, idleIndex));
          requestAnimationFrame(() => {
            setIsAnimating(true);
            setOffset(
              getCenteredOffset(viewportRef.current, trackRef.current, targetIndex)
            );
          });
        });
      });

      window.setTimeout(() => {
        setWinner(data.item);
        setIsSpinning(false);
        setIsAnimating(false);
        onSpinEnd(`Você ganhou ${data.item.name}!`, !data.canSpinAgain);
      }, 6100);
    } catch {
      setIsSpinning(false);
      onSpinEnd("Não foi possível girar a roleta.", false);
    }
  }

  return (
    <section className="roulette-unit">
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

          {reel.length ? (
            <div className="roulette-pointer" aria-hidden="true">
              <span className="roulette-pointer-cap roulette-pointer-cap-top" />
              <span className="roulette-pointer-core" />
              <span className="roulette-pointer-cap roulette-pointer-cap-bottom" />
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void spin()}
        disabled={!items.length || spinLocked || accessEnded}
        className="primary-button w-full"
      >
        {isSpinning ? "Girando..." : `Girar Roleta ${wheelNumber}`}
      </button>
    </section>
  );
}

export function Roulette() {
  const [items, setItems] = useState<WheelItem[]>([]);
  const [activeWheel, setActiveWheel] = useState<number | null>(null);
  const [accessEnded, setAccessEnded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function refreshItems() {
      try {
        const response = await fetch("/api/items", { cache: "no-store" });
        const data = await response.json();

        if (active) {
          setItems(data.items ?? []);
        }
      } catch {
        if (active) {
          setMessage("Não foi possível carregar as roletas.");
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
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-obsidian px-3 py-4 text-white sm:px-5 sm:py-5">
      <div className="roulette-grid mx-auto w-full max-w-[1500px]">
        {[1, 2, 3, 4].map((wheelNumber) => (
          <WheelLane
            key={wheelNumber}
            wheelNumber={wheelNumber}
            items={items.filter((item) => item.wheelNumber === wheelNumber)}
            spinLocked={activeWheel !== null}
            accessEnded={accessEnded}
            onSpinStart={(number) => {
              setMessage("");
              setActiveWheel(number);
            }}
            onSpinEnd={(nextMessage, ended) => {
              setMessage(nextMessage);
              setAccessEnded(ended);
              setActiveWheel(null);
            }}
          />
        ))}
      </div>

      {message ? (
        <div className="roulette-toast" role="status">
          {message}
        </div>
      ) : null}
    </main>
  );
}
