import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { keySchema, normalizeCode } from "@/lib/validation";

function serializeKey(key: {
  id: string;
  code: string;
  label: string | null;
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

export async function GET() {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const keys = await prisma.accessKey.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ keys: keys.map(serializeKey) });
}

export async function POST(request: Request) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = keySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os dados da key." }, { status: 400 });
  }

  const key = await prisma.accessKey.create({
    data: {
      code: normalizeCode(parsed.data.code),
      label: parsed.data.label || null,
      singleUse: parsed.data.singleUse,
      active: parsed.data.active,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    }
  });

  return NextResponse.json({ key: serializeKey(key) }, { status: 201 });
}
