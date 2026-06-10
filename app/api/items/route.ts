import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicItem } from "@/lib/roulette";

export async function GET() {
  const items = await prisma.wheelItem.findMany({
    where: { active: true, deletedAt: null },
    orderBy: [{ rarity: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({ items: items.map(toPublicItem) });
}
