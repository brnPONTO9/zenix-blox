import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/lib/validation";
import { toPublicItem } from "@/lib/roulette";

export async function GET() {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const items = await prisma.wheelItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ items: items.map(toPublicItem) });
}

export async function POST(request: Request) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os dados do item." }, { status: 400 });
  }

  const item = await prisma.wheelItem.create({
    data: parsed.data
  });

  return NextResponse.json({ item: toPublicItem(item) }, { status: 201 });
}
