import { randomInt } from "node:crypto";
import type { WheelItem } from "@prisma/client";

type WeightedItem = Pick<WheelItem, "id" | "probability">;

export function pickWeightedItem<T extends WeightedItem>(items: T[]) {
  if (!items.length) {
    throw new Error("No active wheel items configured.");
  }

  const scale = 10_000;
  const weights = items.map((item) => {
    const weight = Math.round(Number(item.probability) * scale);
    return Math.max(weight, 0);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    throw new Error("Total item probability must be greater than zero.");
  }

  const roll = randomInt(1, total + 1);
  let cursor = 0;

  for (let index = 0; index < items.length; index += 1) {
    cursor += weights[index];
    if (roll <= cursor) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

export function toPublicItem(item: {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  wheelNumber?: number;
  probability?: unknown;
  active?: boolean;
}) {
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    rarity: item.rarity,
    wheelNumber: item.wheelNumber,
    probability:
      item.probability === undefined ? undefined : Number(item.probability),
    active: item.active
  };
}
