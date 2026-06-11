import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTO_KEY_COOKIE } from "@/lib/constants";
import {
  createDeviceToken,
  getClientIp,
  hashIdentity,
  isValidDeviceToken
} from "@/lib/client-identity";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365
};

function createAutomaticCode() {
  return `ZENIX-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function keyResponse(
  status: "ready" | "used",
  code: string,
  deviceToken: string
) {
  const response = NextResponse.json(
    {
      status,
      code: status === "ready" ? code : null
    },
    {
      headers: { "Cache-Control": "no-store" }
    }
  );

  response.cookies.set(AUTO_KEY_COOKIE, deviceToken, cookieOptions);
  return response;
}

function blockedResponse() {
  return NextResponse.json(
    {
      status: "blocked",
      error: "Uma participação já foi emitida para esta conexão."
    },
    {
      status: 409,
      headers: { "Cache-Control": "no-store" }
    }
  );
}

export async function POST(request: NextRequest) {
  const cookieToken = request.cookies.get(AUTO_KEY_COOKIE)?.value;
  const deviceToken = isValidDeviceToken(cookieToken)
    ? cookieToken!
    : createDeviceToken();
  const deviceHash = hashIdentity(`device:${deviceToken}`);
  const clientIp = getClientIp(request.headers);
  const ipHash = clientIp ? hashIdentity(`ip:${clientIp}`) : null;

  const deviceGrant = await prisma.autoKeyGrant.findUnique({
    where: { deviceHash },
    include: { accessKey: true }
  });

  if (deviceGrant && !deviceGrant.accessKey.deletedAt) {
    return keyResponse(
      deviceGrant.accessKey.usedAt ? "used" : "ready",
      deviceGrant.accessKey.code,
      deviceToken
    );
  }

  if (ipHash) {
    const ipGrant = await prisma.autoKeyGrant.findUnique({
      where: { ipHash },
      include: { accessKey: true }
    });

    if (ipGrant && !ipGrant.accessKey.deletedAt) {
      return blockedResponse();
    }
  }

  try {
    const accessKey = await prisma.accessKey.create({
      data: {
        code: createAutomaticCode(),
        label: "Gerada automaticamente",
        singleUse: true,
        active: true,
        autoGrant: {
          create: {
            deviceHash,
            ipHash
          }
        }
      }
    });

    return keyResponse("ready", accessKey.code, deviceToken);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentDeviceGrant = await prisma.autoKeyGrant.findUnique({
        where: { deviceHash },
        include: { accessKey: true }
      });

      if (concurrentDeviceGrant && !concurrentDeviceGrant.accessKey.deletedAt) {
        return keyResponse(
          concurrentDeviceGrant.accessKey.usedAt ? "used" : "ready",
          concurrentDeviceGrant.accessKey.code,
          deviceToken
        );
      }

      return blockedResponse();
    }

    return NextResponse.json(
      { status: "error", error: "Não foi possível liberar a participação agora." },
      { status: 500 }
    );
  }
}
