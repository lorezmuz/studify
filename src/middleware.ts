import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Studify-Token, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

/** Abilita CORS su tutte le /api/* (client mobile Expo in LAN). */
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(CORS)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
