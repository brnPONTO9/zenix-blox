import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { keySchema, normalizeCode } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeKey(key: {
  id: string;
  code: string;
  label: string | null;
  wheelNumber: number;
  singleUse: boolean;
  active: boolean;
  expiresAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
}) {
  return {
    ...key,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    usedAt: key.usedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString()
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = keySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os dados da key." }, { status: 400 });
  }

  const key = await prisma.accessKey.update({
    where: { id, deletedAt: null },
    data: {
      code: normalizeCode(parsed.data.code),
      label: parsed.data.label || null,
      wheelNumber: parsed.data.wheelNumber,
      singleUse: parsed.data.singleUse,
      active: parsed.data.active,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    }
  });

  return NextResponse.json({ key: serializeKey(key) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  await prisma.accessKey.update({
    where: { id },
    data: { active: false, deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
