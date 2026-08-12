import { NextResponse } from "next/server";
import os from "os";
import { withCors } from "@/lib/cors";

export const runtime = "nodejs";

function lanIPv4(): string[] {
  const nets = os.networkInterfaces();
  const out: string[] = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const e of entries) {
      if (e.family === "IPv4" && !e.internal) {
        out.push(e.address);
      }
    }
  }
  return out;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/** Info pairing per pagina QR / app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const hostHeader = request.headers.get("host") || "localhost:3005";
  const port =
    hostHeader.includes(":") ? hostHeader.split(":").pop() || "3005" : "3005";

  const ips = lanIPv4();
  const candidates = [
    ...ips.map((ip) => `http://${ip}:${port}`),
    `http://127.0.0.1:${port}`,
  ];

  // Preferisci IP LAN nel QR (non localhost: il telefono non lo vede)
  const preferred = ips[0]
    ? `http://${ips[0]}:${port}`
    : `http://127.0.0.1:${port}`;

  const pairPayload = {
    v: 1,
    baseUrl: preferred,
    name: "Studify",
  };

  return withCors(
    NextResponse.json({
      ok: true,
      preferred,
      candidates,
      port,
      pairPayload,
      /** Stringa da mettere nel QR */
      qr: `studify://pair?baseUrl=${encodeURIComponent(preferred)}`,
      tip:
        "Stesso Wi‑Fi del PC. Su Windows apri la porta nel firewall rete privata.",
    })
  );
}
