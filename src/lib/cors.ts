import { NextResponse } from "next/server";

/** CORS per client mobile (Expo) su LAN. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Studify-Token, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export function withCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function corsJson(data: unknown, init?: ResponseInit): NextResponse {
  return withCors(NextResponse.json(data, init));
}

export function corsOptions(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
