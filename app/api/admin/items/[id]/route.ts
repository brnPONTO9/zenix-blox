import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/lib/validation";
import { toPublicItem } from "@/lib/roulette";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os dados do item." }, { status: 400 });
  }

  const item = await prisma.wheelItem.update({
    where: { id, deletedAt: null },
    data: parsed.data
  });

  return NextResponse.json({ item: toPublicItem(item) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  await prisma.wheelItem.update({
    where: { id },
    data: { active: false, deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
