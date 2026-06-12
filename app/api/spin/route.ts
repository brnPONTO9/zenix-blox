import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ROULETTE_ACCESS_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { pickWeightedItem, toPublicItem } from "@/lib/roulette";
import { spinSchema } from "@/lib/validation";

function getSecret() {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must have at least 32 characters.");
  }

  return new TextEncoder().encode(value);
}

function getClientIp(headers: Headers) {
  const forwarded =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0];

  const value = forwarded?.trim();
  return value ? value.replace(/^::ffff:/, "") : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = spinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Escolha uma roleta válida." },
      { status: 400 }
    );
  }

  const token = request.cookies.get(ROULETTE_ACCESS_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Valide sua key novamente." }, { status: 401 });
  }

  let accessKeyId: string;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "roulette" || !payload.sub) {
      throw new Error("Invalid access session");
    }
    accessKeyId = payload.sub;
  } catch {
    return NextResponse.json({ error: "Valide sua key novamente." }, { status: 401 });
  }

  const { wheelNumber } = parsed.data;
  const ipAddress = getClientIp(request.headers) ?? undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const accessKey = await tx.accessKey.findUnique({
          where: { id: accessKeyId }
        });

        if (!accessKey || !accessKey.active || accessKey.deletedAt) {
          throw new Error("KEY_INVALID");
        }

        if (accessKey.expiresAt && accessKey.expiresAt < new Date()) {
          throw new Error("KEY_EXPIRED");
        }

        if (accessKey.wheelNumber !== wheelNumber) {
          throw new Error("WHEEL_FORBIDDEN");
        }

        if (accessKey.singleUse) {
          const markUsed = await tx.accessKey.updateMany({
            where: { id: accessKey.id, usedAt: null },
            data: { usedAt: new Date() }
          });

          if (markUsed.count !== 1) {
            throw new Error("KEY_USED");
          }
        }

        const activeItems = await tx.wheelItem.findMany({
          where: { wheelNumber, active: true, deletedAt: null }
        });

        if (!activeItems.length) {
          throw new Error("WHEEL_EMPTY");
        }

        const item = pickWeightedItem(activeItems);
        const spin = await tx.spinHistory.create({
          data: {
            accessKeyId: accessKey.id,
            itemId: item.id,
            wheelNumber,
            ipAddress,
            userAgent
          }
        });

        return {
          spinId: spin.id,
          item,
          singleUse: accessKey.singleUse
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );

    const response = NextResponse.json({
      spinId: result.spinId,
      item: toPublicItem(result.item),
      canSpinAgain: !result.singleUse
    });

    if (result.singleUse) {
      response.cookies.delete(ROULETTE_ACCESS_COOKIE);
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";

    if (message === "WHEEL_FORBIDDEN") {
      const response = NextResponse.json(
        {
          error: "Esta key nao pertence a esta roleta.",
          accessEnded: true
        },
        { status: 409 }
      );
      response.cookies.delete(ROULETTE_ACCESS_COOKIE);
      return response;
    }

    const labels: Record<string, string> = {
      KEY_INVALID: "Key inválida ou desativada.",
      KEY_EXPIRED: "Esta key expirou.",
      KEY_USED: "Esta key já foi utilizada.",
      WHEEL_EMPTY: "Esta roleta ainda não possui itens ativos.",
      UNKNOWN: "Não foi possível girar a roleta agora."
    };

    const response = NextResponse.json(
      {
        error: labels[message] ?? labels.UNKNOWN,
        accessEnded: message.startsWith("KEY_")
      },
      {
        status: message.startsWith("KEY_") || message === "WHEEL_EMPTY" ? 409 : 500
      }
    );

    if (message.startsWith("KEY_")) {
      response.cookies.delete(ROULETTE_ACCESS_COOKIE);
    }

    return response;
  }
}
