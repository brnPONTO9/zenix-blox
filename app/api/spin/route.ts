import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickWeightedItem, toPublicItem } from "@/lib/roulette";
import { normalizeCode, spinSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = spinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe um nick e uma key válida." },
      { status: 400 }
    );
  }

  const code = normalizeCode(parsed.data.code);
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const accessKey = await tx.accessKey.findUnique({ where: { code } });

        if (!accessKey || !accessKey.active || accessKey.deletedAt) {
          throw new Error("KEY_INVALID");
        }

        if (accessKey.expiresAt && accessKey.expiresAt < new Date()) {
          throw new Error("KEY_EXPIRED");
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
          where: { active: true, deletedAt: null }
        });
        const item = pickWeightedItem(activeItems);
        const participant = await tx.participant.create({
          data: { nick: parsed.data.nick }
        });
        const spin = await tx.spinHistory.create({
          data: {
            participantId: participant.id,
            accessKeyId: accessKey.id,
            itemId: item.id,
            ipAddress,
            userAgent
          }
        });

        return {
          spinId: spin.id,
          participant,
          item
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      spinId: result.spinId,
      nick: result.participant.nick,
      item: toPublicItem(result.item)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const labels: Record<string, string> = {
      KEY_INVALID: "Key inválida ou desativada.",
      KEY_EXPIRED: "Esta key expirou.",
      KEY_USED: "Esta key já foi utilizada.",
      UNKNOWN: "Não foi possível girar a roleta agora."
    };

    return NextResponse.json(
      { error: labels[message] ?? labels.UNKNOWN },
      { status: message.startsWith("KEY_") ? 409 : 500 }
    );
  }
}
