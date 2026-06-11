import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  getClientIp,
  hashIdentity,
  isValidDeviceToken
} from "@/lib/client-identity";
import { AUTO_KEY_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { pickWeightedItem, toPublicItem } from "@/lib/roulette";
import { normalizeCode, spinSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = spinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe uma key válida." },
      { status: 400 }
    );
  }

  const code = normalizeCode(parsed.data.code);
  const ipAddress = getClientIp(request.headers) ?? undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const accessKey = await tx.accessKey.findUnique({
          where: { code },
          include: { autoGrant: true }
        });

        if (!accessKey || !accessKey.active || accessKey.deletedAt) {
          throw new Error("KEY_INVALID");
        }

        if (accessKey.expiresAt && accessKey.expiresAt < new Date()) {
          throw new Error("KEY_EXPIRED");
        }

        if (accessKey.autoGrant) {
          const deviceToken = request.cookies.get(AUTO_KEY_COOKIE)?.value;

          if (
            !isValidDeviceToken(deviceToken) ||
            hashIdentity(`device:${deviceToken}`) !== accessKey.autoGrant.deviceHash
          ) {
            throw new Error("KEY_DEVICE");
          }
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
        const spin = await tx.spinHistory.create({
          data: {
            accessKeyId: accessKey.id,
            itemId: item.id,
            ipAddress,
            userAgent
          }
        });

        return {
          spinId: spin.id,
          item
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      spinId: result.spinId,
      item: toPublicItem(result.item)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const labels: Record<string, string> = {
      KEY_INVALID: "Key inválida ou desativada.",
      KEY_EXPIRED: "Esta key expirou.",
      KEY_USED: "Esta key já foi utilizada.",
      KEY_DEVICE: "Esta key pertence a outro dispositivo.",
      UNKNOWN: "Não foi possível girar a roleta agora."
    };

    return NextResponse.json(
      { error: labels[message] ?? labels.UNKNOWN },
      {
        status:
          message === "KEY_DEVICE"
            ? 403
            : message.startsWith("KEY_")
              ? 409
              : 500
      }
    );
  }
}
