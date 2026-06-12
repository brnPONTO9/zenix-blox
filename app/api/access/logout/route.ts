import { NextResponse } from "next/server";
import { ROULETTE_ACCESS_COOKIE } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ROULETTE_ACCESS_COOKIE);
  return response;
}
