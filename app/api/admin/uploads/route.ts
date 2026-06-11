import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maxFileSize = 4 * 1024 * 1024;

function detectImageType(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(request: Request) {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const image = formData?.get("image");

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  }

  if (image.size > maxFileSize) {
    return NextResponse.json(
      { error: "A imagem deve ter no máximo 4 MB." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const mimeType = detectImageType(buffer);

  if (!mimeType) {
    return NextResponse.json(
      { error: "Use uma imagem PNG, JPG, WebP ou GIF." },
      { status: 415 }
    );
  }

  const uploadedImage = await prisma.uploadedImage.create({
    data: {
      data: buffer,
      mimeType
    },
    select: { id: true }
  });

  return NextResponse.json({
    url: `/api/images/${uploadedImage.id}`
  });
}
