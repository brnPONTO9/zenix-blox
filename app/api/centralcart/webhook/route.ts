import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CentralCartPackage = {
  id?: string | number;
  package_id?: string | number;
  product_id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  meta?: {
    id?: string | number;
    package_id?: string | number;
    product_id?: string | number;
    name?: string;
    title?: string;
    slug?: string;
  };
  product?: {
    id?: string | number;
    package_id?: string | number;
    product_id?: string | number;
    name?: string;
    title?: string;
    slug?: string;
  };
  package?: {
    id?: string | number;
    package_id?: string | number;
    product_id?: string | number;
    name?: string;
    title?: string;
    slug?: string;
  };
};

type CentralCartOrderPayload = {
  id?: string | number;
  internal_id?: string | number;
  status?: string;
  event?: string;
  email?: string;
  customer?: {
    email?: string;
  };
  client?: {
    email?: string;
  };
  packages?: CentralCartPackage[];
  items?: CentralCartPackage[];
  package?: CentralCartPackage;
};

type CentralCartWebhookPayload = {
  id?: string | number;
  event?: string;
  date?: string;
  data?: CentralCartOrderPayload;
};

const approvedEvents = new Set(["order_approved", "pedido_aprovado"]);
const approvedStatuses = new Set(["approved", "paid", "order_approved", "pedido_aprovado"]);

function getWebhookSecret() {
  const secret = process.env.CENTRALCART_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("CENTRALCART_WEBHOOK_SECRET is not configured.");
  }

  return secret;
}

function parsePackageWheelMap() {
  const value = process.env.CENTRALCART_PACKAGE_ROULETTE_MAP ?? "";
  const map = new Map<string, number>();

  for (const entry of value.split(",")) {
    const [packageId, wheelNumber] = entry.split(":").map((part) => part?.trim());
    const parsedWheel = Number(wheelNumber);

    if (packageId && Number.isInteger(parsedWheel) && parsedWheel >= 1 && parsedWheel <= 4) {
      map.set(packageId, parsedWheel);
    }
  }

  return map;
}

function normalizeSignature(signature: string) {
  return signature.replace(/^sha256=/i, "").trim();
}

function verifyCentralCartSignature(rawBody: string, request: NextRequest) {
  const signature = request.headers.get("x-centralcart-signature");
  const timestamp = request.headers.get("x-centralcart-timestamp");

  if (!signature || !timestamp) {
    return false;
  }

  const timestampMs = Number(timestamp) * (timestamp.length === 10 ? 1000 : 1);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return false;
  }

  const payloadCandidates = [rawBody];
  try {
    payloadCandidates.push(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    // Keep only the raw body candidate for invalid JSON.
  }

  const receivedSignature = normalizeSignature(signature);
  const receivedBuffer = Buffer.from(receivedSignature, "hex");

  if (!receivedBuffer.length) {
    return false;
  }

  for (const payloadCandidate of payloadCandidates) {
    const signedPayload = `${timestamp}.${payloadCandidate}`;
    const expected = createHmac("sha256", getWebhookSecret())
      .update(signedPayload)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return true;
    }
  }

  return false;
}

function getOrderId(payload: CentralCartOrderPayload) {
  return String(payload.internal_id ?? payload.id ?? "").trim();
}

function getBuyerEmail(payload: CentralCartOrderPayload) {
  return payload.customer?.email ?? payload.client?.email ?? payload.email ?? null;
}

function getMappedPackage(payload: CentralCartOrderPayload) {
  const packageWheelMap = parsePackageWheelMap();
  const packages = [
    ...(payload.packages ?? []),
    ...(payload.items ?? []),
    ...(payload.package ? [payload.package] : [])
  ];

  for (const item of packages) {
    const identifiers = [
      item.package_id,
      item.product_id,
      item.id,
      item.meta?.package_id,
      item.meta?.product_id,
      item.meta?.id,
      item.product?.package_id,
      item.product?.product_id,
      item.product?.id,
      item.package?.package_id,
      item.package?.product_id,
      item.package?.id,
      item.slug,
      item.meta?.slug,
      item.product?.slug,
      item.package?.slug
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    const packageId = identifiers.find((identifier) => packageWheelMap.has(identifier));
    const wheelNumber = packageId ? packageWheelMap.get(packageId) : null;

    if (packageId && wheelNumber) {
      return {
        packageId,
        packageName:
          item.name ??
          item.title ??
          item.meta?.name ??
          item.meta?.title ??
          item.product?.name ??
          item.product?.title ??
          item.package?.name ??
          item.package?.title ??
          null,
        wheelNumber
      };
    }
  }

  return null;
}

async function createUniqueKeyCode(orderId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = randomBytes(5).toString("hex").toUpperCase();
    const code = `ZENIX-${orderId.replace(/\D/g, "").slice(-6) || "CC"}-${suffix}`;
    const existing = await prisma.accessKey.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique access key.");
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyCentralCartSignature(rawBody, request)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let webhookPayload: CentralCartWebhookPayload | CentralCartOrderPayload;

  try {
    webhookPayload = JSON.parse(rawBody) as CentralCartWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const payload =
    "data" in webhookPayload && webhookPayload.data
      ? webhookPayload.data
      : (webhookPayload as CentralCartOrderPayload);
  const event = (webhookPayload.event ?? payload.event ?? "").toLowerCase();
  const status = payload.status?.toLowerCase();
  const hasApprovedEvent = approvedEvents.has(event);
  const hasApprovedStatus = status ? approvedStatuses.has(status) : false;

  if (!hasApprovedEvent && !hasApprovedStatus) {
    return NextResponse.json({ ok: true, ignored: "Order is not approved." });
  }

  const orderId = getOrderId(payload);
  const mappedPackage = getMappedPackage(payload);

  if (!orderId) {
    return NextResponse.json({ error: "Missing CentralCart order id." }, { status: 400 });
  }

  if (!mappedPackage) {
    return NextResponse.json({ ok: true, ignored: "No mapped package found." });
  }

  const eventId =
    request.headers.get("x-centralcart-event-id") ??
    ("id" in webhookPayload && webhookPayload.id ? String(webhookPayload.id) : null);
  const result = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.centralCartOrder.findUnique({
      where: { orderId },
      include: { accessKey: true }
    });

    if (existingOrder?.accessKey) {
      return {
        created: false,
        code: existingOrder.accessKey.code,
        wheelNumber: existingOrder.wheelNumber
      };
    }

    const code = await createUniqueKeyCode(orderId);
    const accessKey = await tx.accessKey.create({
      data: {
        code,
        label: `CentralCart pedido ${orderId}`,
        wheelNumber: mappedPackage.wheelNumber,
        singleUse: true,
        active: true
      }
    });

    await tx.centralCartOrder.upsert({
      where: { orderId },
      update: {
        eventId,
        packageId: mappedPackage.packageId,
        packageName: mappedPackage.packageName,
        buyerEmail: getBuyerEmail(payload),
        wheelNumber: mappedPackage.wheelNumber,
        accessKeyId: accessKey.id,
        payload: webhookPayload as Prisma.InputJsonValue
      },
      create: {
        orderId,
        eventId,
        packageId: mappedPackage.packageId,
        packageName: mappedPackage.packageName,
        buyerEmail: getBuyerEmail(payload),
        wheelNumber: mappedPackage.wheelNumber,
        accessKeyId: accessKey.id,
        payload: webhookPayload as Prisma.InputJsonValue
      }
    });

    return {
      created: true,
      code: accessKey.code,
      wheelNumber: accessKey.wheelNumber
    };
  });

  return NextResponse.json({ ok: true, ...result });
}
