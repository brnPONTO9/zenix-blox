import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_COOKIE, ROULETTE_ACCESS_COOKIE } from "@/lib/constants";

const secret = () => {
  const value = process.env.AUTH_SECRET;
  return value ? new TextEncoder().encode(value) : undefined;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const key = secret();

  if (pathname.startsWith("/roleta")) {
    const token = request.cookies.get(ROULETTE_ACCESS_COOKIE)?.value;

    if (!token || !key) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, key);
      if (
        payload.role !== "roulette" ||
        typeof payload.wheelNumber !== "number" ||
        payload.wheelNumber < 1 ||
        payload.wheelNumber > 4
      ) {
        throw new Error("Invalid role");
      }

      const wheelPath = `/roleta/${payload.wheelNumber}`;
      if (pathname !== wheelPath) {
        return NextResponse.redirect(new URL(wheelPath, request.url));
      }

      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;

    if (!token || !key) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, key);
      if (payload.role !== "admin") {
        throw new Error("Invalid role");
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/roleta/:path*"]
};
