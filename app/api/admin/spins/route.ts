import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const spins = await prisma.spinHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      participant: true,
      accessKey: true,
      item: true
    }
  });

  return NextResponse.json({
    spins: spins.map((spin) => ({
      id: spin.id,
      nick: spin.participant.nick,
      key: spin.accessKey.code,
      item: spin.item.name,
      rarity: spin.item.rarity,
      createdAt: spin.createdAt.toISOString()
    }))
  });
}
