import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  await prisma.spinHistory.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
