import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth-cookies";

// Ponto de chegada depois do redirect final do backend (Google/OAuth
// customizado -> better-auth -> nosso /auth/oauth/complete -> aqui). Troca o
// código de handoff pelo JWT de sempre, exatamente como /api/auth/login faz
// pro e-mail/senha, e seta os mesmos cookies httpOnly.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const backendResponse = await fetch(`${process.env.BACKEND_API_URL}/auth/oauth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  if (!backendResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const data = await backendResponse.json();
  const response = NextResponse.redirect(new URL("/tickets", request.url));
  setAuthCookies(response, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  return response;
}
