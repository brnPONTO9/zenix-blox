import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth";

export async function GET() {
  const admin = await readAdminSession();

  if (!admin) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.json({ admin });
}
