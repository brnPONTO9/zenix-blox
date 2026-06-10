import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const csv = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export async function GET() {
  const admin = await readAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const spins = await prisma.spinHistory.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      participant: true,
      accessKey: true,
      item: true
    }
  });

  const rows = [
    ["ID", "Nick", "Key", "Item", "Raridade", "Data", "IP"].map(csv).join(","),
    ...spins.map((spin) =>
      [
        spin.id,
        spin.participant.nick,
        spin.accessKey.code,
        spin.item.name,
        spin.item.rarity,
        spin.createdAt.toISOString(),
        spin.ipAddress
      ]
        .map(csv)
        .join(",")
    )
  ];

  return new NextResponse(`\uFEFF${rows.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zenixblox-giros.csv"'
    }
  });
}
