import { NextResponse } from "next/server";
import { createRouletteAccessToken } from "@/lib/auth";
import { ROULETTE_ACCESS_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { accessKeySchema, normalizeCode } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = accessKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Informe uma key válida." }, { status: 400 });
  }

  const accessKey = await prisma.accessKey.findUnique({
    where: { code: normalizeCode(parsed.data.code) }
  });

  if (!accessKey || !accessKey.active || accessKey.deletedAt) {
    return NextResponse.json({ error: "Key inválida ou desativada." }, { status: 401 });
  }

  if (accessKey.expiresAt && accessKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "Esta key expirou." }, { status: 401 });
  }

  if (accessKey.singleUse && accessKey.usedAt) {
    return NextResponse.json({ error: "Esta key já foi utilizada." }, { status: 401 });
  }

  const token = await createRouletteAccessToken(accessKey.id);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(ROULETTE_ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2
  });

  return response;
}
